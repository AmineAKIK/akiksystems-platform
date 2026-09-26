/* eslint-disable @typescript-eslint/no-require-imports, no-undef */
const { strict: assert } = require('node:assert');
const { randomUUID } = require('node:crypto');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { setTimeout: sleep } = require('node:timers/promises');
const { chromium } = require('playwright');
const { Pool } = require('pg');

const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;

if (!adminEmail || !adminPassword) {
  throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required.');
}

const port = '4179';
const origin = `http://127.0.0.1:${port}`;
const inquiryMarker = randomUUID();
const englishInquiryEmail = `work-with-us-browser-${inquiryMarker}-en@example.invalid`;
const frenchInquiryEmail = `work-with-us-browser-${inquiryMarker}-fr@example.invalid`;
const noJavaScriptInquiryEmail = `work-with-us-browser-${inquiryMarker}-no-js@example.invalid`;
let stderr = '';
const db = new Pool({ connectionString: process.env.DATABASE_URL });

const server = spawn(process.execPath, ['server.js'], {
  cwd: path.join(process.cwd(), 'apps/web'),
  env: {
    ...process.env,
    NODE_ENV: 'test',
    PORT: port,
    BETTER_AUTH_URL: origin,
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

server.stderr.on('data', (chunk) => {
  stderr += chunk.toString();
});

async function waitForServer() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const response = await fetch(`${origin}/en`);
      if (response.ok) return;
    } catch {
      // Server is still starting.
    }
    await sleep(100);
  }

  throw new Error(`Work with us admin smoke server did not become ready. stderr=${stderr}`);
}

function requestCarriesCommand(response, command) {
  const request = response.request();
  const pathname = new URL(response.url()).pathname;
  const body =
    request.postData() ??
    request.postDataBuffer()?.toString('utf8') ??
    '';

  return (
    request.method() === 'POST' &&
    (pathname === '/admin/work-with-us' ||
      pathname === '/admin/work-with-us.data') &&
    new URLSearchParams(body).get('_intent') === command
  );
}

async function submitCommand(page, button, command, expectedMessage) {
  const responsePromise = page.waitForResponse((response) =>
    requestCarriesCommand(response, command),
  );

  await button.click();
  const response = await responsePromise;

  assert.equal(
    response.status(),
    200,
    `Admin command ${command} must succeed without an error boundary.`,
  );

  await page
    .getByText(expectedMessage, { exact: true })
    .waitFor();
}

function requestCarriesInquiryCommand(response, command) {
  const request = response.request();
  const pathname = new URL(response.url()).pathname;
  const body =
    request.postData() ??
    request.postDataBuffer()?.toString('utf8') ??
    '';

  return (
    request.method() === 'POST' &&
    (pathname === '/admin/work-with-us/inquiries' ||
      pathname === '/admin/work-with-us/inquiries.data') &&
    new URLSearchParams(body).get('_intent') === command
  );
}

async function submitInquiryCommand(page, button, command, expectedMessage) {
  const responsePromise = page.waitForResponse((response) =>
    requestCarriesInquiryCommand(response, command),
  );

  await button.click();
  const response = await responsePromise;

  assert.equal(
    response.status(),
    200,
    `Inquiry command ${command} must succeed without an error boundary.`,
  );

  await page.getByText(expectedMessage, { exact: true }).waitFor();
}

function localeCard(page, locale) {
  return page.locator('#admin-work-with-us .aks-admin-card').filter({
    has: page.getByRole('heading', {
      level: 3,
      name: locale === 'en' ? 'English' : 'Français',
      exact: true,
    }),
  });
}

async function fillCommercialDraft(card, copy) {
  await card.locator('input[name="heroTitle"]').fill(copy.heroTitle);
  await card
    .locator('textarea[name="heroIntroduction"]')
    .fill(copy.heroIntroduction);
  await card.locator('input[name="approachTitle"]').fill(copy.approachTitle);
  await card
    .locator('input[name="approach_understand_title"]')
    .fill(copy.understandTitle);
  await card
    .locator('textarea[name="approach_understand_body"]')
    .fill(copy.understandBody);
  await card
    .locator('input[name="approach_structure_title"]')
    .fill(copy.structureTitle);
  await card
    .locator('textarea[name="approach_structure_body"]')
    .fill(copy.structureBody);
  await card
    .locator('input[name="approach_build_title"]')
    .fill(copy.buildTitle);
  await card
    .locator('textarea[name="approach_build_body"]')
    .fill(copy.buildBody);
  await card.locator('input[name="contactTitle"]').fill(copy.contactTitle);
  await card.locator('input[name="contactNameLabel"]').fill(copy.contactNameLabel);
  await card.locator('input[name="contactEmailLabel"]').fill(copy.contactEmailLabel);
  await card
    .locator('input[name="contactOrganizationLabel"]')
    .fill(copy.contactOrganizationLabel);
  await card
    .locator('input[name="contactMessageLabel"]')
    .fill(copy.contactMessageLabel);
  await card
    .locator('textarea[name="contactMessagePlaceholder"]')
    .fill(copy.contactMessagePlaceholder);
  await card
    .locator('input[name="contactListenLabel"]')
    .fill(copy.contactListenLabel);
  await card
    .locator('input[name="contactSubmitLabel"]')
    .fill(copy.contactSubmitLabel);
  await card
    .locator('textarea[name="contactSuccessMessage"]')
    .fill(copy.contactSuccessMessage);
  await card
    .locator('textarea[name="contactPrivacyNote"]')
    .fill(copy.contactPrivacyNote);
  await card.locator('input[name="aboutTitle"]').fill(copy.aboutTitle);
  await card
    .locator('input[name="aboutProfileLinkLabel"]')
    .fill(copy.aboutProfileLinkLabel);
  await card.locator('input[name="systemsTitle"]').fill(copy.systemsTitle);
}

async function assertPersisted(card, copy) {
  assert.equal(
    await card.locator('input[name="heroTitle"]').inputValue(),
    copy.heroTitle,
  );
  assert.equal(
    await card.locator('textarea[name="heroIntroduction"]').inputValue(),
    copy.heroIntroduction,
  );
  assert.equal(
    await card.locator('input[name="approachTitle"]').inputValue(),
    copy.approachTitle,
  );
  assert.equal(
    await card.locator('input[name="approach_understand_title"]').inputValue(),
    copy.understandTitle,
  );
  assert.equal(
    await card.locator('input[name="approach_build_title"]').inputValue(),
    copy.buildTitle,
  );
  assert.equal(
    await card.locator('input[name="contactTitle"]').inputValue(),
    copy.contactTitle,
  );
  assert.equal(
    await card.locator('input[name="contactNameLabel"]').inputValue(),
    copy.contactNameLabel,
  );
  assert.equal(
    await card.locator('input[name="contactListenLabel"]').inputValue(),
    copy.contactListenLabel,
  );
  assert.equal(
    await card.locator('input[name="contactSubmitLabel"]').inputValue(),
    copy.contactSubmitLabel,
  );
  assert.equal(
    await card.locator('input[name="aboutTitle"]').inputValue(),
    copy.aboutTitle,
  );
  assert.equal(
    await card.locator('input[name="aboutProfileLinkLabel"]').inputValue(),
    copy.aboutProfileLinkLabel,
  );
  assert.equal(
    await card.locator('input[name="systemsTitle"]').inputValue(),
    copy.systemsTitle,
  );
}

