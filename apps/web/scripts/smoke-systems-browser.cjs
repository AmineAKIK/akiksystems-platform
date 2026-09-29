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

async function inspectViewport(browser, viewport, locale) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const response = await page.goto(origin + '/' + locale + '/systems');

  assert.equal(
    response?.status(),
    200,
    locale + ' ' + viewport.width + 'x' + viewport.height + ' route must return 200',
  );
  await page.locator('.aks-systems-page').waitFor();
  await page.locator('.aks-systems-hero-art').waitFor();
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
    path: path.join(screenshotDirectory, `systems-${locale}-${viewport.width}.png`),
  });

  const measurement = await page.evaluate(() => {
    const naturalImages = [...document.querySelectorAll('.aks-systems-page img')].map(
      (element) => ({
        src: element.getAttribute('src') ?? '',
        width: element.naturalWidth,
        height: element.naturalHeight,
      }),
    );

    const touchTargets = [...document.querySelectorAll('.aks-systems-button')].map((element) => {
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
    const protocapMounted =
      document.querySelector('.aks-systems-protocap-map svg [role="tab"]') !== null;
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
      protocapMounted,
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
      3,
      'Systems must render the three station media assets',
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
    assert.ok(measurement.protocapMounted, 'ProtoCap map must mount its interactive SVG');
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

/** String literals of a map module (comments skipped, quotes and escapes honoured). */
function stringLiterals(source) {
  const literals = [];
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === '/' && source[index + 1] === '*') {
      index = source.indexOf('*/', index + 2) + 1;
    } else if (char === '/' && source[index + 1] === '/') {
      index = source.indexOf('\n', index);
      if (index < 0) break;
    } else if (char === "'" || char === '"' || char === '`') {
      let text = '';
      let end = index + 1;
      while (source[end] !== char) {
        if (source[end] === '\\') end += 1;
        text += source[end];
        end += 1;
      }
      literals.push(text);
      index = end;
    }
  }
  return literals;
}

/**
 * Words the maps write in French: every word of their string literals that no English
 * translation uses. A string missing from a dictionary therefore still shows up.
 */
function frenchOnlyWords() {
  const words = (text) => (text.match(/[A-Za-zÀ-ÿ]{4,}/g) ?? []).map((word) => word.toLowerCase());
  const french = new Set();
  const english = new Set();
  for (const name of ['sentinel', 'protocap']) {
    const read = (file) =>
      fs.readFileSync(path.resolve(__dirname, '../app/systems/' + file), 'utf8');
    for (const literal of stringLiterals(read(name + '-map.js'))) {
      for (const word of words(literal)) french.add(word);
    }
    const module = read(name + '-map.en.ts');
    const dictionary = new Function(
      'return ' + module.slice(module.indexOf('{'), module.lastIndexOf('}') + 1),
    )();
    for (const value of Object.values(dictionary)) {
      for (const word of words(value)) english.add(word);
    }
  }
  for (const word of english) french.delete(word);
  // Reviewed list of the maps' own words that are English, names or code (classes, events,
  // attributes). A new word outside it that reaches the English page fails the smoke.
  const shared = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, 'systems-map-english-words.json'), 'utf8'),
  );
  for (const word of shared) french.delete(word);
  return french;
}

/** The English page: fully English maps, and a language switch that keeps the section. */
async function inspectEnglish(browser) {
  const french = frenchOnlyWords();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  try {
    await page.goto(origin + '/en/systems');
    for (const map of ['.aks-systems-sentinel-map', '.aks-systems-protocap-map']) {
      await page.locator(map).scrollIntoViewIfNeeded();
      await page.waitForFunction((selector) => document.querySelector(selector + ' svg text'), map);
      const tabs = page.locator(map + ' [role="tab"]');
      const leftovers = new Set();
      for (let tab = 0; tab < (await tabs.count()); tab += 1) {
        await tabs.nth(tab).click();
        const items = page.locator(
          map + ' [role="button"], ' + map + ' [tabindex="0"]:not([role="tab"])',
        );
        // Opening an item can redraw the scene: recount each time and skip what went away.
        for (let item = -1; item < (await items.count()); item += 1) {
          if (item >= 0) {
            try {
              await items.nth(item).focus({ timeout: 1000 });
              await page.keyboard.press('Enter');
            } catch {
              continue;
            }
          }
          const texts = await page.evaluate((selector) => {
            const root = document.querySelector(selector);
            return [
              ...[...root.querySelectorAll('text, title')]
                .filter((node) => node.getAttribute('x') !== '-999')
                .map((node) => node.textContent),
              ...[...root.querySelectorAll('[aria-label]')].map((node) =>
                node.getAttribute('aria-label'),
              ),
            ];
          }, map);
          for (const text of texts) {
            const words = (text.match(/[A-Za-zÀ-ÿ]{4,}/g) ?? []).map((word) => word.toLowerCase());
            if (words.some((word) => french.has(word))) leftovers.add(text.trim());
          }
        }
      }
      assert.deepEqual([...leftovers], [], map + ' must be fully English on the English page');
    }

    const switcher = page.locator('.aks-experience-meta .aks-experience-language');
    assert.equal((await switcher.innerText()).replace(/\s+/g, ''), 'FR/EN');
    await page.evaluate(() => document.getElementById('workbench').scrollIntoView());
    await page.waitForFunction(() =>
      document
        .querySelector('.aks-experience-meta .aks-experience-language')
        ?.getAttribute('href')
        ?.endsWith('#workbench'),
    );
    // The link is absolute to akiksystems.fr in a production build and relative when the build
    // runs under another NODE_ENV (as in CI); the domain mapping itself is unit-tested.
    assert.match(
      await switcher.getAttribute('href'),
      /^(https:\/\/akiksystems\.fr)?\/fr\/systems#workbench$/,
      'the language switch must keep the section across domains',
    );
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
      for (const locale of ['fr', 'en']) await inspectViewport(browser, viewport, locale);
    }
    await inspectEnglish(browser);
    console.log(
      'Systems visual smoke passed in French and English from 320 to 2560px, with fully English maps and a language switch that keeps the section.',
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
