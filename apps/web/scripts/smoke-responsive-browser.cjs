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
    const home = document.querySelector('.aks-home');
    const meta = document.querySelector('.aks-home-meta');
    const center = document.querySelector('.aks-home-center');
    const heading = center?.querySelector('.aks-heading');
    const brand = center?.querySelector('.aks-home-brand-mark');
    const activeDescription = center?.querySelector('.aks-home-active-description');
    const orbit = document.querySelector('.aks-home-orbit');
    const footerShell = document.querySelector(
      ".aks-experience-footer[data-home='true']",
    );
    const footer = footerShell?.querySelector('.aks-experience-footer-inner');
    const copyright = footer?.querySelector('p');
    const legalNav = footer?.querySelector('nav');
    const doors = [...document.querySelectorAll('.aks-home-door')];

    if (
      !(home instanceof HTMLElement) ||
      !(meta instanceof HTMLElement) ||
      !(center instanceof HTMLElement) ||
      !(heading instanceof HTMLElement) ||
      !(brand instanceof HTMLElement) ||
      !(activeDescription instanceof HTMLElement) ||
      !(orbit instanceof HTMLElement) ||
      !(footerShell instanceof HTMLElement) ||
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

    const homeRect = rect(home);
    const metaRect = rect(meta);
    const centerRect = rect(center);
    const headingRect = rect(heading);
    const brandRect = rect(brand);
    const activeDescriptionRect = rect(activeDescription);
    const orbitRect = rect(orbit);
    const copyrightRect = rect(copyright);
    const legalNavRect = rect(legalNav);
    const footerShellRect = rect(footerShell);
    const footerSeparator = getComputedStyle(footerShell, '::before');
    const doorRects = doors.map(rect);
    const doorRectsByDestination = Object.fromEntries(
      doors.map((door) => [door.dataset.destination ?? '', rect(door)]),
    );
    const doorSeparators = doors.slice(1).map((door) => {
      const separator = getComputedStyle(door, '::before');
      return {
        content: separator.content,
        backgroundImage: separator.backgroundImage,
        width: Number.parseFloat(separator.width),
        height: Number.parseFloat(separator.height),
        doorWidth: door.getBoundingClientRect().width,
      };
    });

    return {
      viewportWidth,
      pageFits: document.documentElement.scrollWidth <= viewportWidth,
      centerPosition: getComputedStyle(center).position,
      firstDoorPosition: doors[0] instanceof HTMLElement ? getComputedStyle(doors[0]).position : null,
      orbitDisplay: getComputedStyle(orbit).display,
      homeRect,
      metaRect,
      centerRect,
      headingRect,
      brandRect,
      activeDescriptionRect,
      activeDescriptionState: activeDescription.dataset.state ?? null,
      orbitRect,
      footerRect: rect(footer),
      footerShellRect,
      footerUsesCanonicalSeparator: footerShell.classList.contains(
        'aks-section-separator-before',
      ),
      footerSeparator: {
        content: footerSeparator.content,
        backgroundImage: footerSeparator.backgroundImage,
        width: Number.parseFloat(footerSeparator.width),
        height: Number.parseFloat(footerSeparator.height),
      },
      copyrightRect,
      legalNavRect,
      centerOrbitOverlap: overlaps(centerRect, orbitRect),
      footerContentOverlap: overlaps(copyrightRect, legalNavRect),
      doorRects,
      doorRectsByDestination,
      doorOrder: doors.map((door) => door.dataset.destination ?? ''),
      doorSeparators,
      identityScaleRatio: brandRect.width / headingRect.width,
      doorCount: doors.length,
    };
  });
}

