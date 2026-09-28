/* eslint-disable @typescript-eslint/no-require-imports, no-undef */
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { setTimeout: sleep } = require('node:timers/promises');
const path = require('node:path');
const { chromium } = require('playwright');

const port = '4179';
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
let exited = false;
server.stderr.on('data', (chunk) => {
  stderr += chunk.toString();
});
server.once('exit', () => {
  exited = true;
});

async function waitForServer() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (exited) throw new Error('Systems smoke server exited before readiness. stderr=' + stderr);
    try {
      const response = await globalThis.fetch(origin + '/fr/systems');
      if (response.ok) return;
    } catch {
      // Production server is still starting.
    }
    await sleep(125);
  }
  throw new Error('Systems smoke server did not become ready. stderr=' + stderr);
}

async function inspectViewport(browser, viewport) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const editorialRequests = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.pathname.startsWith('/api/') || url.pathname.includes('/admin/')) {
      editorialRequests.push(url.pathname);
    }
  });

  const response = await page.goto(origin + '/fr/systems', { waitUntil: 'networkidle' });
  assert.equal(response?.status(), 200, viewport.width + 'px Systems must return 200');
  await page.locator('.aks-systems-page').waitFor();
  await page.waitForTimeout(460);

  const result = await page.evaluate(() => {
    const visible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        rect.width > 0 &&
        rect.height > 0
      );
    };

    const interactive = [
      ...document.querySelectorAll('.aks-systems-page a, .aks-systems-page summary'),
    ]
      .filter((element) => element instanceof HTMLElement && visible(element))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return { width: rect.width, height: rect.height, text: element.textContent?.trim() ?? '' };
      });

    const sectionOrder = ['atlas', 'operations', 'workbench', 'perspectives'].map((id) => {
      const element = document.getElementById(id);
      return element?.getBoundingClientRect().top ?? Number.NaN;
    });

    return {
      width: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      mainCount: document.querySelectorAll('main').length,
      h1Count: document.querySelectorAll('h1').length,
      h2Count: document.querySelectorAll('h2').length,
      imageCount: document.querySelectorAll('.aks-systems-page img').length,
      placeholderMediaCount: document.querySelectorAll('[data-placeholder-media="true"]').length,
      placeholderContentCount: document.querySelectorAll('[data-placeholder-content="true"]')
        .length,
      eagerCount: document.querySelectorAll('img[loading="eager"]').length,
      lazyCount: document.querySelectorAll('img[loading="lazy"]').length,
      missingDimensions: [...document.querySelectorAll('.aks-systems-page img')].filter(
        (image) => !image.hasAttribute('width') || !image.hasAttribute('height'),
      ).length,
      interactive,
      sectionOrder,
      duplicateCirrus: document.querySelectorAll('h3').length
        ? [...document.querySelectorAll('h3')].filter((heading) => heading.textContent === 'CIRRUS')
            .length
        : 0,
    };
  });

  assert.ok(
    result.scrollWidth <= result.width + 1,
    viewport.width + 'px must not overflow horizontally',
  );
  assert.equal(result.mainCount, 1, 'Systems must expose exactly one main landmark');
  assert.equal(result.h1Count, 1, 'Systems must expose exactly one h1');
  assert.ok(result.h2Count >= 5, 'Systems must preserve section heading hierarchy');
  assert.equal(result.imageCount, 6, 'Systems must render the six handoff media assets');
  assert.equal(
    result.placeholderMediaCount,
    6,
    'Generated handoff media must stay marked as placeholders',
  );
  assert.ok(result.placeholderContentCount >= 10, 'Provisional business content must stay marked');
  assert.equal(result.eagerCount, 1, 'Only the hero may load eagerly');
  assert.equal(result.lazyCount, 5, 'Non-hero media must lazy-load');
  assert.equal(result.missingDimensions, 0, 'Every Systems image needs intrinsic dimensions');
  assert.equal(result.duplicateCirrus, 1, 'Responsive layout must not duplicate station DOM');
  assert.deepEqual(
    result.sectionOrder,
    [...result.sectionOrder].sort((a, b) => a - b),
  );
  assert.deepEqual(editorialRequests, [], 'Systems overview must not fetch editorial APIs');

  if (viewport.width <= 768) {
    const tooSmall = result.interactive.filter((item) => item.height < 43.5 || item.width < 43.5);
    assert.deepEqual(
      tooSmall,
      [],
      viewport.width + 'px interactive targets must be at least 44×44px',
    );
  }

  await page.locator('.aks-systems-brand').focus();
  const focus = await page.locator('.aks-systems-brand').evaluate((element) => {
    const style = getComputedStyle(element);
    return { offset: style.outlineOffset, width: style.outlineWidth };
  });
  assert.equal(focus.width, '3px', 'Systems focus ring must be 3px');
  assert.equal(focus.offset, '3px', 'Systems focus ring offset must be 3px');

  await context.close();
}

async function assertReducedMotion(browser) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await page.goto(origin + '/fr/systems');
  await page.locator('.aks-systems-page').waitFor();

  const state = await page
    .locator('[data-systems-reveal]')
    .first()
    .evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        opacity: style.opacity,
        transform: style.transform,
        transitionDuration: style.transitionDuration,
      };
    });

  assert.equal(state.opacity, '1');
  assert.ok(state.transform === 'none' || state.transform === 'matrix(1, 0, 0, 1, 0, 0)');
  assert.ok(state.transitionDuration === '0.001s' || state.transitionDuration === '0s');
  await context.close();
}

(async () => {
  await waitForServer();
  const browser = await chromium.launch({ headless: true });

  try {
    for (const viewport of [
      { width: 1440, height: 1000 },
      { width: 1280, height: 800 },
      { width: 768, height: 1024 },
      { width: 390, height: 844 },
    ]) {
      await inspectViewport(browser, viewport);
    }

    await assertReducedMotion(browser);
    console.log(
      'Systems browser smoke passed: 1440/1280/768/390 responsive geometry, touch targets, focus, media policy, code-only requests and reduced motion are qualified.',
    );
  } finally {
    await browser.close();
    server.kill('SIGTERM');
    await Promise.race([new Promise((resolve) => server.once('exit', resolve)), sleep(2000)]);
  }
})().catch((error) => {
  console.error(error);
  server.kill('SIGTERM');
  process.exitCode = 1;
});
