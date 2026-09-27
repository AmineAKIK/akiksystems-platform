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
      const response = await globalThis.fetch(origin + '/fr');
      if (response.ok) return;
    } catch {
      // Production server is still starting.
    }
    await sleep(125);
  }
  throw new Error(
    'Responsive smoke server did not become ready. stderr=' + stderr,
  );
}

async function measure(page) {
  return page.evaluate(() => {
    const rect = (selector) => {
      const element = document.querySelector(selector);
      if (
        !(element instanceof HTMLElement) &&
        !(element instanceof SVGElement)
      ) {
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

    const doorIds = [
      'work-with-us',
      'profile',
      'systems',
      'writings',
      'learning',
    ];

    return {
      viewportWidth: document.documentElement.clientWidth,
      viewportHeight: document.documentElement.clientHeight,
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
      meta: rect('.aks-home-meta'),
      brand: rect('.aks-home-brand-mark'),
      wordmark: rect('.aks-home-wordmark'),
      scale: rect('.aks-home-scale'),
      preview: rect('.aks-home-active-description'),
      previewState: document
        .querySelector('.aks-home-active-description')
        ?.getAttribute('data-state'),
      previewOpacity: Number.parseFloat(
        getComputedStyle(
          document.querySelector('.aks-home-active-description'),
        ).opacity,
      ),
      footer: rect(".aks-experience-footer[data-home='true']"),
      copyright: rect(
        ".aks-experience-footer[data-home='true'] .aks-experience-footer-inner > p",
      ),
      legalNav: rect(
        ".aks-experience-footer[data-home='true'] .aks-experience-footer-inner > nav",
      ),
      footerSeparator: getComputedStyle(
        document.querySelector(".aks-experience-footer[data-home='true']"),
        '::before',
      ).display,
      doorOrder: [
        ...document.querySelectorAll('.aks-home-door'),
      ].map((door) => door.dataset.destination),
      doors: Object.fromEntries(
        doorIds.map((id) => [
          id,
          rect('.aks-home-door[data-destination="' + id + '"]'),
        ]),
      ),
      labels: Object.fromEntries(
        doorIds.map((id) => [
          id,
          rect(
            '.aks-home-door[data-destination="' +
              id +
              '"] .aks-home-door-label',
          ),
        ]),
      ),
      legalCount: document.querySelectorAll(
        ".aks-experience-footer[data-home='true'] nav a",
      ).length,
      background: getComputedStyle(
        document.querySelector(
          '.aks-experience-frame[data-home="true"]',
        ),
      ).backgroundImage,
    };
  });
}

function assertNear(actual, expected, tolerance, label) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    label +
      ' expected ' +
      expected +
      '±' +
      tolerance +
      ', got ' +
      actual,
  );
}

function assertInside(rect, width, height, label) {
  assert.ok(rect, label + ' must exist');
  assert.ok(rect.left >= -1, label + ' must stay inside the left edge');
  assert.ok(rect.right <= width + 1, label + ' must stay inside the right edge');
  assert.ok(rect.top >= -1, label + ' must stay inside the top edge');
  assert.ok(
    rect.bottom <= height + 1,
    label + ' must stay inside the bottom edge',
  );
}

function assertVerticalGap(upper, lower, minimum, label) {
  assert.ok(upper && lower, label + ' requires both boxes');
  assert.ok(
    lower.top - upper.bottom >= minimum,
    label +
      ' requires at least ' +
      minimum +
      'px, got ' +
      (lower.top - upper.bottom),
  );
}

const referenceAnchors = new Map([
  [
    '375x812',
    {
      perspectiveTop: 84,
      brandTop: 141,
      brandWidth: 150,
      wordmarkTop: 310,
      profileTop: 491,
      writingsTop: 563,
      tolerance: 12,
    },
  ],
  [
    '430x932',
    {
      perspectiveTop: 96,
      brandTop: 168,
      brandWidth: 170,
      wordmarkTop: 359,
      profileTop: 538,
      writingsTop: 621,
      tolerance: 12,
    },
  ],
  [
    '768x1024',
    {
      perspectiveTop: 126,
      brandTop: 239,
      brandWidth: 218,
      wordmarkTop: 481,
      profileTop: 664,
      writingsTop: 768,
      tolerance: 14,
    },
  ],
  [
    '1024x768',
    {
      perspectiveTop: 122,
      brandTop: 231,
      brandWidth: 204,
      wordmarkTop: 451,
      profileTop: 334,
      writingsTop: 624,
      tolerance: 12,
    },
  ],
  [
    '1440x1024',
    {
      perspectiveTop: 178,
      brandTop: 330,
      brandWidth: 288,
      wordmarkTop: 632,
      profileTop: 372,
      writingsTop: 808,
      tolerance: 14,
    },
  ],
]);

async function loadViewport(browser, viewport) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const response = await page.goto(origin + '/fr');
  assert.equal(
    response?.status(),
    200,
    viewport.width + 'x' + viewport.height + ' must return 200',
  );
  await page.locator('.aks-home').waitFor();
  return { context, page };
}

