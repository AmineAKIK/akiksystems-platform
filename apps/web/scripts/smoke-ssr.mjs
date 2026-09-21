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
  assert.match(englishHtml, /class="aks-home-portal"/);
  assert.match(englishHtml, /<h1[^>]*>AkikSystems<\/h1>/);
  for (const href of [
    '/en/profile',
    '/en/systems',
    '/en/writings',
    '/en/learning',
    '/en/work-with-us',
  ]) {
    assert.match(englishHtml, new RegExp(`href="${href}"`));
  }

  const french = await globalThis.fetch(`${origin}/fr`);
  const frenchHtml = await french.text();
  assert.equal(french.status, 200);
  assert.match(frenchHtml, /<html lang="fr"/);
  assert.match(frenchHtml, /class="aks-home-portal"/);
  assert.match(frenchHtml, /<h1[^>]*>AkikSystems<\/h1>/);
  for (const href of [
    '/fr/profil',
    '/fr/systems',
    '/fr/ecrits',
    '/fr/apprentissage',
    '/fr/travailler-ensemble',
  ]) {
    assert.match(frenchHtml, new RegExp(`href="${href}"`));
  }

  const directRoutes = [
    { path: '/en/profile', lang: 'en', heading: 'Profile', activeHref: '/en/profile' },
    { path: '/en/systems', lang: 'en', heading: 'Systems', activeHref: '/en/systems' },
    { path: '/en/writings', lang: 'en', heading: 'Writings', activeHref: '/en/writings' },
    { path: '/en/learning', lang: 'en', heading: 'Learning', activeHref: '/en/learning' },
    { path: '/en/work-with-us', lang: 'en', heading: 'Work with us', activeHref: '/en/work-with-us' },
    { path: '/fr/profil', lang: 'fr', heading: 'Profil', activeHref: '/fr/profil' },
    { path: '/fr/systems', lang: 'fr', heading: 'Systèmes', activeHref: '/fr/systems' },
    { path: '/fr/ecrits', lang: 'fr', heading: 'Écrits', activeHref: '/fr/ecrits' },
    { path: '/fr/apprentissage', lang: 'fr', heading: 'Apprentissage', activeHref: '/fr/apprentissage' },
    { path: '/fr/travailler-ensemble', lang: 'fr', heading: 'Travailler ensemble', activeHref: '/fr/travailler-ensemble' },
  ];

  for (const route of directRoutes) {
    const response = await globalThis.fetch(`${origin}${route.path}`);
    const html = await response.text();

    assert.equal(response.status, 200, `${route.path} direct SSR load must return HTTP 200.`);
    assert.match(html, new RegExp(`<html lang="${route.lang}"`));
    assert.match(html, /class="aks-brand-signature"/);
    assert.match(html, new RegExp(`<h1[^>]*>${route.heading.replace(/[.*+?^$()|[\\]{}]/g, '\\  const anonymousAdmin = await globalThis.fetch(`${origin}/admin`, {
    redirect: 'manual',
  });')}<\\/h1>`));
    assert.match(
      html,
      new RegExp(`aria-current="page"[^>]*href="${route.activeHref}"`),
      `${route.path} must reconstruct its active destination during SSR.`,
    );
  }

  const anonymousAdmin = await globalThis.fetch(`${origin}/admin`, {
    redirect: 'manual',
  });
  assert.equal(anonymousAdmin.status, 302);
  assert.equal(anonymousAdmin.headers.get('location'), '/admin/login');

  process.stdout.write('SSR locale/auth smoke passed.\n');
} finally {
  server.kill('SIGTERM');
}
