/* eslint-disable @typescript-eslint/no-require-imports, no-undef */
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { setTimeout: sleep } = require('node:timers/promises');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const port = '4178';
const origin = 'http://127.0.0.1:' + port;
const screenshotDirectory = path.resolve(__dirname, '../../../artifacts/home');
fs.mkdirSync(screenshotDirectory, { recursive: true });

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
      // Orbit nodes the desktop doors hang from (hidden in other layouts).
      nodes: Object.fromEntries(
        ['profile', 'systems', 'writings', 'learning'].map((id) => {
          const node = document.querySelector('.aks-home-plan-node[data-node="' + id + '"]');
          if (!(node instanceof HTMLElement) || getComputedStyle(node).display === 'none') {
            return [id, null];
          }
          const box = node.getBoundingClientRect();
          return [id, { x: box.left + box.width / 2, y: box.top + box.height / 2 }];
        }),
      ),
      previewText: rect('.aks-home-active-description p'),
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

async function loadViewport(browser, viewport, options = {}, locale = 'fr') {
  const context = await browser.newContext({
    viewport,
    ...options,
  });
  const page = await context.newPage();
  const response = await page.goto(origin + '/' + locale);

  assert.equal(
    response?.status(),
    200,
    viewport.width + 'x' + viewport.height + ' must return 200',
  );

  await page.locator('.aks-home').waitFor();
  await page.waitForTimeout(720);

  return { context, page };
}