async function assertGeometry(browser, viewport, name) {
  const { context, page } = await loadViewport(browser, viewport);

  try {
    const m = await measure(page);
    const key = viewport.width + 'x' + viewport.height;

    assert.ok(
      m.scrollWidth <= m.viewportWidth + 1,
      name + ' must not overflow horizontally',
    );
    assert.ok(
      m.scrollHeight <= m.viewportHeight + 1,
      name + ' must remain a one-screen composition',
    );
    assert.deepEqual(m.doorOrder, [
      'work-with-us',
      'profile',
      'systems',
      'writings',
      'learning',
    ]);
    assert.equal(m.legalCount, 3);
    assert.equal(m.footerSeparator, 'none');
    assert.match(m.background, /^radial-gradient\(/);

    assertInside(m.meta, m.viewportWidth, m.viewportHeight, name + ' metadata');
    assertInside(m.brand, m.viewportWidth, m.viewportHeight, name + ' emblem');
    assertInside(
      m.wordmark,
      m.viewportWidth,
      m.viewportHeight,
      name + ' wordmark',
    );
    assertInside(m.scale, m.viewportWidth, m.viewportHeight, name + ' scale');
    assertInside(m.footer, m.viewportWidth, m.viewportHeight, name + ' footer');

    for (const [id, box] of Object.entries(m.doors)) {
      assertInside(box, m.viewportWidth, m.viewportHeight, name + ' ' + id);
    }

    assertNear(
      m.brand.left + m.brand.width / 2,
      viewport.width / 2,
      2,
      name + ' emblem horizontal center',
    );
    assertNear(
      m.wordmark.left + m.wordmark.width / 2,
      viewport.width / 2,
      2,
      name + ' wordmark horizontal center',
    );

    const portrait =
      viewport.height >= viewport.width || viewport.width < 900;

    if (portrait && !(viewport.height < 600 && viewport.width > viewport.height)) {
      assertNear(
        m.labels.profile.top,
        m.labels.systems.top,
        3,
        name + ' first destination row',
      );
      assertNear(
        m.labels.writings.top,
        m.labels.learning.top,
        3,
        name + ' second destination row',
      );
      assertVerticalGap(
        m.scale,
        m.doors.profile,
        24,
        name + ' identity → first destination row',
      );
      assertVerticalGap(
        m.doors.profile,
        m.doors.writings,
        18,
        name + ' destination row separation',
      );
    } else {
      assert.ok(
        m.doors.profile.right < m.brand.left - 16,
        name + ' Profile must remain outside the identity',
      );
      assert.ok(
        m.doors.systems.left > m.brand.right + 16,
        name + ' Systems must remain outside the identity',
      );
      assertVerticalGap(
        m.scale,
        m.doors.writings,
        24,
        name + ' identity → lower orbital destinations',
      );
    }

    const lowerBottom = Math.max(
      m.doors.writings.bottom,
      m.doors.learning.bottom,
    );
    assert.ok(
      m.legalNav.top - lowerBottom >= 12 ||
        m.copyright.top - lowerBottom >= 12,
      name + ' footer must not collide with primary destinations',
    );

    const target = referenceAnchors.get(key);
    if (target) {
      assertNear(
        m.labels['work-with-us'].top,
        target.perspectiveTop,
        target.tolerance,
        name + ' Perspectives anchor',
      );
      assertNear(
        m.brand.top,
        target.brandTop,
        target.tolerance,
        name + ' emblem top',
      );
      assertNear(
        m.brand.width,
        target.brandWidth,
        target.tolerance,
        name + ' emblem size',
      );
      assertNear(
        m.wordmark.top,
        target.wordmarkTop,
        target.tolerance,
        name + ' wordmark anchor',
      );
      assertNear(
        m.labels.profile.top,
        target.profileTop,
        target.tolerance,
        name + ' Profile anchor',
      );
      assertNear(
        m.labels.writings.top,
        target.writingsTop,
        target.tolerance,
        name + ' Writings anchor',
      );
    }

    return m;
  } finally {
    await context.close();
  }
}

async function assertPreviewCorridor(browser, viewport, name) {
  const { context, page } = await loadViewport(browser, viewport);

  try {
    await page
      .locator('.aks-home-door[data-destination="work-with-us"]')
      .hover();
    await page.waitForTimeout(240);

    const m = await measure(page);
    assert.equal(m.previewState, 'active', name + ' preview must activate');
    assert.ok(m.previewOpacity > 0.9, name + ' preview must be visible');
    assertVerticalGap(
      m.scale,
      m.preview,
      8,
      name + ' scale → preview corridor',
    );

    const firstDestinationTop = Math.min(
      m.doors.profile.top,
      m.doors.systems.top,
      m.doors.writings.top,
      m.doors.learning.top,
    );

    assert.ok(
      m.preview.bottom <= firstDestinationTop - 8 ||
        (viewport.width >= 900 &&
          m.preview.bottom <=
            Math.min(m.doors.writings.top, m.doors.learning.top) - 8),
      name + ' preview corridor must not overlap destinations',
    );
  } finally {
    await context.close();
  }
}

async function assertTouchSelection(browser) {
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    hasTouch: true,
    isMobile: true,
  });

  try {
    const page = await context.newPage();
    await page.goto(origin + '/fr');

    const perspective = page.locator(
      '.aks-home-door[data-destination="work-with-us"]',
    );

    await perspective.tap();
    assert.equal(
      new URL(page.url()).pathname,
      '/fr',
      'first tap must not navigate',
    );
    assert.equal(
      await perspective.evaluate((element) =>
        element.classList.contains('is-active'),
      ),
      true,
    );

    const selected = await measure(page);
    assert.equal(selected.previewState, 'active');
    assert.ok(
      selected.preview.bottom <= selected.doors.profile.top - 8,
      '375px touch preview must preserve the first navigation row',
    );

    await perspective.tap();
    await page.waitForURL('**/fr/travailler-ensemble');
  } finally {
    await context.close();
  }
}

