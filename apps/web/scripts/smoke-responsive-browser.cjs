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
    if (exited) {
      throw new Error('Responsive smoke server exited before readiness. stderr=' + stderr);
    }
    try {
      const response = await globalThis.fetch(origin + '/fr');
      if (response.ok) return;
    } catch {
      // Production server is still starting.
    }
    await sleep(125);
  }

  throw new Error('Responsive smoke server did not become ready. stderr=' + stderr);
}

async function measure(page) {
  return page.evaluate(() => {
    const rect = (selector) => {
      const element = document.querySelector(selector);
      if (!(element instanceof HTMLElement) && !(element instanceof SVGElement)) {
        return null;
      }

      const box = element.getBoundingClientRect();
      return {
        top: box.top,
        left: box.left,
        right: box.right,
        bottom: box.bottom,
        width: box.width,
        height: box.height,
      };
    };

    const centerX = (box) => (box === null ? null : box.left + box.width / 2);
    const doorIds = ['work-with-us', 'profile', 'systems', 'writings', 'learning'];

    const clock = document.querySelector('.aks-home-clock');
    const portal = document.querySelector('.aks-home-portal');

    return {
      viewportWidth: document.documentElement.clientWidth,
      viewportHeight: document.documentElement.clientHeight,
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
      meta: rect('.aks-home-meta'),
      clock: rect('.aks-home-clock'),
      clockContext: rect('.aks-home-clock-context'),
      clockDate: rect('.aks-home-clock-date'),
      language: rect('.aks-home-language'),
      portal: rect('.aks-home-portal'),
      portalDisplay: portal instanceof HTMLElement ? getComputedStyle(portal).display : null,
      brand: rect('.aks-home-brand-mark'),
      wordmark: rect('.aks-home-wordmark'),
      scale: rect('.aks-home-scale'),
      preview: rect('.aks-home-active-description'),
      previewState: document
        .querySelector('.aks-home-active-description')
        ?.getAttribute('data-state'),
      previewOpacity: Number.parseFloat(
        getComputedStyle(document.querySelector('.aks-home-active-description')).opacity,
      ),
      footer: rect(".aks-experience-footer[data-home='true']"),
      copyright: rect(".aks-experience-footer[data-home='true'] .aks-experience-footer-inner > p"),
      legalNav: rect(".aks-experience-footer[data-home='true'] .aks-experience-footer-inner > nav"),
      footerSeparator: getComputedStyle(
        document.querySelector(".aks-experience-footer[data-home='true']"),
        '::before',
      ).display,
      doors: Object.fromEntries(
        doorIds.map((id) => [id, rect('.aks-home-door[data-destination="' + id + '"]')]),
      ),
      labels: Object.fromEntries(
        doorIds.map((id) => [
          id,
          rect('.aks-home-door[data-destination="' + id + '"] .aks-home-door-label'),
        ]),
      ),
      doorOrder: [...document.querySelectorAll('.aks-home-door')].map(
        (door) => door.dataset.destination,
      ),
      legalCount: document.querySelectorAll(".aks-experience-footer[data-home='true'] nav a")
        .length,
      background: getComputedStyle(
        document.querySelector('.aks-experience-frame[data-home="true"]'),
      ).backgroundImage,
      clockFits: clock instanceof HTMLElement ? clock.scrollWidth <= clock.clientWidth + 1 : false,
      centers: {
        meta: centerX(rect('.aks-home-meta')),
        brand: centerX(rect('.aks-home-brand-mark')),
        wordmark: centerX(rect('.aks-home-wordmark')),
        portal: centerX(rect('.aks-home-portal')),
        profile: centerX(rect('.aks-home-door[data-destination="profile"]')),
        systems: centerX(rect('.aks-home-door[data-destination="systems"]')),
        writings: centerX(rect('.aks-home-door[data-destination="writings"]')),
        learning: centerX(rect('.aks-home-door[data-destination="learning"]')),
      },
    };
  });
}

function assertNear(actual, expected, tolerance, label) {
  assert.ok(
    actual !== null && Math.abs(actual - expected) <= tolerance,
    label + ' expected ' + expected + '±' + tolerance + ', got ' + actual,
  );
}

