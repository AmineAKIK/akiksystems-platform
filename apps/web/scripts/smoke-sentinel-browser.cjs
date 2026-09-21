/* eslint-disable @typescript-eslint/no-require-imports, no-undef */
const { strict: assert } = require('node:assert');
const { execFileSync, spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { setTimeout: sleep } = require('node:timers/promises');
const { chromium } = require('playwright');
const axe = require('axe-core');

const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;

if (!adminEmail || !adminPassword) {
  throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required.');
}

const port = '4177';
const origin = `http://127.0.0.1:${port}`;
let stderr = '';

const server = spawn(process.execPath, ['server.js'], {
  cwd: path.join(process.cwd(), 'apps/web'),
  env: {
    ...process.env,
    NODE_ENV: 'test',
    PORT: port,
    BETTER_AUTH_URL: origin,
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

server.stderr.on('data', (chunk) => {
  stderr += chunk.toString();
});

async function waitForServer() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const response = await fetch(`${origin}/en`);
      if (response.ok) return;
    } catch {
      // Starting.
    }
    await sleep(100);
  }

  throw new Error(`Sentinel browser smoke server did not become ready. stderr=${stderr}`);
}

async function saveLocalization(page, locale, values) {
  const heading = locale === 'en' ? 'English' : 'Français';
  const button = locale === 'en' ? 'Save EN only' : 'Save FR only';
  const form = page.locator('form').filter({
    has: page.getByRole('heading', { name: heading, exact: true }),
  });

  await form.locator('input[name="slug"]').fill(values.slug);
  await form.locator('input[name="title"]').fill(values.title);
  await form.locator('textarea[name="summary"]').fill(values.summary);
  await form.getByRole('button', { name: button }).click();
  await page.getByText(locale === 'en' ? 'EN content updated independently.' : 'FR content updated independently.').waitFor();
}

async function savePresentation(page, locale, text) {
  await page.goto(`${origin}${page.systemPath}/presentation/${locale}`);
  await page.getByLabel('Block type').selectOption('paragraph');
  await page.getByRole('button', { name: 'Add block' }).click();
  await page.getByRole('textbox', { name: 'Paragraph' }).fill(text);
  await page.getByRole('button', { name: 'Save presentation' }).click();
  await page.getByText(`${locale.toUpperCase()} presentation saved.`).waitFor();
}

const globalDestinations = [
  { path: '/en/profile', lang: 'en', heading: 'Profile', context: 'Profile' },
  { path: '/en/systems', lang: 'en', heading: 'Systems', context: 'Systems' },
  { path: '/en/writings', lang: 'en', heading: 'Writings', context: 'Writings' },
  { path: '/en/learning', lang: 'en', heading: 'Learning', context: 'Learning' },
  { path: '/en/work-with-us', lang: 'en', heading: 'Work with us', context: 'Work with us' },
  { path: '/fr/profil', lang: 'fr', heading: 'Profil', context: 'Profil' },
  { path: '/fr/systems', lang: 'fr', heading: 'Systèmes', context: 'Systèmes' },
  { path: '/fr/ecrits', lang: 'fr', heading: 'Écrits', context: 'Écrits' },
  { path: '/fr/apprentissage', lang: 'fr', heading: 'Apprentissage', context: 'Apprentissage' },
  {
    path: '/fr/travailler-ensemble',
    lang: 'fr',
    heading: 'Travailler ensemble',
    context: 'Travailler ensemble',
  },
];

async function assertGlobalDestinations(page, { mobile = false } = {}) {
  const expectedNavigation = {
    en: [
      '/en/profile',
      '/en/systems',
      '/en/writings',
      '/en/learning',
      '/en/work-with-us',
    ],
    fr: [
      '/fr/profil',
      '/fr/systems',
      '/fr/ecrits',
      '/fr/apprentissage',
      '/fr/travailler-ensemble',
    ],
  };

  for (const destination of globalDestinations) {
    const response = await page.goto(`${origin}${destination.path}`);
    assert.equal(response?.status(), 200, `${destination.path} must return HTTP 200.`);
    assert.equal(await page.locator('html').getAttribute('lang'), destination.lang);
    await page
      .getByRole('heading', { level: 1, name: destination.heading, exact: true })
      .waitFor();
    await page.locator('.aks-brand-signature').waitFor();

    if (mobile) {
      const menu = page.locator('.aks-experience-mobile-menu');
      const trigger = page.locator('.aks-experience-mobile-menu-trigger');
      await trigger.waitFor();
      assert.equal(await menu.getAttribute('open'), null, 'Mobile menu should start collapsed.');
      await trigger.click();
      assert.notEqual(await menu.getAttribute('open'), null, 'Mobile menu should open on tap.');

      for (const href of expectedNavigation[destination.lang]) {
        const link = page.locator(`.aks-experience-mobile-nav a[href="${href}"]`);
        await link.waitFor();
        const box = await link.boundingBox();
        assert.ok(box && box.height >= 44, `${href} must expose a 44px mobile touch target.`);
      }
    } else {
      for (const href of expectedNavigation[destination.lang]) {
        await page.locator(`.aks-experience-nav a[href="${href}"]`).waitFor();
      }
    }

    const contextLabel =
      destination.lang === 'fr' ? 'Contexte actuel' : 'Current context';
    assert.equal(
      await page.locator(`[aria-label="${contextLabel}"]`).innerText(),
      destination.context,
      `${destination.path} must expose its first-level shell context.`,
    );

    if (mobile) {
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
        true,
        `${destination.path} must not overflow at 320px.`,
      );
    }
  }
}