async function assertBreakpointContinuity(browser) {
  const samples = [];

  for (const width of [767, 768, 769]) {
    const m = await assertGeometry(
      browser,
      { width, height: 1024 },
      width + '×1024 continuity',
    );
    samples.push(m);
  }

  const values = (selector) => samples.map(selector);
  const spread = (entries) => Math.max(...entries) - Math.min(...entries);

  assert.ok(
    spread(values((sample) => sample.brand.top)) <= 2,
    '767/768/769 emblem top must be continuous',
  );
  assert.ok(
    spread(values((sample) => sample.brand.width)) <= 2,
    '767/768/769 emblem size must be continuous',
  );
  assert.ok(
    spread(values((sample) => sample.labels.profile.top)) <= 2,
    '767/768/769 first navigation row must be continuous',
  );
  assert.ok(
    spread(values((sample) => sample.labels.writings.top)) <= 2,
    '767/768/769 second navigation row must be continuous',
  );
}

async function assertUltrawideCap(browser) {
  const desktop = await assertGeometry(
    browser,
    { width: 1440, height: 1024 },
    'desktop 1440×1024',
  );
  const fullHd = await assertGeometry(
    browser,
    { width: 1920, height: 1080 },
    'desktop 1920×1080',
  );
  const qhd = await assertGeometry(
    browser,
    { width: 2560, height: 1440 },
    'desktop 2560×1440',
  );

  for (const [name, sample] of [
    ['1440', desktop],
    ['1920', fullHd],
    ['2560', qhd],
  ]) {
    assert.ok(
      sample.brand.width >= 280 && sample.brand.width <= 292,
      name + ' emblem must keep the premium desktop scale',
    );

    const profileCenter =
      sample.doors.profile.left + sample.doors.profile.width / 2;
    const sideDistance = sample.viewportWidth / 2 - profileCenter;

    assert.ok(
      sideDistance >= 450 && sideDistance <= 490,
      name + ' orbital side distance must remain capped',
    );
  }
}

async function assertKeyboardOrder(browser) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1024 },
  });

  try {
    const page = await context.newPage();
    await page.goto(origin + '/fr');

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
  const context = await browser.newContext({
    viewport: { width: 430, height: 932 },
    reducedMotion: 'reduce',
  });

  try {
    const page = await context.newPage();
    await page.goto(origin + '/fr');

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
    const matrix = [
      [{ width: 320, height: 568 }, 'mobile 320×568'],
      [{ width: 360, height: 800 }, 'mobile 360×800'],
      [{ width: 375, height: 812 }, 'reference mobile 375×812'],
      [{ width: 390, height: 844 }, 'mobile 390×844'],
      [{ width: 430, height: 932 }, 'reference mobile 430×932'],
      [{ width: 844, height: 390 }, 'mobile landscape 844×390'],
      [{ width: 820, height: 1180 }, 'tablet portrait 820×1180'],
      [{ width: 1024, height: 768 }, 'reference tablet 1024×768'],
      [{ width: 1280, height: 720 }, 'laptop 1280×720'],
      [{ width: 1366, height: 768 }, 'laptop 1366×768'],
      [{ width: 1440, height: 900 }, 'desktop 1440×900'],
    ];

    for (const [viewport, name] of matrix) {
      await assertGeometry(browser, viewport, name);
    }

    await assertBreakpointContinuity(browser);
    await assertUltrawideCap(browser);

    for (const [viewport, name] of [
      [{ width: 375, height: 812 }, '375×812'],
      [{ width: 768, height: 1024 }, '768×1024'],
      [{ width: 1024, height: 768 }, '1024×768'],
      [{ width: 1440, height: 1024 }, '1440×1024'],
    ]) {
      await assertPreviewCorridor(browser, viewport, name);
    }

    await assertTouchSelection(browser);
    await assertKeyboardOrder(browser);
    await assertReducedMotion(browser);

    console.log(
      'Responsive browser smoke passed: source-reference anchors, collision guards, 767/768/769 continuity, ultrawide cap, touch selection and reduced motion are qualified.',
    );
  } finally {
    await browser.close();
    server.kill('SIGTERM');
    await Promise.race([
      new Promise((resolve) => server.once('exit', resolve)),
      sleep(2000),
    ]);
  }
})().catch((error) => {
  console.error(error);
  server.kill('SIGTERM');
  process.exitCode = 1;
});
