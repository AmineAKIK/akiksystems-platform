/* eslint-disable @typescript-eslint/no-require-imports, no-undef */
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { setTimeout: sleep } = require('node:timers/promises');
const path = require('node:path');
const { chromium } = require('playwright');

const port = '4178';
const origin = 'http://127.0.0.1:' + port;

const server = spawn(process.execPath, ['server.js'], {
  cwd: path.resolve(__dirname, '..'),
  env: {
    ...process.env,
    NODE_ENV: 'production',
    PORT: port,
    BETTER_AUTH_URL: origin,
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let stderr = '';
server.stderr.on('data', (chunk) => {
  stderr += chunk.toString();
});

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await globalThis.fetch(origin + '/fr');
      if (response.ok) return;
    } catch {}
    await sleep(125);
  }
  throw new Error('Responsive smoke server did not become ready. stderr=' + stderr);
}

async function measure(page) {
  return page.evaluate(() => {
    const rect = (selector) => {
      const element = document.querySelector(selector);
      if (!(element instanceof HTMLElement || element instanceof SVGElement)) return null;
      const box = element.getBoundingClientRect();
      return { top: box.top, left: box.left, right: box.right, bottom: box.bottom, width: box.width, height: box.height };
    };
    const doors = [...document.querySelectorAll('.aks-home-door')];
    return {
      viewportWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      home: rect('.aks-home'),
      meta: rect('.aks-home-meta'),
      brand: rect('.aks-home-brand-mark'),
      wordmark: rect('.aks-home-wordmark'),
      scale: rect('.aks-home-scale'),
      preview: rect('.aks-home-active-description'),
      previewState: document.querySelector('.aks-home-active-description')?.getAttribute('data-state'),
      footer: rect(".aks-experience-footer[data-home='true']"),
      footerSeparator: getComputedStyle(document.querySelector(".aks-experience-footer[data-home='true']"), '::before').display,
      doorOrder: doors.map((door) => door.dataset.destination),
      doors: Object.fromEntries(doors.map((door) => [door.dataset.destination, rect('.aks-home-door[data-destination="' + door.dataset.destination + '"]')])),
      legalCount: document.querySelectorAll(".aks-experience-footer[data-home='true'] nav a").length,
      background: getComputedStyle(document.querySelector('.aks-experience-frame[data-home="true"]')).backgroundImage,
    };
  });
}

function inside(rect, width, label) {
  assert.ok(rect, label + ' must exist');
  assert.ok(rect.left >= -1, label + ' must stay inside left edge');
  assert.ok(rect.right <= width + 1, label + ' must stay inside right edge');
}

