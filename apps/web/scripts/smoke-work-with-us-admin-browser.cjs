/* eslint-disable @typescript-eslint/no-require-imports, no-undef */
const { strict: assert } = require('node:assert');
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
    .locator('input[name="contactSubmitLabel"]')
    .fill(copy.contactSubmitLabel);
  await card
    .locator('textarea[name="contactSuccessMessage"]')
    .fill(copy.contactSuccessMessage);
  await card
    .locator('textarea[name="contactPrivacyNote"]')
    .fill(copy.contactPrivacyNote);
  await card.locator('input[name="aboutTitle"]').fill(copy.aboutTitle);
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
    await card.locator('input[name="contactSubmitLabel"]').inputValue(),
    copy.contactSubmitLabel,
  );
  assert.equal(
    await card.locator('input[name="aboutTitle"]').inputValue(),
    copy.aboutTitle,
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
  assert.equal(snapshot.contact.submitLabel, copy.contactSubmitLabel);
  assert.equal(snapshot.contact.successMessage, copy.contactSuccessMessage);
  assert.equal(snapshot.about.title, copy.aboutTitle);
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
    await renderer.locator('.aks-work-with-us-orbital-focus').count(),
    1,
    'The renderer must keep one decorative focal point in the hero composition.',
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
  assert.equal(
    await renderer.locator('button').filter({ hasText: /Listen|Écouter/ }).count(),
    0,
    'Speech playback belongs to step 6 and must not leak into the step 5 boundary.',
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
    contactSubmitLabel: 'Send',
    contactSuccessMessage: 'Message received.',
    contactPrivacyNote: 'Contact data remains limited to this exchange.',
    validationMessage: 'Please review the highlighted fields.',
    inquiryName: 'English browser inquiry',
    inquiryEmail: 'work-with-us-en-browser@example.invalid',
    inquiryOrganization: 'AkikSystems qualification',
    inquiryMessage: 'A durable English inquiry submitted through the real public form.',
    locale: 'en',
    aboutTitle: 'About me.',
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
    contactSubmitLabel: 'Envoyer',
    contactSuccessMessage: 'Message reçu.',
    contactPrivacyNote: 'Les données de contact restent limitées à cet échange.',
    validationMessage: 'Vérifiez les champs indiqués.',
    inquiryName: 'Demande navigateur française',
    inquiryEmail: 'work-with-us-fr-browser@example.invalid',
    inquiryOrganization: 'Qualification AkikSystems',
    inquiryMessage: 'Une demande française persistée par le véritable formulaire public.',
    locale: 'fr',
    aboutTitle: 'Qui je suis.',
    systemsTitle: 'Quelques systèmes.',
  };

  try {
    const context = await browser.newContext();
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
      'Work with us smoke passed: EN/FR publication stays isolated, the dedicated renderer remains responsive, invalid inquiries are rejected, and valid public inquiries persist before success is shown.\n',
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
    await db.end();
    server.kill('SIGTERM');
    await Promise.race([
      new Promise((resolve) => server.once('exit', resolve)),
      sleep(2_000),
    ]);
  });
