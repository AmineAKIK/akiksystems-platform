/* eslint-disable @typescript-eslint/no-require-imports, no-undef */
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { setTimeout: sleep } = require('node:timers/promises');
const { chromium } = require('playwright');

const port = '4178';
const origin = `http://127.0.0.1:${port}`;

const server = spawn(process.execPath, ['server.js'], {
  cwd: require('node:path').resolve(__dirname, '..'),
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
      const response = await globalThis.fetch(`${origin}/en`);
      if (response.ok) return;
    } catch {
      // Server is still starting.
    }

    await sleep(125);
  }

  throw new Error(`Browser smoke server did not become ready. stderr=${stderr}`);
}

async function measureHome(page) {
  return page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const center = document.querySelector('.aks-home-center');
    const orbit = document.querySelector('.aks-home-orbit');
    const footer = document.querySelector(
      ".aks-experience-footer[data-home='true'] .aks-experience-footer-inner",
    );
    const copyright = footer?.querySelector('p');
    const legalNav = footer?.querySelector('nav');
    const doors = [...document.querySelectorAll('.aks-home-door')];

    if (
      !(center instanceof HTMLElement) ||
      !(orbit instanceof HTMLElement) ||
      !(footer instanceof HTMLElement) ||
      !(copyright instanceof HTMLElement) ||
      !(legalNav instanceof HTMLElement)
    ) {
      return null;
    }

    const rect = (element) => {
      const value = element.getBoundingClientRect();
      return {
        top: value.top,
        right: value.right,
        bottom: value.bottom,
        left: value.left,
        width: value.width,
        height: value.height,
      };
    };

    const overlaps = (first, second) =>
      first.left < second.right - 1 &&
      first.right > second.left + 1 &&
      first.top < second.bottom - 1 &&
      first.bottom > second.top + 1;

    const centerRect = rect(center);
    const orbitRect = rect(orbit);
    const copyrightRect = rect(copyright);
    const legalNavRect = rect(legalNav);
    const doorRects = doors.map(rect);

    return {
      viewportWidth,
      pageFits: document.documentElement.scrollWidth <= viewportWidth,
      centerPosition: getComputedStyle(center).position,
      orbitDisplay: getComputedStyle(orbit).display,
      centerRect,
      orbitRect,
      footerRect: rect(footer),
      copyrightRect,
      legalNavRect,
      centerOrbitOverlap: overlaps(centerRect, orbitRect),
      footerContentOverlap: overlaps(copyrightRect, legalNavRect),
      doorRects,
      doorCount: doors.length,
    };
  });
}

function assertInsideViewport(rect, width, label) {
  assert.ok(rect.left >= -1, `${label} must stay inside the left viewport edge.`);
  assert.ok(rect.right <= width + 1, `${label} must stay inside the right viewport edge.`);
}

async function assertCompactHome(browser, locale, viewport, name) {
  const context = await browser.newContext({
    viewport,
    hasTouch: true,
    isMobile: viewport.width < 768,
  });

  try {
    const page = await context.newPage();
    const response = await page.goto(`${origin}/${locale}`);
    assert.equal(response?.status(), 200, `${name} /${locale} must return HTTP 200.`);
    await page.locator('.aks-home').waitFor();

    await page.locator(".aks-experience-footer[data-home='true']").scrollIntoViewIfNeeded();
    const measurement = await measureHome(page);

    assert.ok(measurement, `${name} Home must be measurable.`);
    assert.equal(measurement.pageFits, true, `${name} must not overflow horizontally.`);
    assert.equal(measurement.doorCount, 5, `${name} must expose the five primary destinations.`);
    assert.equal(
      measurement.centerPosition,
      'static',
      `${name} must use the compact flow layout instead of desktop absolute positioning.`,
    );
    assert.equal(measurement.orbitDisplay, 'grid', `${name} navigation must use the compact grid.`);
    assert.equal(
      measurement.centerOrbitOverlap,
      false,
      `${name} identity and navigation must not overlap.`,
    );
    assert.equal(
      measurement.footerContentOverlap,
      false,
      `${name} footer copyright and legal navigation must not overlap.`,
    );

    assertInsideViewport(measurement.centerRect, measurement.viewportWidth, `${name} identity`);
    assertInsideViewport(measurement.orbitRect, measurement.viewportWidth, `${name} navigation`);
    assertInsideViewport(measurement.footerRect, measurement.viewportWidth, `${name} footer`);
    assertInsideViewport(
      measurement.copyrightRect,
      measurement.viewportWidth,
      `${name} footer copyright`,
    );
    assertInsideViewport(
      measurement.legalNavRect,
      measurement.viewportWidth,
      `${name} footer navigation`,
    );

    for (const [index, doorRect] of measurement.doorRects.entries()) {
      assertInsideViewport(doorRect, measurement.viewportWidth, `${name} door ${index + 1}`);
      assert.ok(
        doorRect.height >= 44,
        `${name} door ${index + 1} must keep a minimum 44px touch target.`,
      );
    }
  } finally {
    await context.close();
  }
}

async function assertDesktopUnchanged(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  try {
    const page = await context.newPage();
    const response = await page.goto(`${origin}/en`);
    assert.equal(response?.status(), 200, 'Desktop Home must return HTTP 200.');
    await page.locator('.aks-home').waitFor();

    const desktop = await page.evaluate(() => {
      const center = document.querySelector('.aks-home-center');
      const door = document.querySelector('.aks-home-door');
      if (!(center instanceof HTMLElement) || !(door instanceof HTMLElement)) return null;

      return {
        centerPosition: getComputedStyle(center).position,
        doorPosition: getComputedStyle(door).position,
        pageFits:
          document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      };
    });

    assert.ok(desktop, 'Desktop Home must be measurable.');
    assert.equal(desktop.pageFits, true, 'Desktop Home must not overflow horizontally.');
    assert.equal(desktop.centerPosition, 'absolute', 'Desktop orbital identity must remain absolute.');
    assert.equal(desktop.doorPosition, 'absolute', 'Desktop orbital destinations must remain absolute.');
  } finally {
    await context.close();
  }
}

(async () => {
  await waitForServer();
  const browser = await chromium.launch({ headless: true });

  try {
    await assertDesktopUnchanged(browser);

    const scenarios = [
      ['phone narrow portrait', { width: 320, height: 720 }],
      ['phone portrait', { width: 390, height: 844 }],
      ['phone landscape', { width: 844, height: 390 }],
      ['tablet portrait', { width: 768, height: 1024 }],
      ['tablet landscape', { width: 1024, height: 768 }],
    ];

    for (const [name, viewport] of scenarios) {
      for (const locale of ['en', 'fr']) {
        await assertCompactHome(browser, locale, viewport, name);
      }
    }

    process.stdout.write(
      'Responsive Home smoke passed: desktop preserved; phone/tablet portrait and landscape remain readable without overlap or horizontal overflow.\n',
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