async function assertReferenceViewport(browser, viewport, name, portraitLayout) {
  const context = await browser.newContext({
    viewport,
    hasTouch: viewport.width < 768 || (viewport.width === 768 && viewport.height > viewport.width),
    isMobile: viewport.width < 768,
  });
  try {
    const page = await context.newPage();
    const response = await page.goto(origin + '/fr');
    assert.equal(response?.status(), 200, name + ' must return 200');
    await page.locator('.aks-home').waitFor();

    const m = await measure(page);
    assert.equal(m.scrollWidth <= m.viewportWidth, true, name + ' must not overflow horizontally');
    assert.deepEqual(m.doorOrder, ['work-with-us', 'profile', 'systems', 'writings', 'learning']);
    assert.equal(m.legalCount, 3);
    assert.equal(m.footerSeparator, 'none');
    assert.match(m.background, /^radial-gradient\(/);

    inside(m.meta, m.viewportWidth, name + ' metadata');
    inside(m.brand, m.viewportWidth, name + ' emblem');
    inside(m.wordmark, m.viewportWidth, name + ' wordmark');
    for (const [id, box] of Object.entries(m.doors)) inside(box, m.viewportWidth, name + ' ' + id);

    assert.ok(Math.abs((m.brand.left + m.brand.width / 2) - viewport.width / 2) <= 2, name + ' emblem must be centered');
    assert.ok(Math.abs((m.wordmark.left + m.wordmark.width / 2) - viewport.width / 2) <= 2, name + ' wordmark must be centered');

    if (portraitLayout) {
      assert.ok(m.doors.profile.top > m.brand.bottom, name + ' Profile must sit below identity');
      assert.ok(m.doors.systems.top > m.brand.bottom, name + ' Systems must sit below identity');
      assert.ok(m.doors.writings.top > m.doors.profile.top, name + ' Writings must form second row');
      assert.ok(m.doors.learning.top > m.doors.systems.top, name + ' Learning must form second row');
    } else {
      assert.ok(m.doors.profile.left < m.brand.left, name + ' Profile must sit left of identity');
      assert.ok(m.doors.systems.left > m.brand.right, name + ' Systems must sit right of identity');
    }

    if (viewport.width >= 768) {
      await page.locator('.aks-home-door[data-destination="work-with-us"]').hover();
      await page.waitForTimeout(240);
      const active = await measure(page);
      assert.equal(active.previewState, 'active', name + ' hover must reveal the description');
      assert.ok(Math.abs(active.brand.top - m.brand.top) <= 1, name + ' hover must not move the emblem');
      assert.ok(Math.abs(active.wordmark.top - m.wordmark.top) <= 1, name + ' hover must not move the wordmark');
    }
  } finally {
    await context.close();
  }
}

async function assertTouchSelection(browser) {
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    hasTouch: true,
    isMobile: true,
  });
  try {
    const page = await context.newPage();
    await page.goto(origin + '/fr');
    const perspective = page.locator('.aks-home-door[data-destination="work-with-us"]');
    await perspective.tap();
    assert.equal(new URL(page.url()).pathname, '/fr', 'first tap must not navigate');
    assert.equal(await perspective.evaluate((el) => el.classList.contains('is-active')), true);
    assert.equal(await page.locator('.aks-home-active-description').getAttribute('data-state'), 'active');
    await perspective.tap();
    await page.waitForURL('**/fr/travailler-ensemble');
  } finally {
    await context.close();
  }
}

async function assertKeyboardOrder(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1024 } });
  try {
    const page = await context.newPage();
    await page.goto(origin + '/fr');
    const order = await page.evaluate(() =>
      [...document.querySelectorAll('a[data-home-preview-target="primary"], .aks-experience-footer[data-home="true"] nav a')]
        .map((element) => element.textContent?.trim()),
    );
    assert.deepEqual(order, [
      'Perspectives',
      'Profil',
      'Systèmes',
      'Écrits',
      'Apprentissage',
      'Confidentialité',
      'Mentions légales',
      'Cookies',
    ]);
  } finally {
    await context.close();
  }
}

async function assertReducedMotion(browser) {
  const context = await browser.newContext({
    viewport: { width: 430, height: 932 },
    reducedMotion: 'reduce',
  });
  try {
    const page = await context.newPage();
    await page.goto(origin + '/fr');
    const duration = await page
      .locator('.aks-home-door')
      .first()
      .evaluate((element) => getComputedStyle(element).animationDuration);
    assert.ok(duration === '0.001s' || duration === '0s');
  } finally {
    await context.close();
  }
}

(async () => {
  await waitForServer();
  const browser = await chromium.launch({ headless: true });
  try {
    await assertReferenceViewport(browser, { width: 1440, height: 1024 }, 'desktop 1440', false);
    await assertReferenceViewport(browser, { width: 1024, height: 768 }, 'tablet landscape 1024', false);
    await assertReferenceViewport(browser, { width: 768, height: 1024 }, 'tablet portrait 768', true);
    await assertReferenceViewport(browser, { width: 430, height: 932 }, 'mobile large 430', true);
    await assertReferenceViewport(browser, { width: 375, height: 812 }, 'mobile compact 375', true);
    await assertTouchSelection(browser);
    await assertKeyboardOrder(browser);
    await assertReducedMotion(browser);
    console.log('Responsive browser smoke passed: Home handoff viewports, interaction order, touch selection and reduced motion are qualified.');
  } finally {
    await browser.close();
    server.kill('SIGTERM');
    await Promise.race([
      new Promise((resolve) => server.once('exit', resolve)),
      sleep(2000),
    ]);
  }
})().catch((error) => {
  console.error(error);
  server.kill('SIGTERM');
  process.exitCode = 1;
});
