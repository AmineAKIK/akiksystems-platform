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
  assert.match(englishHtml, /href="\/en\/about"/);
  assert.match(englishHtml, /<script/);

  const french = await globalThis.fetch(`${origin}/fr`);
  const frenchHtml = await french.text();
  assert.equal(french.status, 200);
  assert.match(frenchHtml, /<html lang="fr"/);
  assert.match(frenchHtml, /Squelette fonctionnel de la plateforme/);
  assert.match(frenchHtml, /href="\/fr\/about"/);

  const frenchAbout = await globalThis.fetch(`${origin}/fr/about`);
  const frenchAboutHtml = await frenchAbout.text();
  assert.equal(frenchAbout.status, 200);
  assert.match(frenchAboutHtml, /La navigation côté client est active/);

  const unlocalized = await globalThis.fetch(`${origin}/about`);
  assert.equal(unlocalized.status, 404);

  const unsupportedLocale = await globalThis.fetch(`${origin}/de`);
  const unsupportedLocaleHtml = await unsupportedLocale.text();
  assert.equal(unsupportedLocale.status, 404);
  assert.match(unsupportedLocaleHtml, /<html lang="und"/);
  assert.match(unsupportedLocaleHtml, /Page not found/);

  const missingFrench = await globalThis.fetch(`${origin}/fr/route-inconnue`);
  const missingFrenchHtml = await missingFrench.text();
  assert.equal(missingFrench.status, 404);
  assert.match(missingFrenchHtml, /Page introuvable/);

  process.stdout.write(
    'SSR locale smoke passed: /->/en, en/fr=200, unsupported/unlocalized routes=404.\n',
  );
} finally {
  server.kill('SIGTERM');
}
