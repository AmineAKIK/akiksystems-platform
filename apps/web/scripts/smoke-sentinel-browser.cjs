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
  { path: '/en/profile', lang: 'en', heading: 'Profile', context: 'Profile', alternate: '/fr/profil' },
  { path: '/en/systems', lang: 'en', heading: 'Systems', context: 'Systems', alternate: '/fr/systems' },
  { path: '/en/writings', lang: 'en', heading: 'Writings', context: 'Writings', alternate: '/fr/ecrits' },
  { path: '/en/learning', lang: 'en', heading: 'Learning', context: 'Learning', alternate: '/fr/apprentissage' },
  { path: '/en/work-with-us', lang: 'en', heading: 'Work with us', context: 'Work with us', alternate: '/fr/travailler-ensemble' },
  { path: '/fr/profil', lang: 'fr', heading: 'Profil', context: 'Profil', alternate: '/en/profile' },
  { path: '/fr/systems', lang: 'fr', heading: 'Systèmes', context: 'Systèmes', alternate: '/en/systems' },
  { path: '/fr/ecrits', lang: 'fr', heading: 'Écrits', context: 'Écrits', alternate: '/en/writings' },
  { path: '/fr/apprentissage', lang: 'fr', heading: 'Apprentissage', context: 'Apprentissage', alternate: '/en/learning' },
  {
    path: '/fr/travailler-ensemble',
    lang: 'fr',
    heading: 'Travailler ensemble',
    context: 'Travailler ensemble',
    alternate: '/en/work-with-us',
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
      (await page.locator(`[aria-label="${contextLabel}"]`).innerText()).trim(),
      destination.context,
      `${destination.path} must expose its first-level shell context.`,
    );
    const alternateLocale = destination.lang === 'en' ? 'fr' : 'en';
    const languageLink = page.locator(
      `.aks-experience-meta a[hreflang="${alternateLocale}"]`,
    );
    await languageLink.waitFor();
    assert.equal(
      await languageLink.getAttribute('href'),
      destination.alternate,
      `${destination.path} must switch to its equivalent localized destination.`,
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

async function assertFirstLevelDeepLinkAutonomy(browser, { mobile = false } = {}) {
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
    const directContext = await browser.newContext({
      viewport: mobile ? { width: 320, height: 720 } : { width: 1280, height: 800 },
    });

    try {
      const page = await directContext.newPage();
      const response = await page.goto(`${origin}${destination.path}`);

      assert.equal(response?.status(), 200, `${destination.path} direct load must return HTTP 200.`);
      assert.equal(
        await page.locator('html').getAttribute('lang'),
        destination.lang,
        `${destination.path} must reconstruct its locale from the URL.`,
      );
      await page
        .getByRole('heading', { level: 1, name: destination.heading, exact: true })
        .waitFor();
      await page.locator('.aks-brand-signature').waitFor();

      const contextLabel =
        destination.lang === 'fr' ? 'Contexte actuel' : 'Current context';
      assert.equal(
        (await page.locator(`[aria-label="${contextLabel}"]`).innerText()).trim(),
        destination.context,
        `${destination.path} must reconstruct its local context on direct load.`,
      );

      const alternateLocale = destination.lang === 'en' ? 'fr' : 'en';
      assert.equal(
        await page
          .locator(`.aks-experience-meta a[hreflang="${alternateLocale}"]`)
          .getAttribute('href'),
        destination.alternate,
        `${destination.path} must reconstruct its equivalent-language target on direct load.`,
      );

      if (mobile) {
        const menu = page.locator('.aks-experience-mobile-menu');
        await page.locator('.aks-experience-mobile-menu-trigger').click();
        assert.notEqual(await menu.getAttribute('open'), null);
        assert.equal(
          await page
            .locator('.aks-experience-mobile-nav a[aria-current="page"]')
            .getAttribute('href'),
          destination.path,
          `${destination.path} must reconstruct active mobile navigation on direct load.`,
        );
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
          ),
          true,
          `${destination.path} direct load must not overflow at 320px.`,
        );
      } else {
        assert.equal(
          await page
            .locator('.aks-experience-nav a[aria-current="page"]')
            .getAttribute('href'),
          destination.path,
          `${destination.path} must reconstruct active desktop navigation on direct load.`,
        );

        for (const href of expectedNavigation[destination.lang]) {
          await page.locator(`.aks-experience-nav a[href="${href}"]`).waitFor();
        }
      }
    } finally {
      await directContext.close();
    }
  }
}

