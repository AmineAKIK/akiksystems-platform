/* eslint-disable @typescript-eslint/no-require-imports, no-undef */
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { setTimeout: sleep } = require('node:timers/promises');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const port = '4180';
const origin = 'http://127.0.0.1:' + port;
const screenshotDirectory = path.resolve(__dirname, '../../../artifacts/systems');
fs.mkdirSync(screenshotDirectory, { recursive: true });
const server = spawn(process.execPath, ['server.js'], {
  cwd: path.resolve(__dirname, '..'),
  env: { ...process.env, NODE_ENV: 'production', PORT: port },
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
  await page.locator('.aks-systems-hero-media').waitFor();
  await page.locator('.aks-systems-page').evaluate((root) => {
    for (const image of root.querySelectorAll('img')) {
      image.loading = 'eager';
    }
  });
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll('.aks-systems-page img')].every(
        (image) => image.complete && image.naturalWidth > 0 && image.naturalHeight > 0,
      ),
    undefined,
    { timeout: 15_000 },
  );
  await page.screenshot({
    fullPage: true,
    path: path.join(screenshotDirectory, `systems-${viewport.width}.png`),
  });

  const measurement = await page.evaluate(() => {
    const naturalImages = [...document.querySelectorAll('.aks-systems-page img')].map(
      (element) => ({
        src: element.getAttribute('src') ?? '',
        width: element.naturalWidth,
        height: element.naturalHeight,
      }),
    );

    const touchTargets = [
      ...document.querySelectorAll('.aks-systems-button, .aks-systems-quick-link'),
    ].map((element) => {
      const box = element.getBoundingClientRect();
      return { width: box.width, height: box.height, label: element.textContent?.trim() ?? '' };
    });

    const hero = document.querySelector('.aks-systems-hero')?.getBoundingClientRect();
    const atlas = document.querySelector('.aks-systems-atlas-console')?.getBoundingClientRect();
    const feature = document
      .querySelector('.aks-systems-station--feature figure')
      ?.getBoundingClientRect();

    return {
      width: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      sectionOrder: [...document.querySelectorAll('[data-systems-section]')].map((element) =>
        element.getAttribute('data-systems-section'),
      ),
      naturalImages,
      touchTargets,
      heroHeight: hero?.height ?? 0,
      atlasWidth: atlas?.width ?? 0,
      featureWidth: feature?.width ?? 0,
      pageWidth: document.querySelector('.aks-systems-page')?.getBoundingClientRect().width ?? 0,
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
    assert.equal(
      measurement.naturalImages.length,
      7,
      'Systems must render the seven dossier media assets',
    );
    for (const image of measurement.naturalImages) {
      assert.ok(image.width > 0 && image.height > 0, image.src + ' must load');
    }
    assert.ok(
      measurement.heroHeight >= (viewport.width <= 480 ? 900 : viewport.width <= 768 ? 700 : 680),
    );
    assert.ok(measurement.atlasWidth > 0 && measurement.atlasWidth <= measurement.pageWidth + 1);
    assert.ok(
      measurement.featureWidth > 0 && measurement.featureWidth <= measurement.pageWidth + 1,
    );

    for (const target of measurement.touchTargets) {
      if (viewport.width <= 768) {
        assert.ok(
          target.height >= 36,
          viewport.width + 'px target ' + (target.label || 'unnamed') + ' must stay usable',
        );
      }
    }
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
    console.log(
      'Systems visual smoke passed at 390, 768, 1280 and 1440px with dossier media loaded.',
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