function assertInside(rect, width, height, label) {
  assert.ok(rect, label + ' must exist');

  const geometry =
    ' [top=' +
    rect.top.toFixed(2) +
    ', right=' +
    rect.right.toFixed(2) +
    ', bottom=' +
    rect.bottom.toFixed(2) +
    ', left=' +
    rect.left.toFixed(2) +
    ', viewport=' +
    width +
    'x' +
    height +
    ']';

  assert.ok(rect.left >= -1, label + ' must stay inside the left edge' + geometry);
  assert.ok(rect.right <= width + 1, label + ' must stay inside the right edge' + geometry);
  assert.ok(rect.top >= -1, label + ' must stay inside the top edge' + geometry);
  assert.ok(rect.bottom <= height + 1, label + ' must stay inside the bottom edge' + geometry);
}

function assertGap(upper, lower, minimum, maximum, label) {
  assert.ok(upper && lower, label + ' requires both boxes');
  const gap = lower.top - upper.bottom;

  assert.ok(
    gap >= minimum && gap <= maximum,
    label + ' expected ' + minimum + '–' + maximum + 'px, got ' + gap,
  );
}

async function loadViewport(browser, viewport, options = {}) {
  const context = await browser.newContext({
    viewport,
    ...options,
  });
  const page = await context.newPage();
  const response = await page.goto(origin + '/fr');

  assert.equal(
    response?.status(),
    200,
    viewport.width + 'x' + viewport.height + ' must return 200',
  );

  await page.locator('.aks-home').waitFor();
  await page.waitForTimeout(720);

  return { context, page };
}