async function assertPublishedSystemDeepLinkAutonomy(browser, { mobile = false } = {}) {
  for (const target of [
    {
      path: '/en/systems/sentinel',
      lang: 'en',
      contextLabel: 'Current context',
      destinationHref: '/en/systems',
      alternateHref: '/fr/systems/sentinel',
    },
    {
      path: '/fr/systems/sentinel',
      lang: 'fr',
      contextLabel: 'Contexte actuel',
      destinationHref: '/fr/systems',
      alternateHref: '/en/systems/sentinel',
    },
  ]) {
    const directContext = await browser.newContext({
      viewport: mobile ? { width: 320, height: 720 } : { width: 1280, height: 800 },
    });

    try {
      const page = await directContext.newPage();
      const response = await page.goto(`${origin}${target.path}`);

      assert.equal(response?.status(), 200, `${target.path} direct load must return HTTP 200.`);
      assert.equal(await page.locator('html').getAttribute('lang'), target.lang);
      await page.getByRole('heading', { level: 1, name: 'Sentinel', exact: true }).waitFor();
      await page.locator('.aks-brand-signature').waitFor();

      const localContext = page.locator(`[aria-label="${target.contextLabel}"]`);
      assert.equal(
        await localContext.locator('a').getAttribute('href'),
        target.destinationHref,
        `${target.path} must reconstruct its parent destination on direct load.`,
      );
      assert.equal(
        (await localContext.locator('[aria-current="page"]').innerText()).trim(),
        'Sentinel',
        `${target.path} must reconstruct its current item on direct load.`,
      );

      const alternateLocale = target.lang === 'en' ? 'fr' : 'en';
      assert.equal(
        await page
          .locator(`.aks-experience-meta a[hreflang="${alternateLocale}"]`)
          .getAttribute('href'),
        target.alternateHref,
        `${target.path} must reconstruct its translated deep-link target.`,
      );

      if (mobile) {
        await page.locator('.aks-experience-mobile-menu-trigger').click();
        assert.equal(
          await page
            .locator('.aks-experience-mobile-nav a[aria-current="page"]')
            .getAttribute('href'),
          target.destinationHref,
          `${target.path} must reconstruct Systems as active on mobile direct load.`,
        );
      } else {
        assert.equal(
          await page
            .locator('.aks-experience-nav a[aria-current="page"]')
            .getAttribute('href'),
          target.destinationHref,
          `${target.path} must reconstruct Systems as active on desktop direct load.`,
        );
      }
    } finally {
      await directContext.close();
    }
  }
}

