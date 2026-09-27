import { strict as assert } from 'node:assert';
import { spawn } from 'node:child_process';
import process from 'node:process';
import { setTimeout as sleep } from 'node:timers/promises';

const port = '4173';
const origin = `http://127.0.0.1:${port}`;

const server = spawn(process.execPath, ['server.js'], {
  cwd: new URL('..', import.meta.url),
  env: {
    ...process.env,
    NODE_ENV: 'production',
    PORT: port,
    DATABASE_URL:
      process.env.DATABASE_URL ??
      'postgresql://postgres:postgres@127.0.0.1:5432/akiksystems',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let stderr = '';
server.stderr.on('data', (chunk) => {
  stderr += chunk.toString();
});

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
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

  for (const locale of ['en', 'fr']) {
    const response = await globalThis.fetch(`${origin}/${locale}`);
    const html = await response.text();

    assert.equal(response.status, 200, `/${locale} must return HTTP 200.`);
    assert.match(html, new RegExp(`<html lang="${locale}"`));
    assert.match(html, /class="aks-home-portal"/);
    assert.match(html, /<h1[^>]*>AkikSystems<\/h1>/);
    assert.match(html, /class="aks-home-orbit"/);
    assert.match(
      html,
      /class="aks-experience-footer aks-section-separator-before"/,
    );
  }

  process.stdout.write('Baseline SSR smoke passed.\n');
} finally {
  server.kill('SIGTERM');
  await Promise.race([
    new Promise((resolve) => server.once('exit', resolve)),
    sleep(2_000),
  ]);
}
