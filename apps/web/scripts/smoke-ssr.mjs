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
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await globalThis.fetch(origin);
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

  const home = await globalThis.fetch(origin);
  const homeHtml = await home.text();
  assert.equal(home.status, 200);
  assert.match(homeHtml, /Platform walking skeleton/);
  assert.match(homeHtml, /href="\/about"/);
  assert.match(homeHtml, /<script/);

  const about = await globalThis.fetch(`${origin}/about`);
  const aboutHtml = await about.text();
  assert.equal(about.status, 200);
  assert.match(aboutHtml, /Client navigation is enabled/);

  const missing = await globalThis.fetch(`${origin}/this-route-does-not-exist`);
  const missingHtml = await missing.text();
  assert.equal(missing.status, 404);
  assert.match(missingHtml, /Page not found/);

  process.stdout.write('SSR smoke test passed: home=200, about=200, missing=404.\n');
} finally {
  server.kill('SIGTERM');
}