async function assertPublishedSnapshotVersion(locale, copy) {
  const result = await db.query(
    'select snapshot from work_with_us_publications where locale = $1',
    [locale],
  );
  assert.equal(result.rowCount, 1);
  const snapshot = result.rows[0].snapshot;
  assert.equal(
    snapshot.version,
    2,
    `${locale.toUpperCase()} Work with us publication must use snapshot v2.`,
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(snapshot, 'legacy'),
    false,
    'Work with us v2 snapshots must not carry a legacy compatibility payload.',
  );
  assert.equal(snapshot.hero.title, copy.heroTitle);
  assert.equal(snapshot.approach.title, copy.approachTitle);
  assert.equal(snapshot.contact.title, copy.contactTitle);
  assert.equal(snapshot.contact.nameLabel, copy.contactNameLabel);
  assert.equal(snapshot.contact.emailLabel, copy.contactEmailLabel);
  assert.equal(snapshot.contact.organizationLabel, copy.contactOrganizationLabel);
  assert.equal(snapshot.contact.messageLabel, copy.contactMessageLabel);
  assert.equal(snapshot.contact.listenLabel, copy.contactListenLabel);
  assert.equal(snapshot.contact.submitLabel, copy.contactSubmitLabel);
  assert.equal(snapshot.contact.successMessage, copy.contactSuccessMessage);
  assert.equal(snapshot.about.title, copy.aboutTitle);
  assert.equal(snapshot.about.profileLinkLabel, copy.aboutProfileLinkLabel);
  assert.equal(snapshot.systems.title, copy.systemsTitle);
}

async function assertPublicCopy(
  page,
  pathName,
  copy,
  viewport = { width: 1280, height: 800 },
) {
  await page.setViewportSize(viewport);
  const response = await page.goto(origin + pathName);
  assert.equal(response?.status(), 200);
  await page
    .getByRole('heading', { level: 1, name: copy.heroTitle, exact: true })
    .waitFor();
  await page.getByText(copy.heroIntroduction, { exact: true }).waitFor();
  await page.getByText(copy.approachTitle, { exact: true }).waitFor();
  await page.getByText(copy.understandTitle, { exact: true }).waitFor();
  await page.getByText(copy.structureTitle, { exact: true }).waitFor();
  await page.getByText(copy.buildTitle, { exact: true }).waitFor();
  await page.getByText(copy.contactTitle, { exact: true }).waitFor();
  await page.getByText(copy.aboutTitle, { exact: true }).waitFor();

  const renderer = page.locator('.aks-work-with-us');
  await renderer.waitFor();
  assert.equal(
    await renderer.locator('.aks-work-with-us-approach-step').count(),
    3,
    'Work with us must keep exactly three structural approach steps.',
  );
  assert.equal(
    await renderer.locator('.aks-work-with-us-brand-mark').count(),
    1,
    'The renderer must show exactly one AkikSystems brand mark in the hero.',
  );
  assert.equal(
    await renderer.locator('.aks-work-with-us-spiral-field').count(),
    0,
    'The retired hero spiral must not return.',
  );
  assert.equal(
    await renderer.locator('.aks-work-with-us-approach-glyph-frame').count(),
    0,
    'Approach icons must not use the retired decorative circle frames.',
  );
  const brandTreatment = await renderer
    .locator('.aks-work-with-us-brand-field')
    .evaluate((field) => {
      const mark = field.querySelector('.aks-work-with-us-brand-mark');
      return {
        beforeContent: getComputedStyle(field, '::before').content,
        markFilter:
          mark instanceof HTMLElement ? getComputedStyle(mark).filter : null,
      };
    });
  assert.equal(
    brandTreatment.beforeContent,
    'none',
    'The hero brand must not render a synthetic halo behind the logo.',
  );
  assert.doesNotMatch(
    brandTreatment.markFilter ?? '',
    /drop-shadow/i,
    'The hero brand must not add a drop-shadow halo to the logo.',
  );
  assert.equal(
    await renderer.locator('.aks-admin-card').count(),
    0,
    'The public Work with us renderer must not reuse administration-card layout.',
  );
  assert.equal(
    await renderer.locator('form.aks-work-with-us-inquiry-form').count(),
    1,
    'Step 5 must expose exactly one inquiry form backed by a public route action.',
  );
  const playbackButton = renderer.getByRole('button', {
    name: copy.contactListenLabel,
    exact: true,
  });
  await playbackButton.waitFor();
  assert.equal(
    await playbackButton.count(),
    1,
    'Speech playback must progressively enhance the message field when the browser supports it.',
  );
  assert.equal(
    await renderer.locator('input[name="name"]').getAttribute('maxlength'),
    '120',
  );
  assert.equal(
    await renderer.locator('input[name="email"]').getAttribute('maxlength'),
    '254',
  );
  assert.equal(
    await renderer.locator('input[name="organization"]').getAttribute('maxlength'),
    '160',
  );
  assert.equal(
    await renderer.locator('textarea[name="message"]').getAttribute('maxlength'),
    '5000',
  );

  const sectionTops = await page.evaluate(() =>
    [
      '.aks-work-with-us-hero',
      '.aks-work-with-us-approach',
      '.aks-work-with-us-contact',
      '.aks-work-with-us-about',
      '.aks-work-with-us-systems',
    ].map((selector) => {
      const element = document.querySelector(selector);
      if (!(element instanceof HTMLElement)) return null;
      return element.getBoundingClientRect().top + window.scrollY;
    }),
  );
  assert.equal(
    sectionTops.every((value) => typeof value === 'number'),
    true,
    'Every Work with us section must be present in the validated order.',
  );
  for (let index = 1; index < sectionTops.length; index += 1) {
    assert.ok(
      sectionTops[index] > sectionTops[index - 1],
      'Work with us sections must preserve hero → approach → contact → about → Systems order.',
    );
  }

  const horizontalGeometry = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    page: document.documentElement.scrollWidth,
  }));
  assert.ok(
    horizontalGeometry.page <= horizontalGeometry.viewport + 1,
    `Work with us must not overflow horizontally at ${viewport.width}×${viewport.height}.`,
  );

  const inquiry = renderer.locator('form.aks-work-with-us-inquiry-form');
  const email = copy.inquiryEmail;

  await inquiry.locator('input[name="name"]').fill('');
  await inquiry.locator('input[name="email"]').fill('invalid-email');
  await inquiry.locator('textarea[name="message"]').fill('');

  const invalidResponsePromise = page.waitForResponse((candidate) => {
    const request = candidate.request();
    const pathname = new URL(candidate.url()).pathname;
    return request.method() === 'POST' && pathname.startsWith(pathName);
  });
  await inquiry.getByRole('button', { name: copy.contactSubmitLabel, exact: true }).click();
  const invalidResponse = await invalidResponsePromise;
  assert.equal(
    invalidResponse.status(),
    422,
    'Invalid inquiry input must be rejected by the server boundary.',
  );
  await page.getByText(copy.validationMessage, { exact: true }).waitFor();

  const invalidPersisted = await db.query(
    'select count(*)::int as count from work_with_us_inquiries where email = $1',
    ['invalid-email'],
  );
  assert.equal(
    invalidPersisted.rows[0].count,
    0,
    'Rejected inquiry input must never reach durable storage.',
  );

  const activeForm = renderer.locator('form.aks-work-with-us-inquiry-form');
  await activeForm.locator('input[name="name"]').fill(copy.inquiryName);
  await activeForm.locator('input[name="email"]').fill(email);
  await activeForm
    .locator('input[name="organization"]')
    .fill(copy.inquiryOrganization);
  await activeForm.locator('textarea[name="message"]').fill(copy.inquiryMessage);

  const speechBeforeSubmit = await page.evaluate(() => window.__aksSpeechTest);
  await playbackButton.click();
  await page.waitForFunction(() => window.__aksSpeechTest.spoken.length === 1);

  const speechAfterPlayback = await page.evaluate(() => window.__aksSpeechTest);
  assert.equal(
    speechAfterPlayback.spoken.at(-1)?.text,
    copy.inquiryMessage,
    'Speech playback must read only the free-form message field.',
  );
  assert.equal(
    speechAfterPlayback.spoken.at(-1)?.lang,
    copy.playbackLanguage,
    'Speech playback must use the active Work with us locale.',
  );
  assert.equal(
    await playbackButton.getAttribute('aria-pressed'),
    'true',
    'The playback control must expose its active state accessibly.',
  );

  const acceptedResponsePromise = page.waitForResponse((candidate) => {
    const request = candidate.request();
    const pathname = new URL(candidate.url()).pathname;
    return request.method() === 'POST' && pathname.startsWith(pathName);
  });
  await activeForm
    .getByRole('button', { name: copy.contactSubmitLabel, exact: true })
    .click();
  const acceptedResponse = await acceptedResponsePromise;
  assert.equal(
    acceptedResponse.status(),
    200,
    'A valid inquiry must cross the public action boundary successfully.',
  );
  await page.getByText(copy.contactSuccessMessage, { exact: true }).waitFor();

  const speechAfterSubmit = await page.evaluate(() => window.__aksSpeechTest);
  assert.ok(
    speechAfterSubmit.cancelCount > speechBeforeSubmit.cancelCount,
    'Submitting the inquiry must stop active speech playback.',
  );

  const persisted = await db.query(
    `select locale, name, email, organization, message
       from work_with_us_inquiries
       where email = $1`,
    [email],
  );
  assert.equal(persisted.rowCount, 1);
  assert.equal(persisted.rows[0].locale, copy.locale);
  assert.equal(persisted.rows[0].name, copy.inquiryName);
  assert.equal(persisted.rows[0].email, email);
  assert.equal(persisted.rows[0].organization, copy.inquiryOrganization);
  assert.equal(persisted.rows[0].message, copy.inquiryMessage);

  assert.equal(
    await renderer.locator('input[name="name"]').inputValue(),
    '',
    'A successful inquiry must rotate its token and reset entered values.',
  );

  const navigationMessage = `Navigation playback ${copy.locale}`;
  await renderer.locator('textarea[name="message"]').fill(navigationMessage);
  const refreshedPlaybackButton = renderer.getByRole('button', {
    name: copy.contactListenLabel,
    exact: true,
  });
  await refreshedPlaybackButton.click();
  await page.waitForFunction(
    (expected) => window.__aksSpeechTest.spoken.at(-1)?.text === expected,
    navigationMessage,
  );
  const cancelCountBeforeNavigation = await page.evaluate(
    () => window.__aksSpeechTest.cancelCount,
  );

  await renderer
    .getByRole('link', { name: copy.aboutProfileLinkLabel, exact: true })
    .click();
  await page.waitForURL(origin + copy.profilePath);

  const cancelCountAfterNavigation = await page.evaluate(
    () => window.__aksSpeechTest.cancelCount,
  );
  assert.ok(
    cancelCountAfterNavigation > cancelCountBeforeNavigation,
    'Navigating away from Work with us must stop active speech playback.',
  );
}