async function assertGeometry(browser, viewport, name) {
  const { context, page } = await loadViewport(browser, viewport);

  try {
    const m = await measure(page);

    assert.ok(m.scrollWidth <= m.viewportWidth + 1, name + ' must not overflow horizontally');
    assert.ok(
      m.scrollHeight <= m.viewportHeight + 1,
      name + ' must remain a one-screen composition',
    );
    assert.deepEqual(m.doorOrder, ['work-with-us', 'profile', 'systems', 'writings', 'learning']);
    assert.equal(m.legalCount, 3);
    assert.equal(m.footerSeparator, 'none');
    assert.match(m.background, /^radial-gradient\(/);
    assert.equal(m.clockFits, true, name + ' clock must never truncate');

    for (const [label, box] of [
      ['metadata', m.meta],
      ['clock', m.clock],
      ['language', m.language],
      ['portal', m.portal],
      ['emblem', m.brand],
      ['wordmark', m.wordmark],
      ['scale', m.scale],
      ['footer', m.footer],
    ]) {
      assertInside(box, m.viewportWidth, m.viewportHeight, name + ' ' + label);
    }

    for (const [id, box] of Object.entries(m.doors)) {
      assertInside(box, m.viewportWidth, m.viewportHeight, name + ' ' + id);
    }

    const viewportCenter = viewport.width / 2;

    assertNear(m.centers.meta, viewportCenter, 1.5, name + ' metadata group center');
    assertNear(m.centers.portal, viewportCenter, 1.5, name + ' body portal center');
    assertNear(m.centers.brand, viewportCenter, 1.5, name + ' emblem center');
    assertNear(m.centers.wordmark, viewportCenter, 1.5, name + ' wordmark center');

    assertNear(
      (m.centers.profile + m.centers.systems) / 2,
      viewportCenter,
      2,
      name + ' Profile/Systems symmetry',
    );
    assertNear(
      (m.centers.writings + m.centers.learning) / 2,
      viewportCenter,
      2,
      name + ' Writings/Learning symmetry',
    );

    const compactLandscape =
      viewport.width > viewport.height && viewport.width < 900 && viewport.height <= 600;
    const desktopLandscape = viewport.width >= 900 && viewport.width > viewport.height;

    if (!compactLandscape && !desktopLandscape) {
      assertNear(
        m.labels.profile.top,
        m.labels.systems.top,
        2,
        name + ' first portrait navigation row',
      );
      assertNear(
        m.labels.writings.top,
        m.labels.learning.top,
        2,
        name + ' second portrait navigation row',
      );

      assertGap(m.preview, m.doors.profile, 8, 40, name + ' preview → first navigation row');
      assertGap(
        m.doors.profile,
        m.doors.writings,
        18,
        80,
        name + ' portrait navigation row spacing',
      );
    } else {
      assertNear(m.labels.profile.top, m.labels.systems.top, 2, name + ' orbital side row');
      assertNear(m.labels.writings.top, m.labels.learning.top, 2, name + ' orbital lower row');

      assertGap(m.scale, m.preview, 4, 24, name + ' slogan → preview');
      assertGap(m.preview, m.doors.writings, 8, 48, name + ' preview → lower destinations');
    }

    const bodyTop = Math.min(
      m.doors['work-with-us'].top,
      m.doors.profile.top,
      m.doors.systems.top,
      m.brand.top,
    );
    const bodyBottom = Math.max(m.doors.writings.bottom, m.doors.learning.bottom, m.preview.bottom);
    const bodyHeight = bodyBottom - bodyTop;

    if (viewport.width >= 1440) {
      assert.ok(
        bodyHeight <= 650,
        name + ' premium body must not vertically disperse: ' + bodyHeight,
      );
      assert.ok(m.portal.width <= 1761, name + ' orbital artboard must stay capped at 110rem');
      const minimumDesktopMark = viewport.height < 960 ? 245 : 278;
      assert.ok(
        m.brand.width >= minimumDesktopMark && m.brand.width <= 337,
        name +
          ' emblem must keep a premium scale appropriate to available height: ' +
          m.brand.width,
      );
    }

    const lowerBottom = Math.max(m.doors.writings.bottom, m.doors.learning.bottom);
    assert.ok(
      m.footer.top - lowerBottom >= 10,
      name + ' footer must remain separate from body content',
    );

    return m;
  } finally {
    await context.close();
  }
}

async function assertMetadataRegimes(browser) {
  {
    const { context, page } = await loadViewport(browser, {
      width: 320,
      height: 568,
    });

    try {
      const m = await measure(page);
      assert.ok(
        m.clockDate.top > m.clockContext.top + 6,
        '320px clock date must move to a second line',
      );
      assert.ok(
        m.language.left - m.clock.right <= 12,
        '320px language control must stay visually grouped with metadata',
      );
      assertNear(m.centers.meta, 160, 1.5, '320px metadata group must remain centered');
    } finally {
      await context.close();
    }
  }

  for (const viewport of [
    { width: 360, height: 800 },
    { width: 375, height: 812 },
    { width: 390, height: 844 },
    { width: 430, height: 932 },
    { width: 768, height: 1024 },
    { width: 1440, height: 900 },
  ]) {
    const { context, page } = await loadViewport(browser, viewport);

    try {
      const m = await measure(page);
      assertNear(
        m.clockDate.top,
        m.clockContext.top,
        1,
        viewport.width + 'px metadata must stay on one line',
      );
      assert.ok(
        m.language.left - m.clock.right <= 16,
        viewport.width + 'px language must stay grouped with the clock',
      );
      assertNear(
        m.centers.meta,
        viewport.width / 2,
        1.5,
        viewport.width + 'px metadata group center',
      );
    } finally {
      await context.close();
    }
  }
}

async function assertPreviewCorridor(browser, viewport, name) {
  const { context, page } = await loadViewport(browser, viewport);

  try {
    await page.locator('.aks-home-door[data-destination="work-with-us"]').hover();
    await page.waitForTimeout(240);

    const m = await measure(page);

    assert.equal(m.previewState, 'active', name + ' preview must activate');
    assert.ok(m.previewOpacity > 0.9, name + ' preview must be visible');

    const compactLandscape =
      viewport.width > viewport.height && viewport.width < 900 && viewport.height <= 600;
    const desktopLandscape = viewport.width >= 900 && viewport.width > viewport.height;

    if (compactLandscape || desktopLandscape) {
      assertGap(m.scale, m.preview, 4, 24, name + ' active slogan → preview');
      assertGap(m.preview, m.doors.writings, 8, 48, name + ' active preview → lower destinations');
    } else {
      assertGap(m.preview, m.doors.profile, 8, 40, name + ' active preview → first destinations');
    }
  } finally {
    await context.close();
  }
}

async function assertBreakpointContinuity(browser) {
  const samples = [];

  for (const width of [767, 768, 769]) {
    samples.push(
      await assertGeometry(browser, { width, height: 1024 }, width + '×1024 continuity'),
    );
  }

  const spread = (values) => Math.max(...values) - Math.min(...values);

  assert.ok(
    spread(samples.map((sample) => sample.brand.top)) <= 3,
    '767/768/769 emblem top must be continuous',
  );
  assert.ok(
    spread(samples.map((sample) => sample.brand.width)) <= 3,
    '767/768/769 emblem size must be continuous',
  );
  assert.ok(
    spread(samples.map((sample) => sample.labels.profile.top)) <= 3,
    '767/768/769 first nav row must be continuous',
  );
  assert.ok(
    spread(samples.map((sample) => sample.labels.writings.top)) <= 3,
    '767/768/769 second nav row must be continuous',
  );
}

async function assertLargeDesktopStability(browser) {
  const samples = [];

  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1440, height: 1024 },
    { width: 1920, height: 1080 },
    { width: 2560, height: 1440 },
  ]) {
    samples.push({
      viewport,
      measurement: await assertGeometry(
        browser,
        viewport,
        viewport.width + '×' + viewport.height + ' desktop stability',
      ),
    });
  }

  const wideSamples = samples.filter(({ viewport }) => viewport.width >= 1920);

  for (const { viewport, measurement } of wideSamples) {
    assertNear(measurement.portal.width, 1760, 1, viewport.width + 'px body width cap');

    const profileDistance = viewport.width / 2 - measurement.centers.profile;
    const systemsDistance = measurement.centers.systems - viewport.width / 2;

    assertNear(profileDistance, systemsDistance, 2, viewport.width + 'px side orbital symmetry');

    assert.ok(
      profileDistance >= 700 && profileDistance <= 780,
      viewport.width + 'px side destinations must stay visually attached to the body',
    );
  }
}

