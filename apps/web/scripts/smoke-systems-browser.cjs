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
  await page.evaluate(async () => {
    const images = [...document.querySelectorAll('.aks-systems-page img')];
    for (let y = 0; y < document.documentElement.scrollHeight; y += window.innerHeight) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 35));
    }
    await Promise.all(images.map((image) => image.decode().catch(() => undefined)));
    window.scrollTo(0, 0);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
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
    const rail = document.querySelector('.aks-systems-hero-rail')?.getBoundingClientRect();
    let smallestText = Infinity;
    for (const element of document.querySelectorAll('.aks-systems-page *')) {
      if (element.closest('svg')) continue;
      const hasText = [...element.childNodes].some(
        (node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== '',
      );
      const size = parseFloat(getComputedStyle(element).fontSize);
      if (hasText && size > 0) smallestText = Math.min(smallestText, size);
    }
    const sentinel = document.querySelector('.aks-systems-sentinel-map')?.getBoundingClientRect();
    const sentinelMounted =
      document.querySelector('.aks-systems-sentinel-map svg [role="tab"]') !== null;
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
      railBottom: rail?.bottom ?? Infinity,
      smallestText,
      sentinelWidth: sentinel?.width ?? 0,
      sentinelMounted,
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
      'sentinel',
      'operation',
      'manifesto',
      'workbench',
      'perspectives',
    ]);
    assert.equal(
      measurement.naturalImages.length,
      5,
      'Systems must render the five dossier media assets',
    );
    for (const image of measurement.naturalImages) {
      assert.ok(image.width > 0 && image.height > 0, image.src + ' must load');
    }
    // The hero fills the first screen within its bounds and its rail stays inside it.
    // Mirrors --r in systems.css: 1rem up to 1440px, then 0.35rem + 0.72vw, capped at 2rem.
    const unit = Math.min(Math.max(16, 5.6 + 0.0072 * viewport.width), 32);
    const firstScreen = Math.min(Math.max(viewport.height, 30 * unit), 62 * unit);
    assert.ok(
      Math.abs(measurement.heroHeight - firstScreen) <= 1,
      viewport.width + 'px hero measured ' + measurement.heroHeight + 'px, expected ' + firstScreen,
    );
    assert.ok(
      measurement.railBottom <= firstScreen + 1,
      viewport.width + 'px operation rail must stay within the first screen',
    );
    assert.ok(
      measurement.smallestText >= 11,
      viewport.width + 'px smallest Systems text is ' + measurement.smallestText + 'px',
    );
    assert.ok(
      measurement.sentinelWidth > 0 && measurement.sentinelWidth <= measurement.pageWidth + 1,
    );
    assert.ok(measurement.sentinelMounted, 'Sentinel map must mount its interactive SVG');
    assert.ok(
      measurement.featureWidth > 0 && measurement.featureWidth <= measurement.pageWidth + 1,
    );

    for (const target of measurement.touchTargets) {
      if (viewport.width <= 768) {
        assert.ok(
          target.height >= 44,
          viewport.width +
            'px target ' +
            (target.label || 'unnamed') +
            ' measured ' +
            target.height +
            'px; expected at least 44px',
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
      { width: 320, height: 568 },
      { width: 390, height: 844 },
      { width: 844, height: 390 },
      { width: 768, height: 1024 },
      { width: 1280, height: 720 },
      { width: 1440, height: 900 },
      { width: 2560, height: 1440 },
    ]) {
      await inspectViewport(browser, viewport);
    }
    console.log('Systems visual smoke passed from 320 to 2560px with dossier media loaded.');
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