async function assertBackgroundContinuity(page, pathName) {
  const homeResponse = await page.goto(origin + '/en');
  assert.equal(homeResponse?.status(), 200);
  await page.locator(".aks-experience-frame[data-home='true']").waitFor();

  const homeBackground = await page
    .locator(".aks-experience-frame[data-home='true']")
    .evaluate((element) => getComputedStyle(element).backgroundImage);

  const workResponse = await page.goto(origin + pathName);
  assert.equal(workResponse?.status(), 200);
  await page.locator('.aks-work-with-us').waitFor();

  const canvas = await page.evaluate(() => {
    const selectors = [
      '.aks-work-with-us-hero',
      '.aks-work-with-us-approach',
      '.aks-work-with-us-contact',
      '.aks-work-with-us-about',
      '.aks-work-with-us-systems',
    ];

    const sections = selectors.map((selector) => {
      const element = document.querySelector(selector);
      if (!(element instanceof HTMLElement)) return null;

      const style = getComputedStyle(element);
      const after = getComputedStyle(element, '::after');
      const rect = element.getBoundingClientRect();

      return {
        selector,
        sectionWidth: rect.width,
        usesCanonicalSeparator: element.classList.contains(
          'aks-section-separator-after',
        ),
        backgroundImage: style.backgroundImage,
        backgroundColor: style.backgroundColor,
        borderTopWidth: style.borderTopWidth,
        borderBottomWidth: style.borderBottomWidth,
        separator: {
          content: after.content,
          backgroundImage: after.backgroundImage,
          width: Number.parseFloat(after.width),
          height: Number.parseFloat(after.height),
          opacity: Number.parseFloat(after.opacity),
        },
      };
    });

    const approach = document.querySelector('.aks-work-with-us-approach');
    const approachBefore =
      approach instanceof HTMLElement
        ? getComputedStyle(approach, '::before')
        : null;

    const shell = document.querySelector('.aks-experience-shell');
    const frame = document.querySelector('.aks-experience-frame');
    const page = document.querySelector('.aks-work-with-us');
    const footer = document.querySelector('.aks-experience-footer');
    const footerInner = footer?.querySelector('.aks-experience-footer-inner');
    const footerLink = footer?.querySelector('nav a');

    const bodyStyle = getComputedStyle(document.body);
    const shellStyle =
      shell instanceof HTMLElement ? getComputedStyle(shell) : null;
    const frameStyle =
      frame instanceof HTMLElement ? getComputedStyle(frame) : null;
    const pageStyle =
      page instanceof HTMLElement ? getComputedStyle(page) : null;
    const footerStyle =
      footer instanceof HTMLElement ? getComputedStyle(footer) : null;
    const footerInnerStyle =
      footerInner instanceof HTMLElement ? getComputedStyle(footerInner) : null;
    const footerLinkStyle =
      footerLink instanceof HTMLElement ? getComputedStyle(footerLink) : null;

    return {
      canvas: {
        bodyBackgroundImage: bodyStyle.backgroundImage,
        frameBackgroundImage: frameStyle?.backgroundImage ?? null,
        frameBackgroundColor: frameStyle?.backgroundColor ?? null,
        pageBackgroundImage: pageStyle?.backgroundImage ?? null,
        pageBackgroundColor: pageStyle?.backgroundColor ?? null,
      },
      sections,
      approachBefore:
        approachBefore === null
          ? null
          : {
              content: approachBefore.content,
              backgroundImage: approachBefore.backgroundImage,
            },
      chrome: {
        shellUsesCanonicalSeparator:
          shell instanceof HTMLElement &&
          shell.classList.contains('aks-section-separator-after'),
        shellBorderBottomWidth: shellStyle?.borderBottomWidth ?? null,
        shellBackgroundImage: shellStyle?.backgroundImage ?? null,
        shellBackgroundColor: shellStyle?.backgroundColor ?? null,
        shellBackdropFilter: shellStyle?.backdropFilter ?? null,
        footerUsesCanonicalSeparator:
          footer instanceof HTMLElement &&
          footer.classList.contains('aks-section-separator-before'),
        footerBackgroundColor: footerStyle?.backgroundColor ?? null,
        footerInnerDisplay: footerInnerStyle?.display ?? null,
        footerLinkDecoration: footerLinkStyle?.textDecorationLine ?? null,
      },
    };
  });

  assert.equal(
    canvas.canvas.bodyBackgroundImage,
    homeBackground,
    'Work with us must paint the Home-derived gradient once on the document canvas.',
  );
  assert.equal(
    canvas.canvas.frameBackgroundImage,
    'none',
    'The Work with us frame must not restart the gradient.',
  );
  assert.equal(
    canvas.canvas.frameBackgroundColor,
    'rgba(0, 0, 0, 0)',
    'The Work with us frame must stay transparent over the document canvas.',
  );
  assert.equal(
    canvas.canvas.pageBackgroundImage,
    'none',
    'The Work with us page must not restart the gradient.',
  );
  assert.equal(
    canvas.canvas.pageBackgroundColor,
    'rgba(0, 0, 0, 0)',
    'The Work with us page must stay transparent over the document canvas.',
  );
  assert.equal(
    canvas.chrome.shellUsesCanonicalSeparator,
    true,
    'Shared navigation must use the canonical soft separator.',
  );
  assert.equal(
    canvas.chrome.shellBorderBottomWidth,
    '0px',
    'Shared navigation must not fall back to a hard structural border.',
  );
  assert.equal(
    canvas.chrome.shellBackgroundImage,
    'none',
    'Shared navigation must not paint a second copy of the background gradient.',
  );
  assert.equal(
    canvas.chrome.shellBackgroundColor,
    'rgba(0, 0, 0, 0)',
    'Shared navigation must remain transparent over the single document canvas.',
  );
  assert.equal(
    canvas.chrome.shellBackdropFilter,
    'none',
    'Shared navigation must not introduce a separate translucent backdrop on Work with us.',
  );
  assert.equal(
    canvas.chrome.footerUsesCanonicalSeparator,
    true,
    'Shared footer must use the canonical soft separator.',
  );
  assert.equal(
    canvas.chrome.footerBackgroundColor,
    'rgba(0, 0, 0, 0)',
    'Shared footer must stay transparent over the continuous Work with us background.',
  );
  assert.equal(
    canvas.chrome.footerInnerDisplay,
    'grid',
    'Shared footer must use the Home footer composition.',
  );
  assert.equal(
    canvas.chrome.footerLinkDecoration,
    'none',
    'Shared footer legal links must keep the Home footer treatment.',
  );

  for (const section of canvas.sections) {
    assert.ok(section, 'Every Work with us release section must exist.');
    assert.equal(
      section.backgroundImage,
      'none',
      `${section.selector} must not paint a local background over the shared canvas.`,
    );
    assert.equal(
      section.backgroundColor,
      'rgba(0, 0, 0, 0)',
      `${section.selector} must stay transparent over the shared canvas.`,
    );
    assert.equal(
      section.borderTopWidth,
      '0px',
      `${section.selector} must not introduce a full-width top separator.`,
    );
    assert.equal(
      section.borderBottomWidth,
      '0px',
      `${section.selector} must not introduce a structural full-width bottom border.`,
    );

    if (section.selector === '.aks-work-with-us-systems') {
      assert.equal(
        section.usesCanonicalSeparator,
        false,
        'The final Systems section must not opt into a trailing section separator.',
      );
      assert.equal(
        section.separator.content,
        'none',
        'The final Systems section must not render a trailing separator.',
      );
      continue;
    }

    assert.equal(
      section.usesCanonicalSeparator,
      true,
      `${section.selector} must use the canonical application section separator primitive.`,
    );

    assert.notEqual(
      section.separator.content,
      'none',
      `${section.selector} must retain a soft visual separator.`,
    );
    assert.match(
      section.separator.backgroundImage,
      /^linear-gradient\(/,
      `${section.selector} separator must fade through a gradient instead of using a hard border.`,
    );
    assert.ok(
      section.separator.width < section.sectionWidth,
      `${section.selector} separator must remain narrower than the section so the canvas is not visually sliced edge-to-edge.`,
    );
    assert.ok(
      section.separator.height <= 1,
      `${section.selector} separator must remain hairline-thin.`,
    );
    assert.ok(
      section.separator.opacity <= 1,
      `${section.selector} separator opacity must stay controlled.`,
    );
  }

  assert.ok(
    canvas.approachBefore,
    'The Approach pseudo-element must remain inspectable.',
  );
  assert.equal(
    canvas.approachBefore.backgroundImage,
    'none',
    'Approach must not reintroduce a section-local radial glow.',
  );
  assert.equal(
    canvas.approachBefore.content,
    'none',
    'Approach must not create a full-section overlay pseudo-element.',
  );
}

async function assertNoJavaScriptInquiry(browser, copy, pathName) {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();

  try {
    const response = await page.goto(origin + pathName);
    assert.equal(response?.status(), 200);

    const form = page.locator('form.aks-work-with-us-inquiry-form');
    await form.waitFor();

    assert.equal(
      await form.getByRole('button', { name: copy.contactListenLabel }).count(),
      0,
      'Speech playback must disappear completely when JavaScript is unavailable.',
    );

    await form.locator('input[name="name"]').fill('No JavaScript inquiry');
    await form.locator('input[name="email"]').fill(noJavaScriptInquiryEmail);
    await form.locator('textarea[name="message"]').fill(
      'The message field and submission path remain functional without JavaScript.',
    );

    const navigationPromise = page.waitForNavigation();
    await form
      .getByRole('button', { name: copy.contactSubmitLabel, exact: true })
      .click();
    const navigation = await navigationPromise;
    assert.equal(
      navigation?.status(),
      200,
      'The inquiry form must remain a working HTML form without JavaScript.',
    );

    await page.getByText(copy.contactSuccessMessage, { exact: true }).waitFor();

    const persisted = await db.query(
      'select count(*)::int as count from work_with_us_inquiries where email = $1',
      [noJavaScriptInquiryEmail],
    );
    assert.equal(
      persisted.rows[0].count,
      1,
      'A no-JavaScript inquiry must still reach durable storage.',
    );
  } finally {
    await context.close();
  }
}


function assertHorizontalRectInsideViewport(rect, viewportWidth, label) {
  assert.ok(rect, `${label} must be measurable.`);
  assert.ok(
    rect.width > 0,
    `${label} must keep a positive rendered width.`,
  );
  assert.ok(
    rect.left >= -1 && rect.right <= viewportWidth + 1,
    `${label} must stay inside the horizontal viewport (left=${rect.left}, right=${rect.right}, viewport=${viewportWidth}).`,
  );
}

async function assertWorkWithUsViewport(page, pathName, copy, viewport, label) {
  await page.setViewportSize(viewport);
  const response = await page.goto(origin + pathName);
  assert.equal(response?.status(), 200, `${label} must return HTTP 200.`);
  await page.locator('.aks-work-with-us').waitFor();
  await page
    .getByRole('button', { name: copy.contactListenLabel, exact: true })
    .waitFor();
  await page.evaluate(() => document.fonts.ready.then(() => true));
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));

  const measurement = await page.evaluate(() => {
    function rect(selector) {
      const element = document.querySelector(selector);
      if (!(element instanceof HTMLElement)) return null;
      const box = element.getBoundingClientRect();
      return {
        left: box.left,
        right: box.right,
        top: box.top,
        bottom: box.bottom,
        width: box.width,
        height: box.height,
      };
    }

    function rects(selector) {
      return [...document.querySelectorAll(selector)]
        .filter((element) => element instanceof HTMLElement)
        .map((element) => {
          const box = element.getBoundingClientRect();
          return {
            left: box.left,
            right: box.right,
            top: box.top,
            bottom: box.bottom,
            width: box.width,
            height: box.height,
          };
        });
    }

    function columnCount(selector) {
      const element = document.querySelector(selector);
      if (!(element instanceof HTMLElement)) return null;
      return getComputedStyle(element).gridTemplateColumns
        .split(/\s+/)
        .filter(Boolean).length;
    }

    return {
      viewportWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      h1Count: document.querySelectorAll('.aks-work-with-us h1').length,
      brandAriaHidden:
        document
          .querySelector('.aks-work-with-us-brand-field')
          ?.getAttribute('aria-hidden') === 'true',
      brandMarkCount: document.querySelectorAll(
        '.aks-work-with-us-brand-mark',
      ).length,
      retiredSpiralCount: document.querySelectorAll(
        '.aks-work-with-us-spiral-field',
      ).length,
      stepIndexCount: document.querySelectorAll(
        '.aks-work-with-us-step-index',
      ).length,
      playbackChildElementCount:
        document.querySelector('.aks-work-with-us-message-playback')
          ?.children.length ?? 0,
      glyphsAriaHidden: [...document.querySelectorAll('.aks-work-with-us-approach-glyph')].every(
        (element) => element.getAttribute('aria-hidden') === 'true',
      ),
      approachGlyphStyles: [
        ...document.querySelectorAll('.aks-work-with-us-approach-glyph'),
      ].map((element) => {
        const style = getComputedStyle(element);
        const box = element.getBoundingClientRect();
        return {
          width: box.width,
          height: box.height,
          borderRadius: style.borderRadius,
        };
      }),
      approachConnectors: [
        ...document.querySelectorAll('.aks-work-with-us-approach-step'),
      ]
        .slice(0, 2)
        .map((element) => {
          const line = getComputedStyle(element, '::after');
          return {
            content: line.content,
            width: Number.parseFloat(line.width),
            height: Number.parseFloat(line.height),
          };
        }),
      approachTitleRects: rects(
        '.aks-work-with-us-step-copy .aks-heading',
      ),
      approachBodyRects: rects(
        '.aks-work-with-us-step-copy .aks-text',
      ),
      heroColumns: columnCount('.aks-work-with-us-hero-layout'),
      approachColumns: columnCount('.aks-work-with-us-approach-steps'),
      contactColumns: columnCount('.aks-work-with-us-contact-layout'),
      inquiryColumns: columnCount('.aks-work-with-us-inquiry-fields'),
      aboutColumns: columnCount('.aks-work-with-us-about-layout'),
      importantRects: {
        heroCopy: rect('.aks-work-with-us-hero-copy'),
        brandField: rect('.aks-work-with-us-brand-field'),
        approachHeading: rect('.aks-work-with-us-approach-heading'),
        contactCopy: rect('.aks-work-with-us-contact-copy'),
        inquiryForm: rect('.aks-work-with-us-inquiry-form'),
        about: rect('.aks-work-with-us-about-layout'),
        systemsHeading: rect('.aks-work-with-us-systems-heading'),
      },
      approachStepRects: rects('.aks-work-with-us-approach-step'),
      fieldRects: rects(
        '.aks-work-with-us-inquiry-field input:not([name="faxNumber"]), .aks-work-with-us-inquiry-field textarea',
      ),
      actionRects: rects(
        '.aks-work-with-us-message-playback, .aks-work-with-us-inquiry-submit',
      ),
      honeypotTabIndex: document
        .querySelector('input[name="faxNumber"]')
        ?.getAttribute('tabindex'),
    };
  });

  assert.ok(
    measurement.scrollWidth <= measurement.viewportWidth + 1,
    `${label} must not create document-level horizontal overflow.`,
  );
  assert.ok(
    measurement.bodyScrollWidth <= measurement.viewportWidth + 1,
    `${label} body must not overflow horizontally.`,
  );
  assert.equal(measurement.h1Count, 1, `${label} must keep exactly one page heading.`);
  assert.equal(
    measurement.brandAriaHidden,
    true,
    `${label} hero brand decoration must stay outside the accessibility tree.`,
  );
  assert.equal(
    measurement.brandMarkCount,
    1,
    `${label} hero must keep exactly one AkikSystems brand mark.`,
  );
  assert.equal(
    measurement.retiredSpiralCount,
    0,
    `${label} must not reintroduce the retired hero spiral.`,
  );
  assert.equal(
    measurement.stepIndexCount,
    0,
    `${label} approach must not reintroduce arbitrary numeric markers.`,
  );
  assert.equal(
    measurement.playbackChildElementCount,
    0,
    `${label} playback button must render only its admin-authored text with no decorative child marker.`,
  );
  assert.equal(
    measurement.glyphsAriaHidden,
    true,
    `${label} approach glyphs must stay decorative.`,
  );
  assert.equal(
    measurement.approachStepRects.length,
    3,
    `${label} must render the three code-owned approach steps.`,
  );
  assert.equal(
    measurement.approachGlyphStyles.length,
    3,
    `${label} must render exactly three approach glyph nodes.`,
  );
  for (const [index, glyph] of measurement.approachGlyphStyles.entries()) {
    assert.ok(
      Math.abs(glyph.width - glyph.height) <= 1,
      `${label} approach glyph ${index + 1} must keep a square node footprint.`,
    );
    assert.equal(
      glyph.borderRadius,
      '50%',
      `${label} approach glyph ${index + 1} must use the circular process-node treatment instead of a card.`,
    );
  }
  assert.equal(
    measurement.honeypotTabIndex,
    '-1',
    `${label} anti-abuse honeypot must remain outside keyboard navigation.`,
  );

  for (const [name, box] of Object.entries(measurement.importantRects)) {
    assertHorizontalRectInsideViewport(
      box,
      measurement.viewportWidth,
      `${label} ${name}`,
    );
  }
  for (const [index, box] of measurement.approachStepRects.entries()) {
    assertHorizontalRectInsideViewport(
      box,
      measurement.viewportWidth,
      `${label} approach step ${index + 1}`,
    );
  }
  for (const [index, box] of measurement.fieldRects.entries()) {
    assertHorizontalRectInsideViewport(
      box,
      measurement.viewportWidth,
      `${label} form field ${index + 1}`,
    );
  }

  if (viewport.width <= 430) {
    assert.equal(measurement.heroColumns, 1, `${label} hero must reflow to one column.`);
    assert.equal(
      measurement.approachColumns,
      1,
      `${label} approach steps must reflow to one column.`,
    );
    assert.equal(
      measurement.contactColumns,
      1,
      `${label} contact section must reflow to one column.`,
    );
    assert.equal(
      measurement.inquiryColumns,
      1,
      `${label} inquiry fields must reflow to one column.`,
    );
    assert.equal(
      measurement.aboutColumns,
      1,
      `${label} About section must reflow to one column.`,
    );

    for (const [index, box] of measurement.fieldRects.entries()) {
      assert.ok(
        box.height >= 44,
        `${label} form field ${index + 1} must keep at least a 44px touch target.`,
      );
    }
    for (const [index, box] of measurement.actionRects.entries()) {
      assert.ok(
        box.height >= 44,
        `${label} form action ${index + 1} must keep at least a 44px touch target.`,
      );
      assertHorizontalRectInsideViewport(
        box,
        measurement.viewportWidth,
        `${label} form action ${index + 1}`,
      );
    }
  } else if (viewport.width >= 1200) {
    assert.equal(
      measurement.approachConnectors.length,
      2,
      `${label} desktop approach must connect the three process nodes with exactly two rail segments.`,
    );
    for (const [index, connector] of measurement.approachConnectors.entries()) {
      assert.notEqual(
        connector.content,
        'none',
        `${label} process rail ${index + 1} must render.`,
      );
      assert.ok(
        connector.width > 20 && connector.height <= 1.5,
        `${label} process rail ${index + 1} must stay a restrained horizontal connector.`,
      );
    }

    const titleTops = measurement.approachTitleRects.map((box) => box.top);
    const bodyTops = measurement.approachBodyRects.map((box) => box.top);
    assert.ok(
      Math.max(...titleTops) - Math.min(...titleTops) <= 1,
      `${label} approach titles must share the same top baseline.`,
    );
    assert.ok(
      Math.max(...bodyTops) - Math.min(...bodyTops) <= 2,
      `${label} approach bodies must start on the same baseline.`,
    );

    assert.equal(measurement.heroColumns, 2, `${label} hero must preserve its two-column composition.`);
    assert.equal(
      measurement.approachColumns,
      3,
      `${label} approach must preserve its three-column focal sequence.`,
    );
    assert.equal(
      measurement.contactColumns,
      2,
      `${label} contact section must preserve its two-column composition.`,
    );
    assert.equal(
      measurement.inquiryColumns,
      2,
      `${label} inquiry fields must preserve their desktop two-column grid.`,
    );
  }

  await page
    .getByRole('heading', { level: 1, name: copy.heroTitle, exact: true })
    .waitFor();
}