function assertHomeFooterSeparator(measurement, name) {
  assert.equal(
    measurement.footerUsesCanonicalSeparator,
    true,
    `${name} footer must use the canonical application section separator primitive.`,
  );
  assert.notEqual(
    measurement.footerSeparator.content,
    'none',
    `${name} footer separator must render.`,
  );
  assert.match(
    measurement.footerSeparator.backgroundImage,
    /^linear-gradient\(/,
    `${name} footer separator must use the shared fading gradient.`,
  );
  assert.ok(
    measurement.footerSeparator.width < measurement.footerShellRect.width,
    `${name} footer separator must remain inset instead of slicing the viewport edge-to-edge.`,
  );
  assert.ok(
    measurement.footerSeparator.height <= 1,
    `${name} footer separator must remain hairline-thin.`,
  );
}

function assertIdentityScale(measurement, name) {
  assert.ok(
    measurement.identityScaleRatio >= 0.33,
    `${name} brand mark must keep enough visual mass relative to the AkikSystems wordmark.`,
  );
  assert.ok(
    measurement.identityScaleRatio <= 0.8,
    `${name} brand mark must not overpower the AkikSystems wordmark.`,
  );
}

function assertHomeDoorSeparators(measurement, name) {
  assert.equal(
    measurement.doorSeparators.length,
    4,
    `${name} compact navigation must render four separators between five destinations.`,
  );

  for (const [index, separator] of measurement.doorSeparators.entries()) {
    assert.notEqual(
      separator.content,
      'none',
      `${name} destination separator ${index + 1} must render.`,
    );
    assert.equal(
      separator.backgroundImage,
      measurement.footerSeparator.backgroundImage,
      `${name} destination separator ${index + 1} must use the same fading gradient as the footer.`,
    );
    assert.ok(
      separator.width < separator.doorWidth,
      `${name} destination separator ${index + 1} must stay inset like the footer separator.`,
    );
    assert.ok(
      separator.height <= 1,
      `${name} destination separator ${index + 1} must remain hairline-thin.`,
    );
  }
}

function assertInsideViewport(rect, width, label) {
  assert.ok(rect.left >= -1, `${label} must stay inside the left viewport edge.`);
  assert.ok(rect.right <= width + 1, `${label} must stay inside the right viewport edge.`);
}

function rectsOverlap(first, second, tolerance = 1) {
  return (
    first.left < second.right - tolerance &&
    first.right > second.left + tolerance &&
    first.top < second.bottom - tolerance &&
    first.bottom > second.top + tolerance
  );
}

function assertNoOverlap(first, second, label) {
  assert.equal(rectsOverlap(first, second), false, `${label} must not overlap.`);
}

function centerX(rect) {
  return rect.left + rect.width / 2;
}

function assertHorizontallyAligned(first, second, label) {
  assert.ok(
    Math.abs(centerX(first) - centerX(second)) <= 2,
    `${label} must share the same horizontal center.`,
  );
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
    assertHomeFooterSeparator(measurement, name);
    assertHomeDoorSeparators(measurement, name);
    assertIdentityScale(measurement, name);
    assert.equal(measurement.doorCount, 5, `${name} must expose the five primary destinations.`);
    assert.deepEqual(
      measurement.doorOrder,
      ['profile', 'work-with-us', 'writings', 'systems', 'learning'],
      `${name} must keep the approved destination order.`,
    );
    assert.equal(
      measurement.centerPosition,
      'static',
      `${name} must use the compact flow layout instead of desktop absolute positioning.`,
    );
    assert.equal(measurement.orbitDisplay, 'grid', `${name} navigation must use the compact grid.`);
    assert.equal(
      measurement.firstDoorPosition,
      'static',
      `${name} destinations must remain in compact document flow.`,
    );
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

    assertInsideViewport(measurement.metaRect, measurement.viewportWidth, `${name} metadata rail`);
    assertInsideViewport(measurement.centerRect, measurement.viewportWidth, `${name} identity`);
    assertInsideViewport(measurement.headingRect, measurement.viewportWidth, `${name} wordmark`);
    assertInsideViewport(measurement.brandRect, measurement.viewportWidth, `${name} brand mark`);
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

    if (viewport.width > viewport.height) {
      assertHorizontallyAligned(
        measurement.copyrightRect,
        measurement.centerRect,
        `${name} footer copyright and identity`,
      );
      assertHorizontallyAligned(
        measurement.legalNavRect,
        measurement.orbitRect,
        `${name} legal navigation and primary destinations`,
      );
    }

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

async function assertDesktopHome(browser, viewport, name, { preview = false } = {}) {
  const context = await browser.newContext({ viewport });

  try {
    const page = await context.newPage();
    const response = await page.goto(`${origin}/en`);
    assert.equal(response?.status(), 200, `${name} must return HTTP 200.`);
    await page.locator('.aks-home').waitFor();

    let measurement = await measureHome(page);
    assert.ok(measurement, `${name} must be measurable.`);

    assert.equal(measurement.pageFits, true, `${name} must not overflow horizontally.`);
    assertHomeFooterSeparator(measurement, name);
    assertIdentityScale(measurement, name);
    assert.deepEqual(
      measurement.doorOrder,
      ['profile', 'work-with-us', 'writings', 'systems', 'learning'],
      `${name} must keep the approved destination order.`,
    );
    assert.equal(
      measurement.centerPosition,
      'absolute',
      `${name} must preserve the orbital identity composition.`,
    );
    assert.equal(
      measurement.firstDoorPosition,
      'absolute',
      `${name} destinations must preserve orbital positioning.`,
    );

    assertInsideViewport(measurement.metaRect, measurement.viewportWidth, `${name} metadata rail`);
    assertInsideViewport(measurement.headingRect, measurement.viewportWidth, `${name} wordmark`);
    assertInsideViewport(measurement.brandRect, measurement.viewportWidth, `${name} brand mark`);

    const destinations = ['work-with-us', 'profile', 'systems', 'writings', 'learning'];
    for (let firstIndex = 0; firstIndex < destinations.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < destinations.length; secondIndex += 1) {
        const first = measurement.doorRectsByDestination[destinations[firstIndex]];
        const second = measurement.doorRectsByDestination[destinations[secondIndex]];
        assert.ok(first && second, `${name} must expose all orbital destinations.`);
        assertNoOverlap(
          first,
          second,
          `${name} ${destinations[firstIndex]} and ${destinations[secondIndex]}`,
        );
      }
    }

    const workWithUs = measurement.doorRectsByDestination['work-with-us'];
    assert.ok(workWithUs, `${name} must expose Work with us.`);
    assertNoOverlap(workWithUs, measurement.brandRect, `${name} Work with us and brand mark`);

    if (preview) {
      await page.locator(".aks-experience-footer[data-home='true'] nav a").first().hover();
      await page.waitForTimeout(80);
      measurement = await measureHome(page);
      assert.ok(measurement, `${name} preview state must be measurable.`);
      assert.equal(
        measurement.activeDescriptionState,
        'active',
        `${name} legal preview must become active on pointer intent.`,
      );

      const writings = measurement.doorRectsByDestination.writings;
      const learning = measurement.doorRectsByDestination.learning;
      assert.ok(writings && learning, `${name} lower orbital destinations must exist.`);
      assertNoOverlap(
        measurement.activeDescriptionRect,
        writings,
        `${name} preview and Writings`,
      );
      assertNoOverlap(
        measurement.activeDescriptionRect,
        learning,
        `${name} preview and Learning`,
      );
      assert.ok(
        measurement.activeDescriptionRect.width <= 353,
        `${name} preview corridor must remain intentionally bounded.`,
      );
    }

    return measurement;
  } finally {
    await context.close();
  }
}

async function assertHeightContinuity(browser) {
  const at899 = await assertDesktopHome(
    browser,
    { width: 1440, height: 899 },
    'desktop at 899px height',
  );
  const at900 = await assertDesktopHome(
    browser,
    { width: 1440, height: 900 },
    'desktop at 900px height',
  );

  assert.ok(
    Math.abs(at899.brandRect.width - at900.brandRect.width) <= 1,
    '899px and 900px heights must not trigger a brand-size mode switch.',
  );
  assert.ok(
    Math.abs(at899.headingRect.width - at900.headingRect.width) <= 1,
    '899px and 900px heights must not trigger a wordmark-size mode switch.',
  );

  const work899 = at899.doorRectsByDestination['work-with-us'];
  const work900 = at900.doorRectsByDestination['work-with-us'];
  assert.ok(work899 && work900, 'Height continuity must measure Work with us.');

  const relative899 = work899.top - at899.homeRect.top;
  const relative900 = work900.top - at900.homeRect.top;
  assert.ok(
    Math.abs(relative899 - relative900) <= 2,
    '899px and 900px heights must not trigger a discrete Work with us jump.',
  );
}

(async () => {
  await waitForServer();
  const browser = await chromium.launch({ headless: true });

  try {
    const compactScenarios = [
      ['phone narrow portrait', { width: 320, height: 568 }],
      ['phone portrait', { width: 360, height: 640 }],
      ['phone landscape', { width: 844, height: 390 }],
      ['tablet landscape low', { width: 768, height: 600 }],
      ['compact boundary 1023', { width: 1023, height: 768 }],
      ['compact boundary 1024', { width: 1024, height: 768 }],
      ['compact boundary 1025', { width: 1025, height: 768 }],
      ['compact low 1024', { width: 1024, height: 600 }],
      ['compact low 1025', { width: 1025, height: 600 }],
      ['wide compact boundary', { width: 1280, height: 768 }],
    ];

    for (const [name, viewport] of compactScenarios) {
      for (const locale of ['en', 'fr']) {
        await assertCompactHome(browser, locale, viewport, name);
      }
    }

    await assertDesktopHome(browser, { width: 1281, height: 768 }, 'orbital boundary 1281');
    await assertDesktopHome(
      browser,
      { width: 1299, height: 405 },
      'short orbital desktop',
      { preview: true },
    );
    await assertDesktopHome(
      browser,
      { width: 1366, height: 768 },
      'standard orbital desktop',
      { preview: true },
    );
    await assertDesktopHome(browser, { width: 1917, height: 564 }, 'wide short orbital desktop');
    await assertHeightContinuity(browser);

    process.stdout.write(
      'Responsive Home smoke passed: compact widths stay bounded, the 1024/1025 range remains stable, orbital layouts preserve geometry under short heights, and 899/900 no longer trigger a discrete mode switch.\n',
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
