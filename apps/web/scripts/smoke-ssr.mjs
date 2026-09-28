import { strict as assert } from 'node:assert';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer } from 'node:net';
import process from 'node:process';
import { setTimeout as sleep } from 'node:timers/promises';

async function reservePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(undefined));
  });
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const port = address.port;
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve(undefined))),
  );
  return String(port);
}

const port = await reservePort();
const origin = `http://127.0.0.1:${port}`;

const server = spawn(process.execPath, ['server.js'], {
  cwd: new URL('..', import.meta.url),
  env: {
    ...process.env,
    NODE_ENV: 'production',
    PORT: port,
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let stderr = '';
let exited = false;
server.stderr.on('data', (chunk) => {
  stderr += chunk.toString();
});
server.once('exit', () => {
  exited = true;
});

async function waitForServer() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (exited) {
      throw new Error(`SSR server exited before readiness. stderr=${stderr}`);
    }

    try {
      const response = await globalThis.fetch(`${origin}/en`);
      if (response.ok) return;
    } catch {
      // Server is still starting.
    }

    await sleep(125);
  }

  throw new Error(`SSR server did not become ready. stderr=${stderr}`);
}

try {
  await waitForServer();

  const root = await globalThis.fetch(origin, { redirect: 'manual' });
  assert.equal(root.status, 302);
  assert.equal(root.headers.get('location'), '/en');

  const health = await globalThis.fetch(`${origin}/health`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { status: 'ok', service: 'web' });

  for (const locale of ['en', 'fr']) {
    const response = await globalThis.fetch(`${origin}/${locale}`);
    const html = await response.text();
    const csp = response.headers.get('content-security-policy');

    assert.equal(response.status, 200, `/${locale} must return HTTP 200.`);
    assert.equal(response.headers.get('x-powered-by'), null);
    assert.ok(csp, `/${locale} must emit a Content-Security-Policy header.`);
    assert.equal(csp.includes("'unsafe-inline'"), false);
    const nonceMatch = csp.match(/'nonce-([^']+)'/);
    const nonce = nonceMatch?.[1];
    assert.ok(nonce, `/${locale} CSP must include a per-response nonce.`);
    const inlineScripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)]
      .map((match) => ({ attributes: match[1] ?? '', body: match[2] ?? '' }))
      .filter(({ attributes }) => !/\bsrc=/.test(attributes));
    assert.ok(inlineScripts.length > 0, `/${locale} must render framework inline scripts.`);
    for (const { attributes, body } of inlineScripts) {
      if (attributes.includes('nonce="' + nonce + '"')) continue;
      const hash = createHash('sha256').update(body, 'utf8').digest('base64');
      assert.ok(
        csp.includes("'sha256-" + hash + "'"),
        `/${locale} unnonced inline scripts must be explicitly hashed by CSP.`,
      );
    }
    assert.match(html, new RegExp(`<html lang="${locale}"`));
    assert.match(html, /class="aks-home-portal"/);
    assert.match(
      html,
      /<h1[^>]*>[\s\S]*?AkikSystems[\s\S]*?<\/h1>/,
      'Home h1 must expose the AkikSystems text regardless of internal animation markup.',
    );
    assert.match(html, /class="aks-home-orbit"/);
    assert.match(html, /class="aks-experience-footer aks-section-separator-before"/);
  }

  process.stdout.write('Baseline SSR smoke passed without database infrastructure.\n');
} finally {
  if (!server.killed) server.kill('SIGTERM');
  await Promise.race([new Promise((resolve) => server.once('exit', resolve)), sleep(2_000)]);
}