async function assertAxe(page) {
  await page.addScriptTag({ content: axe.source });
  const result = await page.evaluate(async () => globalThis.axe.run(document));
  const material = result.violations.filter(
    (violation) => violation.impact === 'critical' || violation.impact === 'serious',
  );

  assert.deepEqual(
    material.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      nodes: violation.nodes.length,
    })),
    [],
    'Sentinel must have no serious or critical axe violations.',
  );
}

(async () => {
  await waitForServer();

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    await assertGlobalDestinations(page);

    await page.goto(`${origin}/admin/login`);
    await page.getByLabel('Email').fill(adminEmail);
    await page.getByLabel('Password').fill(adminPassword);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL(`${origin}/admin`);

    await page.getByRole('button', { name: 'Create Sentinel' }).click();
    await page.waitForURL(/\/admin\/systems\/[0-9a-f-]+$/i);
    page.systemPath = new URL(page.url()).pathname;

    await saveLocalization(page, 'en', {
      slug: 'sentinel',
      title: 'Sentinel',
      summary: 'Operational visibility built from industrial context and inspectable evidence.',
    });
    await saveLocalization(page, 'fr', {
      slug: 'sentinel',
      title: 'Sentinel',
      summary: 'Visibilité opérationnelle issue d’un contexte industriel et de preuves inspectables.',
    });

    await savePresentation(
      page,
      'en',
      'Sentinel turns operational signals into a calm, inspectable system.',
    );
    await savePresentation(
      page,
      'fr',
      'Sentinel transforme les signaux opérationnels en un système calme et inspectable.',
    );

    await page.goto(`${origin}${page.systemPath}`);
    await page.locator('textarea[name="links"]').fill(
      'live | https://sentinel.akiksystems.fr',
    );
    await page.getByRole('button', { name: 'Save links' }).click();
    await page.getByText('System links updated.').waitFor();

    await page.goto(`${origin}${page.systemPath}/preview/en`);
    assert.match(await page.locator('body').innerText(), /private preview/i);
    assert.equal(
      await page.locator('meta[name="robots"]').getAttribute('content'),
      'noindex, nofollow, noarchive, nosnippet',
    );

    const beforePublish = await context.request.get(`${origin}/en/systems/sentinel`);
    assert.equal(beforePublish.status(), 404);

    await page.goto(`${origin}${page.systemPath}`);
    await page.getByRole('button', { name: 'Publish EN' }).click();
    await page.getByRole('button', { name: 'Unpublish EN' }).waitFor();
    await page.getByRole('button', { name: 'Publish FR' }).click();
    await page.getByRole('button', { name: 'Unpublish FR' }).waitFor();

    const englishResponse = await context.request.get(`${origin}/en/systems/sentinel`);
    const englishHtml = await englishResponse.text();
    assert.equal(englishResponse.status(), 200);
    assert.match(englishHtml, /<h1[^>]*>Sentinel<\/h1>/);
    assert.match(englishHtml, /Operational visibility built from industrial context/);
    assert.match(englishHtml, /Sentinel turns operational signals/);
    assert.match(englishHtml, /https:\/\/sentinel\.akiksystems\.fr/);
    assert.match(englishHtml, /rel="canonical"/);
    assert.match(englishHtml, /hreflang="fr"/i);

    await page.goto(`${origin}/en/systems/sentinel`);
    await page.getByRole('heading', { level: 1, name: 'Sentinel' }).waitFor();
    for (const href of [
      '/en/profile',
      '/en/systems',
      '/en/writings',
      '/en/learning',
      '/en/work-with-us',
    ]) {
      await page.locator(`.aks-experience-nav a[href="${href}"]`).waitFor();
    }
    assert.equal(
      await page.locator('.aks-experience-nav a[aria-current="page"]').getAttribute('href'),
      '/en/systems',
      'A deep System route must keep Systems marked as the current global destination.',
    );
    assert.equal(await page.locator('html').getAttribute('lang'), 'en');
    assert.equal(
      await page.locator('a[href="https://sentinel.akiksystems.fr"]').getAttribute('href'),
      'https://sentinel.akiksystems.fr',
    );
    assert.equal(
      await page.locator('link[rel="canonical"]').getAttribute('href'),
      'https://akiksystems.com/en/systems/sentinel',
    );
    assert.equal(
      await page.locator('link[rel="alternate"][hreflang="fr"]').getAttribute('href'),
      'https://akiksystems.com/fr/systems/sentinel',
    );

    await page.goto(`${origin}${page.systemPath}`);
    await saveLocalization(page, 'fr', {
      slug: 'sentinel',
      title: 'Sentinel',
      summary: 'Visibilité opérationnelle, contexte industriel et preuves inspectables.',
    });
    const englishAfterFrenchEdit = await context.request.get(
      `${origin}/en/systems/sentinel`,
    );
    assert.match(
      await englishAfterFrenchEdit.text(),
      /Operational visibility built from industrial context/,
    );

    const mobile = await browser.newContext({
      viewport: { width: 320, height: 720 },
      reducedMotion: 'reduce',
    });
    try {
      const mobilePage = await mobile.newPage();
      await assertGlobalDestinations(mobilePage, { mobile: true });
      await mobilePage.goto(`${origin}/en/systems/sentinel`);
      const mobileMenu = mobilePage.locator('.aks-experience-mobile-menu');
      await mobilePage.locator('.aks-experience-mobile-menu-trigger').click();
      assert.equal(
        await mobilePage
          .locator('.aks-experience-mobile-nav a[aria-current="page"]')
          .getAttribute('href'),
        '/en/systems',
        'Mobile deep System routes must preserve Systems as the active destination.',
      );
      await mobilePage.locator('.aks-experience-mobile-menu-trigger').click();
      assert.equal(await mobileMenu.getAttribute('open'), null);
      await mobilePage.keyboard.press('Tab');
      assert.equal(
        await mobilePage.evaluate(() => document.activeElement?.classList.contains('aks-skip-link')),
        true,
      );
      await mobilePage.keyboard.press('Enter');
      assert.equal(
        await mobilePage.evaluate(() => document.activeElement?.id),
        'experience-outlet',
      );
      assert.equal(
        await mobilePage.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
        true,
        '320px layout must not require horizontal page scrolling.',
      );
      await assertAxe(mobilePage);
    } finally {
      await mobile.close();
    }

    const lighthouseBin = process.env.LIGHTHOUSE_BIN;
    assert.ok(lighthouseBin, 'LIGHTHOUSE_BIN is required for performance qualification.');
    const lighthouseOutput = '/tmp/akiksystems-l1-lighthouse.json';
    execFileSync(
      lighthouseBin,
      [
        `${origin}/en/systems/sentinel`,
        '--only-categories=performance',
        '--form-factor=mobile',
        '--throttling-method=simulate',
        '--chrome-flags=--headless --no-sandbox',
        '--output=json',
        `--output-path=${lighthouseOutput}`,
        '--quiet',
      ],
      {
        env: {
          ...process.env,
          CHROME_PATH: chromium.executablePath(),
        },
        stdio: 'pipe',
      },
    );
    const lighthouseReport = JSON.parse(fs.readFileSync(lighthouseOutput, 'utf8'));
    const performanceScore = lighthouseReport.categories?.performance?.score ?? 0;
    const lcp =
      lighthouseReport.audits?.['largest-contentful-paint']?.numericValue ?? Infinity;
    const cls =
      lighthouseReport.audits?.['cumulative-layout-shift']?.numericValue ?? Infinity;
    const tbt =
      lighthouseReport.audits?.['total-blocking-time']?.numericValue ?? Infinity;

    process.stdout.write(
      `Mobile Lighthouse observation: score=${performanceScore.toFixed(2)}, LCP=${Math.round(lcp)}ms, CLS=${cls.toFixed(3)}, TBT=${Math.round(tbt)}ms.\\n`,
    );
    assert.ok(lcp <= 4500, `Mobile simulated LCP exceeded the L1 CI regression budget of 4.5s: ${lcp}ms`);
    assert.ok(cls <= 0.1, `Mobile CLS regressed above 0.1: ${cls}`);
    assert.ok(tbt <= 600, `Mobile TBT regressed above 600ms: ${tbt}ms`);

    const noJs = await browser.newContext({ javaScriptEnabled: false });
    try {
      const noJsPage = await noJs.newPage();
      const response = await noJsPage.goto(`${origin}/en/systems/sentinel`);
      assert.equal(response?.status(), 200);
      await noJsPage.getByRole('heading', { level: 1, name: 'Sentinel' }).waitFor();
      assert.match(
        await noJsPage.locator('body').innerText(),
        /Sentinel turns operational signals/,
      );
    } finally {
      await noJs.close();
    }

    process.stdout.write(
      'Sentinel L1 browser qualification passed: global destination deep links and touch navigation on desktop/mobile, admin EN/FR editing, draft preview, independent publication, public SSR/deep links, SEO, keyboard access, 320px reflow, reduced motion, axe, mobile Lighthouse performance, and no-JS reading are verified.\\n',
    );
  } finally {
    await browser.close();
  }
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    server.kill('SIGTERM');
    await Promise.race([
      new Promise((resolve) => server.once('exit', resolve)),
      sleep(2_000),
    ]);
  });