async function assertHomeContrast(browser) {
  const { context, page } = await loadViewport(browser, {
    width: 1440,
    height: 1024,
  });

  try {
    const ratios = await page.evaluate(() => {
      const background = [17, 17, 15];

      const parseColor = (value) => {
        const match = value.match(/rgba?\(([^)]+)\)/);
        if (!match) throw new Error('Unsupported computed color: ' + value);
        const values = match[1]
          .split(/[\s,/]+/)
          .filter(Boolean)
          .map(Number);
        return {
          r: values[0],
          g: values[1],
          b: values[2],
          a: values.length > 3 ? values[3] : 1,
        };
      };

      const channel = (value) => {
        const normalized = value / 255;
        return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
      };

      const luminance = ({ r, g, b }) =>
        0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);

      const composite = ({ r, g, b, a }) => ({
        r: r * a + background[0] * (1 - a),
        g: g * a + background[1] * (1 - a),
        b: b * a + background[2] * (1 - a),
      });

      const ratioFor = (selector) => {
        const element = document.querySelector(selector);
        if (!(element instanceof HTMLElement)) {
          throw new Error('Missing contrast target: ' + selector);
        }
        const foreground = composite(parseColor(getComputedStyle(element).color));
        const lighter = Math.max(
          luminance(foreground),
          luminance({
            r: background[0],
            g: background[1],
            b: background[2],
          }),
        );
        const darker = Math.min(
          luminance(foreground),
          luminance({
            r: background[0],
            g: background[1],
            b: background[2],
          }),
        );
        return (lighter + 0.05) / (darker + 0.05);
      };

      return {
        summary: ratioFor('.aks-home-door-summary'),
        footer: ratioFor(".aks-experience-footer[data-home='true'] .aks-experience-footer-inner"),
        inactiveLanguage: ratioFor('.aks-home-language-target'),
        clock: ratioFor('.aks-home-clock'),
      };
    });

    for (const [label, ratio] of Object.entries(ratios)) {
      assert.ok(ratio >= 4.5, label + ' contrast must meet WCAG AA 4.5:1, got ' + ratio.toFixed(2));
    }
  } finally {
    await context.close();
  }
}