async function activeElementIdentity(page) {
  return page.evaluate(() => {
    const active = document.activeElement;
    if (!(active instanceof HTMLElement)) return null;
    return {
      tag: active.tagName.toLowerCase(),
      name: active.getAttribute('name'),
      className: active.className,
      ariaLabel: active.getAttribute('aria-label'),
      text: active.textContent?.trim() ?? '',
    };
  });
}

async function assertKeyboardAccessibility(page, pathName, copy) {
  await page.setViewportSize({ width: 1280, height: 900 });
  const response = await page.goto(origin + pathName);
  assert.equal(response?.status(), 200);
  const form = page.locator('form.aks-work-with-us-inquiry-form');
  await form.waitFor();
  await page
    .getByRole('button', { name: copy.contactListenLabel, exact: true })
    .waitFor();

  for (const label of [
    copy.contactNameLabel,
    copy.contactEmailLabel,
    copy.contactOrganizationLabel,
    copy.contactMessageLabel,
  ]) {
    assert.equal(
      await page.getByLabel(label, { exact: true }).count(),
      1,
      `Work with us field “${label}” must expose one accessible label.`,
    );
  }

  const semantic = await page.evaluate(() => {
    const labelledSections = [...document.querySelectorAll('.aks-work-with-us section[aria-labelledby]')];
    const missingSectionLabels = labelledSections
      .map((section) => section.getAttribute('aria-labelledby'))
      .filter(
        (id) =>
          id === null ||
          document.getElementById(id) === null ||
          document.getElementById(id)?.textContent?.trim() === '',
      );

    const positiveTabIndexes = [...document.querySelectorAll('.aks-work-with-us [tabindex]')]
      .filter((element) => Number(element.getAttribute('tabindex')) > 0)
      .length;

    const controls = [
      'input[name="name"]',
      'input[name="email"]',
      'input[name="organization"]',
      'textarea[name="message"]',
    ];

    return {
      missingSectionLabels,
      positiveTabIndexes,
      allControlsLabelled: controls.every((selector) => {
        const control = document.querySelector(selector);
        return (
          control instanceof HTMLInputElement ||
          control instanceof HTMLTextAreaElement
        )
          ? control.labels !== null && control.labels.length === 1
          : false;
      }),
    };
  });

  assert.deepEqual(
    semantic.missingSectionLabels,
    [],
    'Every aria-labelledby Work with us section must reference a real visible heading.',
  );
  assert.equal(
    semantic.positiveTabIndexes,
    0,
    'Work with us must not manufacture a positive tabindex order.',
  );
  assert.equal(
    semantic.allControlsLabelled,
    true,
    'Every inquiry control must retain a native label association.',
  );

  const name = form.locator('input[name="name"]');

  let active = await activeElementIdentity(page);
  let reachedName = active?.name === 'name';

  for (let attempt = 0; attempt < 40 && !reachedName; attempt += 1) {
    await page.keyboard.press('Tab');
    active = await activeElementIdentity(page);
    reachedName = active?.name === 'name';
  }

  assert.equal(
    reachedName,
    true,
    'A real keyboard Tab sequence must be able to reach the inquiry name field.',
  );

  const keyboardFocus = await name.evaluate((element) => ({
    focusVisible: element.matches(':focus-visible'),
    boxShadow: getComputedStyle(element).boxShadow,
  }));
  assert.equal(
    keyboardFocus.focusVisible,
    true,
    'The inquiry field reached by keyboard must match :focus-visible.',
  );
  assert.notEqual(
    keyboardFocus.boxShadow,
    'none',
    'Keyboard focus must produce a visible focus treatment on inquiry fields.',
  );

  await page.keyboard.press('Tab');
  active = await activeElementIdentity(page);
  assert.equal(active?.name, 'email', 'Tab from name must move to email.');

  await page.keyboard.press('Tab');
  active = await activeElementIdentity(page);
  assert.equal(active?.name, 'organization', 'Tab from email must move to organization.');

  await page.keyboard.press('Tab');
  active = await activeElementIdentity(page);
  assert.equal(active?.name, 'message', 'Tab from organization must move to the message.');

  await page.keyboard.press('Tab');
  active = await activeElementIdentity(page);
  assert.match(
    active?.className ?? '',
    /aks-work-with-us-message-playback/,
    'Tab from the message must reach the progressive playback control.',
  );

  await page.keyboard.press('Tab');
  active = await activeElementIdentity(page);
  assert.match(
    active?.className ?? '',
    /aks-work-with-us-inquiry-submit/,
    'Tab from playback must reach the submit control.',
  );
}