async function assertIntentPrefetching(browser) {
  const desktop = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });

  try {
    const page = await desktop.newPage();
    await page.goto(`${origin}/en`);
    await page.getByRole('heading', { level: 1, name: 'AkikSystems', exact: true }).waitFor();

    const homeNav = page.getByRole('navigation', { name: 'Explore AkikSystems' });
    const profileDoor = homeNav.locator('a[href="/en/profile"]');
    await profileDoor.waitFor();

    assert.equal(
      await homeNav.locator('link[rel="prefetch"]').count(),
      0,
      'Home must not eagerly prefetch destination routes before user intent.',
    );

    await profileDoor.hover();
    await homeNav.locator('link[rel="prefetch"]').first().waitFor({ state: 'attached' });

    assert.ok(
      (await homeNav.locator('link[rel="prefetch"]').count()) > 0,
      'Hovering an intended Home destination must trigger route prefetching.',
    );

    await page.mouse.move(0, 0);
    await page.waitForTimeout(150);
    assert.equal(
      await homeNav.locator('link[rel="prefetch"]').count(),
      0,
      'Leaving an intended destination must remove transient prefetch descriptors.',
    );

    await page.goto(`${origin}/en/systems`);
    const shellNav = page.locator('.aks-experience-nav');
    const writingsLink = shellNav.locator('a[href="/en/writings"]');
    await writingsLink.waitFor();

    assert.equal(
      await shellNav.locator('link[rel="prefetch"]').count(),
      0,
      'Global shell navigation must not prefetch every destination on render.',
    );

    await writingsLink.focus();
    await shellNav.locator('link[rel="prefetch"]').first().waitFor({ state: 'attached' });
    assert.ok(
      (await shellNav.locator('link[rel="prefetch"]').count()) > 0,
      'Keyboard focus must count as navigation intent for shell prefetching.',
    );
  } finally {
    await desktop.close();
  }

  const mobile = await browser.newContext({
    viewport: { width: 320, height: 720 },
    hasTouch: true,
    isMobile: true,
  });

  try {
    const page = await mobile.newPage();
    await page.goto(`${origin}/en`);
    const homeNav = page.getByRole('navigation', { name: 'Explore AkikSystems' });
    const systemsDoor = homeNav.locator('a[href="/en/systems"]');
    await systemsDoor.waitFor();

    assert.equal(
      await homeNav.locator('link[rel="prefetch"]').count(),
      0,
      'Mobile Home must remain idle until touch intent.',
    );

    await systemsDoor.dispatchEvent('touchstart');
    await homeNav.locator('link[rel="prefetch"]').first().waitFor({ state: 'attached' });

    assert.ok(
      (await homeNav.locator('link[rel="prefetch"]').count()) > 0,
      'Touch intent must trigger prefetching without requiring navigation.',
    );
    assert.equal(
      new URL(page.url()).pathname,
      '/en',
      'Touch prefetch qualification must not navigate away from Home.',
    );
  } finally {
    await mobile.close();
  }
}

async function assertHomePortal(page, locale, { mobile = false } = {}) {
  const config =
    locale === 'fr'
      ? {
          path: '/fr',
          heading: 'AkikSystems',
          label: 'Explorer AkikSystems',
          hrefs: [
            '/fr/profil',
            '/fr/systems',
            '/fr/ecrits',
            '/fr/apprentissage',
            '/fr/travailler-ensemble',
          ],
        }
      : {
          path: '/en',
          heading: 'AkikSystems',
          label: 'Explore AkikSystems',
          hrefs: [
            '/en/profile',
            '/en/systems',
            '/en/writings',
            '/en/learning',
            '/en/work-with-us',
          ],
        };

  const response = await page.goto(`${origin}${config.path}`);
  assert.equal(response?.status(), 200, `${config.path} must return HTTP 200.`);
  await page.getByRole('heading', { level: 1, name: config.heading, exact: true }).waitFor();

  const portal = page.locator('.aks-home-portal');
  await portal.waitFor();
  const navigation = page.getByRole('navigation', { name: config.label });
  await navigation.waitFor();

  for (const href of config.hrefs) {
    const door = navigation.locator(`a[href="${href}"]`);
    await door.waitFor();
    assert.equal(await door.isVisible(), true, `${href} must be visible on Home.`);
  }

  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
    true,
    `${config.path} must not overflow horizontally.`,
  );

  if (!mobile) {
    const layout = await page.evaluate(() => {
      const portalElement = document.querySelector('.aks-home-portal');
      const orbitElement = document.querySelector('.aks-home-orbit');
      if (!(portalElement instanceof HTMLElement) || !(orbitElement instanceof HTMLElement)) {
        return null;
      }
      return {
        portalColumns: getComputedStyle(portalElement).gridTemplateColumns,
        orbitColumns: getComputedStyle(orbitElement).gridTemplateColumns,
      };
    });
    assert.ok(layout, 'Desktop Home layout must be measurable.');
    assert.match(
      layout.portalColumns,
      /\S+\s+\S+/,
      'Desktop Home must use a two-column identity/orbit composition.',
    );
    assert.match(
      layout.orbitColumns,
      /\S+\s+\S+\s+\S+/,
      'Desktop Home orbital layer must expose three spatial columns.',
    );
  } else {
    const mobileLayout = await page.evaluate((hrefs) => {
      const orbitElement = document.querySelector('.aks-home-orbit');
      const coreElement = document.querySelector('.aks-home-core');
      if (!(orbitElement instanceof HTMLElement) || !(coreElement instanceof HTMLElement)) {
        return null;
      }

      const doors = hrefs
        .map((href) => orbitElement.querySelector(`a[href="${href}"]`))
        .filter((element) => element instanceof HTMLElement);

      return {
        columns: getComputedStyle(orbitElement).gridTemplateColumns,
        gap: getComputedStyle(orbitElement).gap,
        coreRadius: getComputedStyle(coreElement).borderRadius,
        doorHeights: doors.map((door) => door.getBoundingClientRect().height),
        doorTops: doors.map((door) => door.getBoundingClientRect().top),
      };
    }, config.hrefs);

    assert.ok(mobileLayout, 'Mobile Home layout must be measurable.');
    assert.equal(
      mobileLayout.columns.split(' ').filter(Boolean).length,
      1,
      'Mobile Home must use one dedicated reading column.',
    );
    assert.equal(mobileLayout.gap, '0px', 'Mobile Home must use a continuous route rather than an orbital gap.');
    assert.notEqual(
      mobileLayout.coreRadius,
      '50%',
      'Mobile Home core must not retain the desktop orbital circle.',
    );
    assert.ok(
      mobileLayout.doorHeights.every((height) => height >= 44),
      'Every mobile Home door must provide at least a 44px touch target.',
    );
    assert.ok(
      mobileLayout.doorTops.every((top, index, values) => index === 0 || top > values[index - 1]),
      'Mobile Home doors must form a clear top-to-bottom sequence.',
    );
  }
}