async function assertTouchSelection(browser) {
  const { context, page } = await loadViewport(
    browser,
    { width: 375, height: 812 },
    { hasTouch: true, isMobile: true },
  );

  try {
    const perspective = page.locator('.aks-home-door[data-destination="work-with-us"]');

    await perspective.tap();

    assert.equal(new URL(page.url()).pathname, '/fr', 'first tap must not navigate');
    assert.equal(
      await perspective.evaluate((element) => element.classList.contains('is-active')),
      true,
    );

    const selected = await measure(page);
    assert.equal(selected.previewState, 'active');
    assertGap(
      selected.preview,
      selected.doors.profile,
      8,
      40,
      '375px touch preview → first destinations',
    );

    await page.locator('.aks-home-center').tap();
    const cleared = await measure(page);
    assert.equal(cleared.previewState, 'idle', 'outside tap must clear touch selection');

    await perspective.tap();
    await perspective.tap();
    await page.waitForURL('**/fr/travailler-ensemble');
  } finally {
    await context.close();
  }
}

async function assertKeyboardOrder(browser) {
  const { context, page } = await loadViewport(browser, {
    width: 1440,
    height: 1024,
  });

  try {
    const order = await page.evaluate(() =>
      [
        ...document.querySelectorAll(
          'a[data-home-preview-target="primary"], .aks-experience-footer[data-home="true"] nav a',
        ),
      ].map((element) => {
        const primaryLabel = element.querySelector('.aks-home-door-label');
        return (primaryLabel ?? element).textContent?.trim();
      }),
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
  const { context, page } = await loadViewport(
    browser,
    { width: 430, height: 932 },
    { reducedMotion: 'reduce' },
  );

  try {
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
    for (const [viewport, name] of [
      [{ width: 320, height: 568 }, 'mobile 320×568'],
      [{ width: 360, height: 800 }, 'mobile 360×800'],
      [{ width: 375, height: 812 }, 'mobile 375×812'],
      [{ width: 390, height: 844 }, 'mobile 390×844'],
      [{ width: 430, height: 932 }, 'mobile 430×932'],
      [{ width: 568, height: 320 }, 'mobile landscape 568×320'],
      [{ width: 844, height: 390 }, 'mobile landscape 844×390'],
      [{ width: 915, height: 412 }, 'mobile landscape 915×412'],
      [{ width: 932, height: 430 }, 'mobile landscape 932×430'],
      [{ width: 960, height: 600 }, 'compact landscape 960×600'],
      [{ width: 820, height: 1180 }, 'tablet portrait 820×1180'],
      [{ width: 1024, height: 768 }, 'tablet landscape 1024×768'],
      [{ width: 1280, height: 720 }, 'laptop 1280×720'],
      [{ width: 1366, height: 768 }, 'laptop 1366×768'],
    ]) {
      await assertGeometry(browser, viewport, name);
    }

    await assertMetadataRegimes(browser);
    await assertBreakpointContinuity(browser);
    await assertLargeDesktopStability(browser);

    for (const [viewport, name] of [
      [{ width: 375, height: 812 }, '375×812'],
      [{ width: 568, height: 320 }, '568×320'],
      [{ width: 768, height: 1024 }, '768×1024'],
      [{ width: 915, height: 412 }, '915×412'],
      [{ width: 932, height: 430 }, '932×430'],
      [{ width: 960, height: 600 }, '960×600'],
      [{ width: 1024, height: 768 }, '1024×768'],
      [{ width: 1440, height: 1024 }, '1440×1024'],
      [{ width: 2560, height: 1440 }, '2560×1440'],
    ]) {
      await assertPreviewCorridor(browser, viewport, name);
    }

    await assertHomeContrast(browser);
    await assertTouchSelection(browser);
    await assertKeyboardOrder(browser);
    await assertReducedMotion(browser);

    console.log(
      'Responsive browser smoke passed: centered metadata, compact body, symmetric orbital grid, 320 two-line clock, breakpoint continuity, touch selection and reduced motion are qualified.',
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