async function assertReducedMotion(browser, pathName, copy) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    reducedMotion: 'reduce',
  });

  await context.addInitScript(() => {
    class ReducedMotionUtterance {
      constructor(text) {
        this.text = String(text);
        this.lang = '';
        this.onend = null;
        this.onerror = null;
      }
    }

    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      configurable: true,
      value: ReducedMotionUtterance,
    });
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        speaking: false,
        pending: false,
        paused: false,
        speak() {},
        cancel() {},
        pause() {},
        resume() {},
        getVoices() {
          return [];
        },
      },
    });
  });

  const page = await context.newPage();

  try {
    const response = await page.goto(origin + pathName);
    assert.equal(response?.status(), 200);
    await page
      .getByRole('button', { name: copy.contactListenLabel, exact: true })
      .waitFor();

    const motion = await page.evaluate(() => {
      const selectors = [
        '.aks-work-with-us-inquiry-field input[name="name"]',
        '.aks-work-with-us-inquiry-field textarea[name="message"]',
        '.aks-work-with-us-message-playback',
      ];

      return {
        preference: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        transitions: selectors.map((selector) => {
          const element = document.querySelector(selector);
          if (!(element instanceof HTMLElement)) return null;
          return getComputedStyle(element).transitionDuration;
        }),
      };
    });

    assert.equal(
      motion.preference,
      true,
      'The release qualification context must expose prefers-reduced-motion: reduce.',
    );
    assert.equal(
      motion.transitions.every(
        (duration) =>
          duration !== null &&
          duration
            .split(',')
            .every((value) => Number.parseFloat(value) === 0),
      ),
      true,
      'Work with us-owned field/playback transitions must be disabled under reduced motion.',
    );
  } finally {
    await context.close();
  }
}