async function assertStaticHomeOrientation(browser, locale, viewport) {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport,
  });

  try {
    const page = await context.newPage();
    const path = locale === 'fr' ? '/fr' : '/en';
    const navigationLabel = locale === 'fr' ? 'Explorer AkikSystems' : 'Explore AkikSystems';
    const hrefs =
      locale === 'fr'
        ? [
            '/fr/profil',
            '/fr/systems',
            '/fr/ecrits',
            '/fr/apprentissage',
            '/fr/travailler-ensemble',
          ]
        : [
            '/en/profile',
            '/en/systems',
            '/en/writings',
            '/en/learning',
            '/en/work-with-us',
          ];

    const response = await page.goto(`${origin}${path}`);
    assert.equal(response?.status(), 200, `${path} must SSR without JavaScript.`);
    await page.getByRole('heading', { level: 1, name: 'AkikSystems', exact: true }).waitFor();

    const navigation = page.getByRole('navigation', { name: navigationLabel });
    await navigation.waitFor();

    for (const href of hrefs) {
      const door = navigation.locator(`a[href="${href}"]`);
      await door.waitFor();
      assert.equal(await door.isVisible(), true, `${href} must be visible before enhancement.`);
    }

    const staticState = await page.evaluate((expectedHrefs) => {
      const intro = document.querySelector('.aks-home-intro');
      const doors = expectedHrefs
        .map((href) => document.querySelector(`.aks-home-door[href="${href}"]`))
        .filter((element) => element instanceof HTMLElement);

      if (!(intro instanceof HTMLElement) || doors.length !== expectedHrefs.length) {
        return null;
      }

      const introStyles = getComputedStyle(intro);
      return {
        intro: {
          opacity: introStyles.opacity,
          visibility: introStyles.visibility,
          animationName: introStyles.animationName,
          transform: introStyles.transform,
        },
        doors: doors.map((door) => {
          const styles = getComputedStyle(door);
          return {
            opacity: styles.opacity,
            visibility: styles.visibility,
            animationName: styles.animationName,
            transform: styles.transform,
          };
        }),
        overflowFree:
          document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      };
    }, hrefs);

    assert.ok(staticState, 'Static Home orientation must be measurable.');
    assert.deepEqual(
      staticState.intro,
      {
        opacity: '1',
        visibility: 'visible',
        animationName: 'none',
        transform: 'none',
      },
      'Home identity must be fully legible in the initial static state.',
    );
    assert.ok(
      staticState.doors.every(
        (door) =>
          door.opacity === '1' &&
          door.visibility === 'visible' &&
          door.animationName === 'none' &&
          door.transform === 'none',
      ),
      'All Home destinations must be fully legible before motion or JavaScript loads.',
    );
    assert.equal(staticState.overflowFree, true, 'Static Home must not overflow the viewport.');
  } finally {
    await context.close();
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
    await assertHomePortal(page, 'en');
    await assertHomePortal(page, 'fr');

    await assertIntentPrefetching(browser);

    await assertFirstLevelDeepLinkAutonomy(browser);
    await assertFirstLevelDeepLinkAutonomy(browser, { mobile: true });

    await assertStaticHomeOrientation(browser, 'en', { width: 1280, height: 800 });
    await assertStaticHomeOrientation(browser, 'fr', { width: 1280, height: 800 });
    await assertStaticHomeOrientation(browser, 'en', { width: 320, height: 720 });
    await assertStaticHomeOrientation(browser, 'fr', { width: 320, height: 720 });

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

    await page.goto(`${origin}/en/systems/sentinel`);
    await page.getByRole('heading', { level: 1, name: 'Sentinel' }).waitFor();
    const unavailableLanguage = page.locator('.aks-language-unavailable');
    await unavailableLanguage.waitFor();
    assert.equal(
      (await unavailableLanguage.innerText()).trim(),
      'French unavailable',
      'A missing published translation must be explicit.',
    );
    assert.equal(
      await page.locator('.aks-experience-meta a[hreflang="fr"]').count(),
      0,
      'A missing translation must not fall back to a misleading French link.',
    );

    await page.goto(`${origin}${page.systemPath}`);
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
    assert.equal(
      await page.locator('.aks-experience-meta a[hreflang="fr"]').getAttribute('href'),
      '/fr/systems/sentinel',
      'A published deep translation must switch to its equivalent localized System route.',
    );

    await assertPublishedSystemDeepLinkAutonomy(browser);
    await assertPublishedSystemDeepLinkAutonomy(browser, { mobile: true });

    const reducedDesktop = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      reducedMotion: 'reduce',
    });
    try {
      const reducedPage = await reducedDesktop.newPage();
      await reducedPage.goto(`${origin}/en/systems/sentinel`);
      await reducedPage.getByRole('heading', { level: 1, name: 'Sentinel' }).waitFor();
      assert.equal(
        await reducedPage.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches),
        true,
        'Desktop qualification must exercise the reduced-motion preference.',
      );
      const reducedTokens = await reducedPage.evaluate(() => {
        const styles = getComputedStyle(document.documentElement);
        return {
          duration: styles.getPropertyValue('--aks-transition-route-duration').trim(),
          distance: styles.getPropertyValue('--aks-transition-route-distance').trim(),
        };
      });
      assert.deepEqual(reducedTokens, { duration: '1ms', distance: '0rem' });
      await reducedPage.locator('.aks-experience-nav a[href="/en/profile"]').click();
      await reducedPage.waitForURL(`${origin}/en/profile`);
      await reducedPage
        .getByRole('heading', { level: 1, name: 'Profile', exact: true })
        .waitFor();
      assert.equal(
        await reducedPage.locator('.aks-experience-nav a[aria-current="page"]').getAttribute('href'),
        '/en/profile',
        'Reduced motion must preserve complete desktop navigation semantics.',
      );
    } finally {
      await reducedDesktop.close();
    }

    assert.equal(
      await page.evaluate(() => typeof document.startViewTransition),
      'function',
      'Chromium must expose View Transitions for the enhanced route path.',
    );
    const transitionProbe = await page.evaluate(async () => {
      const link = document.querySelector('.aks-experience-nav a[href="/en/profile"]');
      if (!(link instanceof HTMLAnchorElement)) {
        return { supported: false, started: 0 };
      }
      let started = 0;
      const original = document.startViewTransition.bind(document);
      document.startViewTransition = (callback) => {
        started += 1;
        return original(callback);
      };
      link.click();
      await new Promise((resolve) => setTimeout(resolve, 50));
      return { supported: true, started };
    });
    assert.equal(transitionProbe.supported, true);
    assert.ok(
      transitionProbe.started >= 1,
      'Client-side shell navigation must opt into a View Transition when supported.',
    );
    await page.waitForURL(`${origin}/en/profile`);
    await page
      .getByRole('heading', { level: 1, name: 'Profile', exact: true })
      .waitFor();
    assert.equal(
      await page.locator('.aks-experience-nav a[aria-current="page"]').getAttribute('href'),
      '/en/profile',
      'The destination must remain usable after the enhanced transition completes.',
    );
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
    const localContext = page.locator('[aria-label="Current context"]');
    assert.equal(
      await localContext.locator('a').getAttribute('href'),
      '/en/systems',
      'Deep System local context must link back to its first-level destination.',
    );
    assert.equal(
      await localContext.locator('[aria-current="page"]').innerText(),
      'Sentinel',
      'Deep System local context must identify the current item.',
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
      await assertHomePortal(mobilePage, 'en', { mobile: true });
      await assertHomePortal(mobilePage, 'fr', { mobile: true });
      await mobilePage.goto(`${origin}/en/systems/sentinel`);
      assert.equal(
        await mobilePage.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches),
        true,
        'Mobile qualification must exercise the reduced-motion preference.',
      );
      const reducedMotionTokens = await mobilePage.evaluate(() => {
        const styles = getComputedStyle(document.documentElement);
        return {
          duration: styles.getPropertyValue('--aks-transition-route-duration').trim(),
          distance: styles.getPropertyValue('--aks-transition-route-distance').trim(),
        };
      });
      assert.deepEqual(
        reducedMotionTokens,
        { duration: '1ms', distance: '0rem' },
        'Reduced motion must remove perceptible route travel while preserving navigation.',
      );
      const mobileMenu = mobilePage.locator('.aks-experience-mobile-menu');
      await mobilePage.locator('.aks-experience-mobile-menu-trigger').click();
      assert.equal(
        await mobilePage
          .locator('.aks-experience-mobile-nav a[aria-current="page"]')
          .getAttribute('href'),
        '/en/systems',
        'Mobile deep System routes must preserve Systems as the active destination.',
      );
      const mobileLocalContext = mobilePage.locator('[aria-label="Current context"]');
      assert.equal(await mobileLocalContext.locator('a').getAttribute('href'), '/en/systems');
      assert.equal(
        await mobileLocalContext.locator('[aria-current="page"]').innerText(),
        'Sentinel',
      );
      await mobilePage.locator('.aks-experience-mobile-menu-trigger').click();
      assert.equal(await mobileMenu.getAttribute('open'), null);

      // Reload before the keyboard-only skip-link scenario so focus starts from
      // the document rather than remaining on the disclosure trigger.
      await mobilePage.goto(`${origin}/en/systems/sentinel`);
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
      await noJsPage.locator('.aks-brand-signature').waitFor();
      for (const href of [
        '/en/profile',
        '/en/systems',
        '/en/writings',
        '/en/learning',
        '/en/work-with-us',
      ]) {
        await noJsPage.locator(`.aks-experience-nav a[href="${href}"]`).waitFor();
      }
      assert.equal(
        await noJsPage.locator('.aks-experience-nav a[aria-current="page"]').getAttribute('href'),
        '/en/systems',
        'Deep-link orientation must identify Systems before client enhancement.',
      );
      assert.equal(
        await noJsPage.locator('[aria-label="Current context"] [aria-current="page"]').innerText(),
        'Sentinel',
        'Deep-link local context must identify the current System without JavaScript.',
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