async function assertGeometry(browser, viewport, name, locale = 'fr') {
  const { context, page } = await loadViewport(browser, viewport, {}, locale);

  try {
    const m = await measure(page);
    await page.screenshot({
      path: path.join(
        screenshotDirectory,
        `home-${locale}-${viewport.width}x${viewport.height}.png`,
      ),
    });

    assert.ok(m.scrollWidth <= m.viewportWidth + 1, name + ' must not overflow horizontally');
    assert.ok(
      m.scrollHeight <= m.viewportHeight + 1,
      name + ' must remain a one-screen composition',
    );
    assert.deepEqual(m.doorOrder, ['work-with-us', 'profile', 'systems', 'writings', 'learning']);
    assert.equal(m.legalCount, 3);
    // On the portal the footer has no separator.
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
    } else if (m.nodes.profile !== null) {
      // Desktop: the doors sit on one orbit around the emblem, each centred under its node.
      const emblem = {
        x: m.brand.left + m.brand.width / 2,
        y: m.brand.top + m.brand.height / 2,
      };
      const radii = [];
      for (const id of ['profile', 'systems', 'writings', 'learning']) {
        const node = m.nodes[id];
        const door = m.doors[id];
        assertNear(door.left + door.width / 2, node.x, 1.5, name + ' ' + id + ' under its node');
        assert.ok(
          door.top - node.y >= 8 && door.top - node.y <= 24,
          name + ' ' + id + ' hangs just below its node: ' + (door.top - node.y),
        );
        radii.push(Math.hypot(node.x - emblem.x, node.y - emblem.y));
      }
      for (const radius of radii) {
        assertNear(radius, radii[0], 2, name + ' every door node on the same orbit');
      }
      assertNear(m.nodes.profile.y, emblem.y, 3, name + ' Profile on the emblem axis');
      assertNear(m.nodes.systems.y, emblem.y, 3, name + ' Systems on the emblem axis');
      assertGap(m.scale, m.preview, 4, 24, name + ' slogan → preview');
      for (const id of ['profile', 'systems', 'writings', 'learning']) {
        const door = m.doors[id];
        const preview = m.previewText;
        const overlaps =
          door.left < preview.right &&
          preview.left < door.right &&
          door.top < preview.bottom &&
          preview.top < door.bottom;
        assert.ok(!overlaps, name + ' ' + id + ' must stay clear of the preview');
      }
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

    if (desktopLandscape && m.nodes.profile !== null) {
      // On the orbit the lower doors flank the preview: it must run between them, untouched.
      assertGap(m.scale, m.preview, 4, 24, name + ' active slogan → preview');
      for (const id of ['profile', 'systems', 'writings', 'learning']) {
        const door = m.doors[id];
        const preview = m.previewText;
        assert.ok(
          door.right < preview.left || door.left > preview.right || door.top > preview.bottom,
          name + ' active preview must not touch ' + id,
        );
      }
    } else if (compactLandscape || desktopLandscape) {
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

    // The side doors sit on the orbit: 1.8 emblems from the centre, attached to the body.
    const orbitRatio = profileDistance / measurement.brand.width;
    assert.ok(
      orbitRatio >= 1.75 && orbitRatio <= 1.85,
      viewport.width + 'px side destinations must stay on the orbit: ' + orbitRatio.toFixed(3),
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

    // A door not open yet shows its preview on tap and never navigates.
    const writings = page.locator('.aks-home-door[data-destination="writings"]');
    await writings.tap();
    await writings.tap();
    const soon = await measure(page);
    assert.equal(soon.previewState, 'active', 'a door in preparation must show its preview');
    assert.equal(new URL(page.url()).pathname, '/fr', 'a door in preparation must not navigate');

    await perspective.tap();
    await perspective.tap();
    await page.waitForURL('**/fr/profil#contact');
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

/** The intro scramble runs frame by frame, and nothing on the portal glows. */
async function assertIntroBudget(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.addInitScript(() => {
    window.__glyphUpdates = [];
    document.addEventListener('DOMContentLoaded', () => {
      const matrix = document.querySelector('.aks-home-wordmark-matrix');
      new MutationObserver(() => window.__glyphUpdates.push(performance.now())).observe(matrix, {
        characterData: true,
        childList: true,
        subtree: true,
      });
    });
  });

  try {
    await page.goto(origin + '/fr');
    await page.waitForTimeout(2600);
    const intro = await page.evaluate(() => {
      const times = window.__glyphUpdates;
      const gaps = times.slice(1).map((time, index) => time - times[index]);
      const glow = [
        '.aks-home-wordmark',
        '.aks-home-wordmark-matrix',
        '.aks-home-scale-letter',
        '.aks-home-door-label',
      ].filter((selector) => {
        const element = document.querySelector(selector);
        return element !== null && getComputedStyle(element).textShadow !== 'none';
      });
      return {
        updates: times.length,
        maxGap: gaps.length === 0 ? Infinity : Math.max(...gaps),
        glow,
        wordmark: [...document.querySelectorAll('.aks-home-wordmark-glyph')]
          .map((glyph) => glyph.textContent)
          .join(''),
      };
    });

    assert.ok(
      intro.updates >= 40,
      'the wordmark scramble must update every frame: ' + intro.updates,
    );
    assert.ok(intro.maxGap <= 40, 'the wordmark scramble must not stall: ' + intro.maxGap);
    assert.equal(intro.wordmark, 'AkikSystems', 'the scramble must settle on the wordmark');
    assert.deepEqual(intro.glow, [], 'no halo on the portal text');
  } finally {
    await context.close();
  }
}

/** Serves the public domains from the local production server, Host header included. */
function servePublicDomain(route) {
  const request = route.request();
  const url = new URL(request.url());
  const headers = { ...request.headers(), host: url.host };
  delete headers['accept-encoding'];

  return new Promise((resolve, reject) => {
    const upstream = http.request(
      {
        host: '127.0.0.1',
        port,
        path: url.pathname + url.search,
        method: request.method(),
        headers,
      },
      (response) => {
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => {
          route
            .fulfill({
              status: response.statusCode,
              headers: response.headers,
              body: Buffer.concat(chunks),
            })
            .then(resolve, reject);
        });
      },
    );
    upstream.on('error', reject);
    upstream.end();
  });
}

/** A real click on FR / EN: akiksystems.fr/fr → akiksystems.com/en, no redirect, lang follows. */
async function assertLanguageJourney(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.route(/^https:\/\/akiksystems\.(fr|com)\//, servePublicDomain);
  const page = await context.newPage();
  const documents = [];
  page.on('response', (response) => {
    if (response.request().resourceType() === 'document') {
      documents.push(response.status() + ' ' + response.url());
    }
  });

  try {
    await page.goto('https://akiksystems.fr/fr');
    await page.locator('.aks-home').waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.lang), 'fr');
    await page.waitForTimeout(1600);
    await page.screenshot({ path: path.join(screenshotDirectory, 'journey-1-fr.png') });

    const switcher = page.locator('.aks-home-meta .aks-home-language');
    assert.equal((await switcher.innerText()).replace(/\s+/g, ''), 'FR/EN');
    // A production build links straight to the other domain; a build under another NODE_ENV
    // (as in CI) links relatively, and the client follows the server's canonical redirect.
    const href = await switcher.getAttribute('href');
    assert.ok(
      href === 'https://akiksystems.com/en' || href === '/en',
      'unexpected switch link ' + href,
    );

    documents.length = 0;
    await switcher.click();
    await page.waitForURL('https://akiksystems.com/en');
    await page.locator('.aks-home').waitFor();

    assert.equal(await page.evaluate(() => document.documentElement.lang), 'en');
    assert.equal(
      (await page.locator('.aks-home-meta .aks-home-language').innerText()).replace(/\s+/g, ''),
      'FR/EN',
      'the switch keeps its order in English',
    );
    // Either way one document loads: the page itself, never loader data or a redirect chain.
    assert.deepEqual(
      documents,
      ['200 https://akiksystems.com/en'],
      'the switch must land on akiksystems.com/en in one document',
    );
    await page.waitForTimeout(1600);
    await page.screenshot({ path: path.join(screenshotDirectory, 'journey-2-en.png') });
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
      for (const locale of ['fr', 'en']) {
        await assertGeometry(browser, viewport, locale + ' ' + name, locale);
      }
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
    await assertIntroBudget(browser);
    await assertLanguageJourney(browser);

    console.log(
      'Responsive browser smoke passed in French and English: centered metadata, compact body, orbital geometry, 320 two-line clock, breakpoint continuity, touch selection, reduced motion, a smooth intro without halos and a real FR → EN switch across domains.',
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