(async () => {
  await waitForServer();
  const browser = await chromium.launch({ headless: true });

  const english = {
    heroTitle: 'Work with AkikSystems',
    heroIntroduction:
      'A clean v2 editorial contract for the Work with us destination.',
    approachTitle: 'How we work',
    understandTitle: 'Understand',
    understandBody: 'Read the context before choosing an intervention.',
    structureTitle: 'Structure',
    structureBody: 'Make constraints, options, and boundaries explicit.',
    buildTitle: 'Build',
    buildBody: 'Implement the justified next step with care.',
    contactTitle: 'Your turn.',
    contactNameLabel: 'Name',
    contactEmailLabel: 'Email',
    contactOrganizationLabel: 'Organization (optional)',
    contactMessageLabel: 'Message',
    contactMessagePlaceholder: 'Your message…',
    contactListenLabel: 'Listen to my message',
    contactSubmitLabel: 'Send',
    contactSuccessMessage: 'Message received.',
    contactPrivacyNote: 'Contact data remains limited to this exchange.',
    validationMessage: 'Please review the highlighted fields.',
    inquiryName: 'English browser inquiry',
    inquiryEmail: englishInquiryEmail,
    inquiryOrganization: 'AkikSystems qualification',
    inquiryMessage: 'A durable English inquiry submitted through the real public form.',
    locale: 'en',
    playbackLanguage: 'en-US',
    aboutTitle: 'About me.',
    aboutProfileLinkLabel: 'View profile',
    profilePath: '/en/profile',
    systemsTitle: 'Selected systems.',
  };

  const french = {
    heroTitle: 'Travailler avec AkikSystems',
    heroIntroduction:
      'Un contrat éditorial v2 propre pour la destination Travailler ensemble.',
    approachTitle: 'Comment nous travaillons',
    understandTitle: 'Comprendre',
    understandBody: 'Lire le contexte avant de choisir une intervention.',
    structureTitle: 'Structurer',
    structureBody: 'Rendre explicites les contraintes, options et limites.',
    buildTitle: 'Construire',
    buildBody: 'Mettre en œuvre la prochaine étape justifiée avec soin.',
    contactTitle: 'À vous.',
    contactNameLabel: 'Nom',
    contactEmailLabel: 'E-mail',
    contactOrganizationLabel: 'Organisation (optionnel)',
    contactMessageLabel: 'Message',
    contactMessagePlaceholder: 'Votre message…',
    contactListenLabel: 'Écouter mon message',
    contactSubmitLabel: 'Envoyer',
    contactSuccessMessage: 'Message reçu.',
    contactPrivacyNote: 'Les données de contact restent limitées à cet échange.',
    validationMessage: 'Vérifiez les champs indiqués.',
    inquiryName: 'Demande navigateur française',
    inquiryEmail: frenchInquiryEmail,
    inquiryOrganization: 'Qualification AkikSystems',
    inquiryMessage: 'Une demande française persistée par le véritable formulaire public.',
    locale: 'fr',
    playbackLanguage: 'fr-FR',
    aboutTitle: 'Qui je suis.',
    aboutProfileLinkLabel: 'Voir le profil',
    profilePath: '/fr/profil',
    systemsTitle: 'Quelques systèmes.',
  };

  try {
    const context = await browser.newContext();
    await context.addInitScript(() => {
      const cancelStorageKey = '__aksSpeechCancelCount';
      const testState = {
        cancelCount: Number.parseInt(
          window.sessionStorage.getItem(cancelStorageKey) ?? '0',
          10,
        ),
        spoken: [],
      };
      let activeUtterance = null;

      class TestSpeechSynthesisUtterance {
        constructor(text) {
          this.text = String(text);
          this.lang = '';
          this.onend = null;
          this.onerror = null;
        }
      }

      const speechSynthesis = {
        get speaking() {
          return activeUtterance !== null;
        },
        pending: false,
        paused: false,
        speak(utterance) {
          activeUtterance = utterance;
          testState.spoken.push({
            lang: utterance.lang,
            text: utterance.text,
          });
        },
        cancel() {
          testState.cancelCount += 1;
          window.sessionStorage.setItem(
            cancelStorageKey,
            String(testState.cancelCount),
          );
          activeUtterance = null;
        },
        pause() {},
        resume() {},
        getVoices() {
          return [];
        },
      };

      Object.defineProperty(window, '__aksSpeechTest', {
        configurable: true,
        value: testState,
      });
      Object.defineProperty(window, 'SpeechSynthesisUtterance', {
        configurable: true,
        value: TestSpeechSynthesisUtterance,
      });
      Object.defineProperty(window, 'speechSynthesis', {
        configurable: true,
        value: speechSynthesis,
      });
    });
    const page = await context.newPage();

    await page.goto(`${origin}/admin/login`);
    await page.getByLabel('Email').fill(adminEmail);
    await page.getByLabel('Password').fill(adminPassword);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.waitForURL(`${origin}/admin`);

    assert.equal(
      await page.locator('#admin-work-with-us').count(),
      0,
      'Work with us must not be embedded in the administration home.',
    );
    const workWithUsLink = page.getByRole('link', {
      name: 'Work with us',
      exact: true,
    });
    await workWithUsLink.waitFor();
    await workWithUsLink.click();
    await page.waitForURL(`${origin}/admin/work-with-us`);

    const adminSection = page.locator('#admin-work-with-us');
    await adminSection.waitFor();

    assert.equal(
      await adminSection.locator('input[name="locale"]').count(),
      0,
      'Work with us commands must encode locale atomically instead of duplicating it in a second form field.',
    );

    let englishCard = localeCard(page, 'en');
    await fillCommercialDraft(englishCard, english);
    await submitCommand(
      page,
      englishCard.getByRole('button', { name: 'Save EN draft', exact: true }),
      'save-work-with-us-localization:en',
      'EN Work with us draft saved.',
    );

    await page.goto(`${origin}/admin/work-with-us`);
    englishCard = localeCard(page, 'en');
    await assertPersisted(englishCard, english);

    let publicResponse = await page.context().request.get(`${origin}/en/work-with-us`);
    let publicHtml = await publicResponse.text();
    assert.equal(publicResponse.status(), 200);
    assert.doesNotMatch(
      publicHtml,
      /Work with AkikSystems/,
      'Saving a draft must not mutate the public snapshot.',
    );

    await submitCommand(
      page,
      englishCard.getByRole('button', { name: 'Publish EN', exact: true }),
      'publish-work-with-us-localization:en',
      'EN Work with us content published.',
    );
    await assertPublishedSnapshotVersion('en', english);
    await assertPublicCopy(page, '/en/work-with-us', english, {
      width: 1440,
      height: 900,
    });

    await page.goto(`${origin}/admin/work-with-us`);
    let frenchCard = localeCard(page, 'fr');
    await fillCommercialDraft(frenchCard, french);
    await submitCommand(
      page,
      frenchCard.getByRole('button', { name: 'Save FR draft', exact: true }),
      'save-work-with-us-localization:fr',
      'FR Work with us draft saved.',
    );

    await page.goto(`${origin}/admin/work-with-us`);
    frenchCard = localeCard(page, 'fr');
    await assertPersisted(frenchCard, french);
    await submitCommand(
      page,
      frenchCard.getByRole('button', { name: 'Publish FR', exact: true }),
      'publish-work-with-us-localization:fr',
      'FR Work with us content published.',
    );
    await assertPublishedSnapshotVersion('fr', french);
    await assertPublicCopy(page, '/fr/travailler-ensemble', french, {
      width: 390,
      height: 844,
    });
    await page.setViewportSize({ width: 1280, height: 800 });

    await assertBackgroundContinuity(page, '/en/work-with-us');

    const releaseViewports = [
      ['320px French portrait', '/fr/travailler-ensemble', french, { width: 320, height: 720 }],
      ['390px English portrait', '/en/work-with-us', english, { width: 390, height: 844 }],
      ['430px French portrait', '/fr/travailler-ensemble', french, { width: 430, height: 932 }],
      ['1440px English desktop', '/en/work-with-us', english, { width: 1440, height: 900 }],
    ];

    for (const [label, pathName, copy, viewport] of releaseViewports) {
      await assertWorkWithUsViewport(page, pathName, copy, viewport, label);
    }

    await assertKeyboardAccessibility(page, '/en/work-with-us', english);
    await assertReducedMotion(browser, '/fr/travailler-ensemble', french);

    await assertNoJavaScriptInquiry(browser, english, '/en/work-with-us');

    await page.goto(`${origin}/admin/work-with-us/inquiries`);
    await page
      .getByRole('heading', { level: 1, name: 'Inquiry inbox', exact: true })
      .waitFor();

    const recipientInput = page.locator('input[name="recipientEmail"]');
    assert.equal(
      await recipientInput.inputValue(),
      adminEmail.toLowerCase(),
      'The first inbox visit should initialize the notification recipient from the authenticated administrator.',
    );

    const qualificationRecipient =
      `work-with-us-notifications-${inquiryMarker}@example.invalid`;
    await recipientInput.fill(qualificationRecipient);
    await submitInquiryCommand(
      page,
      page.getByRole('button', { name: 'Save recipient', exact: true }),
      'save-notification-recipient',
      'Inquiry notification recipient updated.',
    );

    const englishInquiryCard = page
      .locator('[data-inquiry-id]')
      .filter({ hasText: englishInquiryEmail });
    await englishInquiryCard.waitFor();
    await englishInquiryCard.getByText(english.inquiryMessage, { exact: true }).waitFor();
    await englishInquiryCard.getByText('Notification · queued', { exact: true }).waitFor();

    await submitInquiryCommand(
      page,
      englishInquiryCard.getByRole('button', {
        name: 'Mark handled',
        exact: true,
      }),
      'mark-inquiry-handled',
      'Inquiry marked as handled.',
    );
    await englishInquiryCard.getByText(/Handled ·/).waitFor();

    const frenchInquiryCard = page
      .locator('[data-inquiry-id]')
      .filter({ hasText: frenchInquiryEmail });
    await frenchInquiryCard.waitFor();
    await frenchInquiryCard.getByText(french.inquiryMessage, { exact: true }).waitFor();

    const noJavaScriptInquiryCard = page
      .locator('[data-inquiry-id]')
      .filter({ hasText: noJavaScriptInquiryEmail });
    await noJavaScriptInquiryCard.waitFor();

    await page.goto(`${origin}/admin/work-with-us`);
    englishCard = localeCard(page, 'en');
    await englishCard
      .locator('input[name="heroTitle"]')
      .fill('Private draft must remain private');
    await submitCommand(
      page,
      englishCard.getByRole('button', { name: 'Save EN draft', exact: true }),
      'save-work-with-us-localization:en',
      'EN Work with us draft saved.',
    );

    publicResponse = await page.context().request.get(`${origin}/en/work-with-us`);
    publicHtml = await publicResponse.text();
    assert.match(publicHtml, /Work with AkikSystems/);
    assert.doesNotMatch(publicHtml, /Private draft must remain private/);

    process.stdout.write(
      'Work with us smoke passed: snapshot v2 and EN/FR publication stay isolated; Work with us uses one uninterrupted Home-derived canvas with no section glow and only soft, partial-width separators; System selection is qualified separately at the database boundary; inquiries persist before success; speech playback remains progressive; JavaScript is optional; 320/390/430 mobile and desktop reflow, keyboard focus, reduced motion, and the authenticated inquiry inbox are release-qualified.\n',
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
    await db.query(
      'delete from work_with_us_inquiries where email = any($1::text[])',
      [[englishInquiryEmail, frenchInquiryEmail, noJavaScriptInquiryEmail]],
    );
    await db.query(
      "delete from work_with_us_inquiry_settings where singleton_key = 'public'",
    );
    await db.end();
    server.kill('SIGTERM');
    await Promise.race([
      new Promise((resolve) => server.once('exit', resolve)),
      sleep(2_000),
    ]);
  });
