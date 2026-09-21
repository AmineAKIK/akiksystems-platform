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
    BETTER_AUTH_SECRET:
      process.env.BETTER_AUTH_SECRET ??
      'aks-013-ssr-smoke-secret-0123456789abcdef0123456789abcdef',
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? origin,
    ADMIN_EMAIL: process.env.ADMIN_EMAIL ?? 'admin@example.invalid',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
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

  throw new Error('SSR server did not become ready.');
}

try {
  await waitForServer();

  const root = await globalThis.fetch(origin, { redirect: 'manual' });
  assert.equal(root.status, 302);
  assert.equal(root.headers.get('location'), '/en');

  const english = await globalThis.fetch(`${origin}/en`);
  const englishHtml = await english.text();
  assert.equal(english.status, 200);
  assert.match(englishHtml, /<html lang="en"/);
  assert.match(englishHtml, /Platform walking skeleton/);

  const french = await globalThis.fetch(`${origin}/fr`);
  const frenchHtml = await french.text();
  assert.equal(french.status, 200);
  assert.match(frenchHtml, /<html lang="fr"/);
  assert.match(frenchHtml, /Squelette fonctionnel de la plateforme/);

  const anonymousAdmin = await globalThis.fetch(`${origin}/admin`, {
    redirect: 'manual',
  });
  assert.equal(anonymousAdmin.status, 302);
  assert.equal(anonymousAdmin.headers.get('location'), '/admin/login');

  process.stdout.write('SSR locale/auth smoke passed.\n');
} finally {
  server.kill('SIGTERM');
}
