import { strict as assert } from 'node:assert';
import { Buffer } from 'node:buffer';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const databaseUrl = process.env.DATABASE_URL;
const betterAuthSecret = process.env.BETTER_AUTH_SECRET;
const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;

if (!databaseUrl || !betterAuthSecret || !adminEmail || !adminPassword) {
  throw new Error(
    'DATABASE_URL, BETTER_AUTH_SECRET, ADMIN_EMAIL and ADMIN_PASSWORD are required.',
  );
}

const port = 4180;
const internalOrigin = `http://127.0.0.1:${port}`;
const publicHost = 'forwarded.example.invalid';
const publicOrigin = `https://${publicHost}`;
let stderr = '';

const server = spawn(process.execPath, ['server.js'], {
  cwd: new URL('..', import.meta.url),
  env: {
    ...process.env,
    NODE_ENV: 'production',
    PORT: String(port),
    BETTER_AUTH_URL: publicOrigin,
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

server.stderr.on('data', (chunk) => {
  stderr += chunk.toString();
});

async function waitForServer() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await globalThis.fetch(`${internalOrigin}/en`);
      if (response.ok) return;
    } catch {
      // Server still starting.
    }

    await sleep(100);
  }

  throw new Error(
    `Forwarded-action smoke server did not become ready. stderr=${stderr}`,
  );
}

/**
 * @param {string} origin
 */
function postAdminData(origin) {
  const body = '_intent=save-commercial-localization%3Aen';

  return new Promise((resolve, reject) => {
    const request = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: '/admin.data',
        method: 'POST',
        headers: {
          host: publicHost,
          origin,
          'x-forwarded-proto': 'https',
          'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
          'content-length': Buffer.byteLength(body),
        },
      },
      (response) => {
        let responseBody = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          responseBody += chunk;
        });
        response.on('end', () => {
          resolve({
            status: response.statusCode ?? 0,
            headers: response.headers,
            body: responseBody,
          });
        });
      },
    );

    request.once('error', reject);
    request.end(body);
  });
}

try {
  await waitForServer();

  const forwardedSameOrigin = await postAdminData(publicOrigin);
  assert.equal(
    forwardedSameOrigin.status,
    202,
    `A same-origin HTTPS action forwarded to the internal HTTP server must reach the route action instead of React Router's CSRF rejection. body=${forwardedSameOrigin.body}`,
  );
  assert.ok(
    forwardedSameOrigin.body.includes('"redirect","/admin/login"'),
    'React Router must encode the admin login redirect in the single-fetch response.',
  );
  assert.ok(
    forwardedSameOrigin.body.includes('"status",302'),
    'The single-fetch redirect envelope must preserve the route redirect status.',
  );

  const attacker = await postAdminData('https://attacker.example.invalid');
  assert.equal(
    attacker.status,
    403,
    'The outer admin CSRF boundary must continue rejecting untrusted origins.',
  );

  process.stdout.write(
    'Forwarded-action smoke passed: trusted public HTTPS host reaches React Router actions through the proxy boundary, while an untrusted origin remains rejected.\n',
  );
} finally {
  server.kill('SIGTERM');
  await Promise.race([
    new Promise((resolve) => server.once('exit', resolve)),
    sleep(2_000),
  ]);
}
