import { strict as assert } from 'node:assert';
import { spawn } from 'node:child_process';
import process from 'node:process';
import { setTimeout as sleep } from 'node:timers/promises';
import pg from 'pg';

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;
const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;
const betterAuthSecret = process.env.BETTER_AUTH_SECRET;

if (!databaseUrl || !adminEmail || !adminPassword || !betterAuthSecret) {
  throw new Error(
    'DATABASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD and BETTER_AUTH_SECRET are required for auth smoke.',
  );
}

const port = '4176';
const origin = `http://127.0.0.1:${port}`;
let stderr = '';

const server = spawn(process.execPath, ['server.js'], {
  cwd: new URL('..', import.meta.url),
  env: {
    ...process.env,
    NODE_ENV: 'production',
    PORT: port,
    BETTER_AUTH_URL: origin,
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

server.stderr.on('data', (chunk) => {
  stderr += chunk.toString();
});

async function waitForServer() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await globalThis.fetch(`${origin}/en`);
      if (response.ok) return;
    } catch {
      // Server still starting.
    }

    await sleep(100);
  }

  throw new Error(`Auth smoke server did not become ready. stderr=${stderr}`);
}

/**
 * @param {string} path
 * @param {Record<string, unknown>} body
 * @param {string | undefined} [cookie]
 */
async function postJson(path, body, cookie) {
  /** @type {Record<string, string>} */
  const headers = {
    'content-type': 'application/json',
    origin,
  };

  if (cookie) {
    headers.cookie = cookie;
  }

  return globalThis.fetch(`${origin}${path}`, {
    method: 'POST',
    redirect: 'manual',
    headers,
    body: JSON.stringify(body),
  });
}

try {
  await waitForServer();

  const loginPage = await globalThis.fetch(`${origin}/admin/login`, {
    redirect: 'manual',
  });
  const loginHtml = await loginPage.text();
  assert.equal(loginPage.status, 200);
  assert.match(loginHtml, /aks-admin-login-shell/);
  assert.match(loginHtml, /aks-admin-login-card/);
  assert.match(loginHtml, /Administrator sign in/);
  assert.match(loginHtml, /Private administration/);

  const anonymous = await globalThis.fetch(`${origin}/admin`, {
    redirect: 'manual',
  });
  assert.equal(anonymous.status, 302);
  assert.equal(anonymous.headers.get('location'), '/admin/login');
  assert.match(anonymous.headers.get('cache-control') ?? '', /private/);
  assert.match(anonymous.headers.get('cache-control') ?? '', /no-store/);
  assert.match(anonymous.headers.get('x-robots-tag') ?? '', /noindex/);
  assert.equal(anonymous.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(anonymous.headers.get('x-frame-options'), 'DENY');
  assert.ok(anonymous.headers.get('content-security-policy'));

  const rejectedAdminMutation = await globalThis.fetch(`${origin}/admin`, {
    method: 'POST',
    redirect: 'manual',
  });
  assert.equal(rejectedAdminMutation.status, 403);

  const rejectedAdminDataMutation = await globalThis.fetch(`${origin}/admin.data`, {
    method: 'POST',
    redirect: 'manual',
  });
  assert.equal(
    rejectedAdminDataMutation.status,
    403,
    'React Router admin data mutations must share the same CSRF boundary as /admin.',
  );

  const signup = await postJson('/api/auth/sign-up/email', {
    email: 'attacker@example.invalid',
    password: 'this-password-is-long-enough',
    name: 'Attacker',
  });
  assert.ok(signup.status >= 400, `public signup unexpectedly returned ${signup.status}`);

  const signIn = await postJson('/api/auth/sign-in/email', {
    email: adminEmail,
    password: adminPassword,
  });
  assert.equal(signIn.status, 200);

  const setCookie = signIn.headers.get('set-cookie') ?? '';
  assert.match(setCookie, /session_token/i);
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /Secure/i);
  assert.match(setCookie, /SameSite=Lax/i);

  const cookie = setCookie.split(';', 1)[0];
  assert.ok(cookie);

  const privateAdmin = await globalThis.fetch(`${origin}/admin`, {
    headers: { cookie },
    redirect: 'manual',
  });
  const privateHtml = await privateAdmin.text();
  assert.equal(privateAdmin.status, 200);
  assert.match(privateHtml, /AkikSystems administration/);
  assert.match(privateHtml, /href="\/admin\/systems"/);
  assert.doesNotMatch(
    privateHtml,
    /Mark featured|Remove featured|Open System workspace/,
    'System controls must live on the dedicated /admin/systems page.',
  );

  const privateSystems = await globalThis.fetch(`${origin}/admin/systems`, {
    headers: { cookie },
    redirect: 'manual',
  });
  const privateSystemsHtml = await privateSystems.text();
  assert.equal(privateSystems.status, 200);
  assert.match(privateSystemsHtml, /Systems administration/);
  assert.match(
    privateSystemsHtml,
    /Create Sentinel|Open System workspace/,
    'The dedicated Systems page must expose either its empty-state bootstrap or existing System workspaces.',
  );

  const twoFactor = await postJson(
    '/api/auth/two-factor/enable',
    {
      password: adminPassword,
      method: 'totp',
      issuer: 'AkikSystems',
    },
    cookie,
  );
  const twoFactorBody = /** @type {{
    method: string;
    totpURI: string;
    backupCodes: string[];
  }} */ (await twoFactor.json());
  assert.equal(twoFactor.status, 200);
  assert.equal(twoFactorBody.method, 'totp');
  assert.match(twoFactorBody.totpURI, /^otpauth:\/\/totp\//);
  assert.ok(Array.isArray(twoFactorBody.backupCodes));
  assert.ok(twoFactorBody.backupCodes.length > 0);

  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const users = await pool.query('select count(*)::int as count from "user"');
    assert.equal(users.rows[0]?.count, 1);
  } finally {
    await pool.end();
  }

  assert.equal(
    stderr.includes('Database schema mismatch'),
    false,
    `Runtime auth schema validation emitted a mismatch warning: ${stderr}`,
  );

  process.stdout.write(
    'Auth smoke passed: signup blocked, admin cache/robots/security headers enforced, cross-origin-less admin mutation rejected, secure session works, single admin enforced, TOTP available, no runtime schema mismatch warning.\n',
  );
} finally {
  server.kill('SIGTERM');
  await Promise.race([
    new Promise((resolve) => server.once('exit', resolve)),
    sleep(2_000),
  ]);
}
