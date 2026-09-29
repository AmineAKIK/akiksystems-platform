/* eslint-disable @typescript-eslint/no-require-imports, no-undef */
// Run against a production preview: MAP_TEST_ORIGIN=http://127.0.0.1:4197 node scripts/smoke-map-fullscreen.cjs
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  try {
    for (const viewport of [
      { width: 1440, height: 1000 },
      { width: 390, height: 844 },
      { width: 320, height: 640 },
    ]) {
      for (const fallback of [false, true]) {
        const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
        if (fallback)
          await context.addInitScript(() => {
            Element.prototype.requestFullscreen = () =>
              Promise.reject(new Error('Fullscreen denied'));
          });
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.goto((process.env.MAP_TEST_ORIGIN || 'http://127.0.0.1:4197') + '/fr/systems');
        for (const name of ['sentinel', 'protocap']) {
          const frame = page.locator(`[data-map="${name}"]`);
          await frame.scrollIntoViewIfNeeded();
          await frame.locator('.canvas .q-t').waitFor();
          const button = frame.locator('.aks-map-fullscreen-control');
          await button.scrollIntoViewIfNeeded();
          const before = await page.evaluate(() => scrollY);
          await button.click();
          await page.waitForFunction(
            (name) =>
              document.querySelector(`[data-map="${name}"]`).dataset.fullscreenActive === 'true',
            name,
          );
          await page.waitForTimeout(300);
          const geometry = await frame.evaluate((root) => {
            const box = root.getBoundingClientRect();
            const svg = root.querySelector('.sn-scroll > svg').getBoundingClientRect();
            const button = root
              .querySelector('.aks-map-fullscreen-control')
              .getBoundingClientRect();
            return {
              x: box.x,
              y: box.y,
              width: box.width,
              height: box.height,
              viewportWidth: innerWidth,
              viewportHeight: innerHeight,
              svgWidth: svg.width,
              svgTop: svg.top,
              toolbarRows: root.querySelectorAll('.aks-map-fullscreen-toolbar').length,
              buttonInsideMap:
                button.left >= svg.left && button.right <= svg.right && button.top >= svg.top,
              native: document.fullscreenElement === root,
              fallback: root.dataset.fullscreenMode,
              buttonHeight: button.height,
            };
          });
          assert.equal(geometry.x, 0);
          assert.equal(geometry.y, 0);
          assert.equal(geometry.width, geometry.viewportWidth);
          assert.equal(geometry.height, geometry.viewportHeight);
          assert.ok(
            Math.abs(geometry.svgWidth - geometry.width) <= 16,
            'Map must fill width, not shrink to fit height',
          );
          assert.ok(
            Math.abs(geometry.svgTop - geometry.y) < 2,
            'No bar or letterbox above the map',
          );
          assert.equal(geometry.toolbarRows, 0, 'No toolbar row added around the map');
          assert.ok(geometry.buttonInsideMap, 'The control stays in the map’s own header');
          assert.equal(
            fallback ? geometry.fallback : geometry.native,
            fallback ? 'fallback' : true,
          );
          if (process.env.MAP_TEST_SHOTS) {
            await page.screenshot({
              path: `${process.env.MAP_TEST_SHOTS}/map-${name}-${viewport.width}-${fallback ? 'fallback' : 'native'}.png`,
            });
          }
          if (fallback) await page.keyboard.press('Escape');
          else await button.click();
          await page.waitForFunction(
            (name) =>
              document.querySelector(`[data-map="${name}"]`).dataset.fullscreenActive === 'false',
            name,
          );
          await page.waitForTimeout(200);
          assert.ok(
            Math.abs((await page.evaluate(() => scrollY)) - before) < 3,
            'Restore page position',
          );
          assert.ok(
            await button.evaluate((node) => document.activeElement === node),
            'Restore focus',
          );
        }
        assert.deepEqual(errors, []);
        console.log('PASS', viewport.width, fallback ? 'fallback / Escape' : 'native / button');
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
