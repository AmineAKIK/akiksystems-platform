/* eslint-disable @typescript-eslint/no-require-imports, no-undef */
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { setTimeout: sleep } = require('node:timers/promises');
const path = require('node:path');
const { chromium } = require('playwright');

const port = '4180';
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
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (exited) throw new Error('Systems smoke server exited. stderr=' + stderr);
    try {
      const response = await globalThis.fetch(origin + '/fr/systems');
      if (response.ok) return;
    } catch {
      // Server is still starting.
    }
    await sleep(125);
  }
  throw new Error('Systems smoke server did not become ready. stderr=' + stderr);
}

async function inspectViewport(browser, viewport) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const response = await page.goto(origin + '/fr/systems');

  assert.equal(
    response?.status(),
    200,
    viewport.width + 'x' + viewport.height + ' route must return 200',
  );
  await page.locator('.aks-systems-page').waitFor();

  const measurement = await page.evaluate(() => {
    const interactive = [
      ...document.querySelectorAll('.aks-systems-button, .aks-systems-quick-link'),
    ].map((element) => {
      const box = element.getBoundingClientRect();
      return {
        width: box.width,
        height: box.height,
        label: element.textContent?.trim() ?? '',
      };
    });

    return {
      width: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      sectionOrder: [...document.querySelectorAll('[data-systems-section]')].map((element) =>
        element.getAttribute('data-systems-section'),
      ),
      interactive,
      atlasWidth: document.querySelector('.aks-systems-atlas-screen')?.getBoundingClientRect()
        .width,
      bodyWidth: document.querySelector('.aks-systems-page')?.getBoundingClientRect().width,
    };
  });

  try {
    assert.ok(
      measurement.scrollWidth <= measurement.width + 1,
      viewport.width + 'px Systems must not overflow horizontally',
    );
    assert.deepEqual(measurement.sectionOrder, [
      'hero',
      'atlas',
      'operation',
      'manifesto',
      'workbench',
      'perspectives',
    ]);
    assert.ok(
      measurement.atlasWidth > 0 &&
        measurement.bodyWidth > 0 &&
        measurement.atlasWidth <= measurement.bodyWidth + 1,
    );

    for (const target of measurement.interactive) {
      assert.ok(
        target.height >= 44,
        viewport.width +
          'px touch target ' +
          (target.label || 'unnamed') +
          ' must be at least 44px high',
      );
    }
  } finally {
    await context.close();
  }
}

async function inspectReducedMotion(browser) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await page.goto(origin + '/fr/systems');
  await page.locator('.aks-systems-page').waitFor();

  try {
    const duration = await page
      .locator('.aks-systems-orbit')
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
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 768, height: 1024 },
      { width: 1280, height: 720 },
      { width: 1440, height: 900 },
    ]) {
      await inspectViewport(browser, viewport);
    }

    await inspectReducedMotion(browser);
    console.log(
      'Systems browser smoke passed at 390, 768, 1280 and 1440px with touch targets and reduced motion qualified.',
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
