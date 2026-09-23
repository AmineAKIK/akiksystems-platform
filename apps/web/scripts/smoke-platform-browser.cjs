/* eslint-disable @typescript-eslint/no-require-imports, no-undef */
const { strict: assert } = require('node:assert');
const { execFileSync, spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { setTimeout: sleep } = require('node:timers/promises');
const { chromium } = require('playwright');
const axe = require('axe-core');


const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;

if (!adminEmail || !adminPassword) {
  throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required.');
}

const port = '4177';
const origin = `http://127.0.0.1:${port}`;
const testAssetRoot = '/tmp/akiksystems-browser-assets';
fs.rmSync(testAssetRoot, { force: true, recursive: true });
fs.mkdirSync(testAssetRoot, { recursive: true });
process.env.ASSET_STORAGE_TEST_ROOT = testAssetRoot;
let stderr = '';

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
      // Starting.
    }
    await sleep(100);
  }

  throw new Error(`Sentinel browser smoke server did not become ready. stderr=${stderr}`);
}

async function openProfileDepth(page, id) {
  const details = page.locator(`details#${id}`);
  await details.waitFor();
  if ((await details.getAttribute('open')) === null) {
    await details.locator(':scope > summary').click();
  }
  assert.notEqual(
    await details.getAttribute('open'),
    null,
    `${id} must open after one intentional disclosure action.`,
  );
  return details;
}

async function publishProfileDraft(page, locales = ['en', 'fr']) {
  await page.goto(`${origin}/admin/profile`);

  for (const locale of locales) {
    const card = page.locator(
      `[data-profile-publication="${locale}"]`,
    );
    const publishButton = card.getByRole('button', {
      name: /^(Publish|Republish draft)$/,
    });
    await publishButton.click();
    await page
      .getByText(`${locale.toUpperCase()} Profile published from current draft.`, {
        exact: true,
      })
      .waitFor();
  }
}

async function assertProfileAdministration(page) {
  await page.goto(`${origin}/admin/profile`);
  await page
    .getByRole('heading', { level: 1, name: 'Professional identity', exact: true })
    .waitFor();

  const cvSection = page.locator('.aks-admin-card').filter({
    has: page.getByRole('heading', { level: 2, name: 'Source CV', exact: true }),
  });
  const cvInput = cvSection.locator('input[name="file"]');
  await cvInput.waitFor();
  assert.equal(
    await cvInput.getAttribute('accept'),
    'application/pdf',
    'Source CV admin must accept PDF only.',
  );
  await page.getByText('No source CV is currently linked.', { exact: true }).waitFor();

  const portraitSection = page.locator('.aks-admin-card').filter({
    has: page.getByRole('heading', { level: 2, name: 'Portrait', exact: true }),
  });
  const portraitInput = portraitSection.locator('input[name="file"]');
  await portraitInput.waitFor();
  assert.equal(
    await portraitInput.getAttribute('accept'),
    'image/jpeg,image/png,image/webp,image/avif',
    'Profile portrait admin must accept image formats only.',
  );
  assert.notEqual(
    await page.locator('input[name="altEn"]').getAttribute('required'),
    null,
    'English portrait alt text must be required.',
  );
  assert.notEqual(
    await page.locator('input[name="altFr"]').getAttribute('required'),
    null,
    'French portrait alt text must be required.',
  );

  await page.locator('input[name="displayName"]').fill('Amine AKIK');
  await page
    .locator('input[name="professionalTitleEn"]')
    .fill('Software systems builder');
  await page
    .locator('textarea[name="introductionEn"]')
    .fill('I design and build inspectable software systems.');
  await page
    .locator('textarea[name="foundationalCopyEn"]')
    .fill('This Profile connects professional identity to inspectable evidence without reproducing a CV.');
  await page
    .locator('input[name="professionalTitleFr"]')
    .fill('Concepteur de systèmes logiciels');
  await page
    .locator('textarea[name="introductionFr"]')
    .fill('Je conçois et construis des systèmes logiciels inspectables.');
  await page
    .locator('textarea[name="foundationalCopyFr"]')
    .fill('Ce Profil relie l’identité professionnelle à des preuves inspectables sans reproduire un CV.');

  await page.getByRole('button', { name: 'Save professional identity' }).click();
  await page.getByText('Professional identity updated.').waitFor();

  const workPrinciples = page.locator('textarea[name="workPrinciples"]');
  await workPrinciples.fill(
    'Expose CSSOV | Internal methodology name. || Exposer CSSOV | Nom de méthodologie interne.',
  );
  await page.getByRole('button', { name: 'Save How I work' }).click();
  await page
    .getByText(
      'Public working principles must describe the practice directly without naming CSSOV.',
      { exact: true },
    )
    .waitFor();

  await workPrinciples.fill(
    [
      'Make evidence inspectable | Prefer concrete proof over opaque claims. || Rendre les preuves inspectables | Privilégier des preuves concrètes aux affirmations opaques.',
      'Reduce before adding | Remove accidental complexity before introducing another layer. || Réduire avant d’ajouter | Retirer la complexité accidentelle avant d’ajouter une couche.',
      'Design for direct entry | Every meaningful route should stand on its own. || Concevoir pour l’accès direct | Chaque route utile doit pouvoir être comprise seule.',
    ].join('\n'),
  );
  await page.getByRole('button', { name: 'Save How I work' }).click();
  await page.getByText('How I work updated.', { exact: true }).waitFor();

  const capabilities = page.locator('textarea[name="capabilities"]');
  await capabilities.fill(
    [
      '# Architecture || Architecture',
      'Design bounded systems | Shape explicit boundaries and contracts. || Concevoir des systèmes délimités | Structurer des frontières et des contrats explicites.',
      '# Delivery || Livraison',
      'Qualify delivery paths | Build observable paths from change to production. || Qualifier les parcours de livraison | Construire des parcours observables du changement à la production.',
    ].join('\n'),
  );
  await page.getByRole('button', { name: 'Save capabilities' }).click();
  await page.getByText('Capabilities updated.', { exact: true }).waitFor();

  const languageForm = page.locator('form').filter({
    has: page.getByRole('heading', {
      level: 2,
      name: 'Languages and mobility',
      exact: true,
    }),
  });
  for (const [code, position] of [
    ['fr', '0'],
    ['en', '1'],
    ['ar', '2'],
  ]) {
    await languageForm
      .locator(`input[name="language"][value="${code}"]`)
      .check();
    await languageForm
      .locator(`input[name="language-position-${code}"]`)
      .fill(position);
  }
  await languageForm.locator('input[name="mobility-worldwide"]').check();
  await languageForm.locator('input[name="mobility-remote"]').check();
  await languageForm.locator('input[name="mobility-relocation"]').check();
  await languageForm
    .getByRole('button', { name: 'Save languages and mobility' })
    .click();
  await page
    .getByText('Languages and mobility updated.', { exact: true })
    .waitFor();

  await publishProfileDraft(page);

  await page.goto(`${origin}/en/profile`);
  await page.getByRole('heading', { level: 1, name: 'Amine AKIK', exact: true }).waitFor();
  await page.getByText('Software systems builder', { exact: true }).waitFor();
  await page
    .getByText('I design and build inspectable software systems.', { exact: true })
    .waitFor();
  await page
    .getByText(
      'This Profile connects professional identity to inspectable evidence without reproducing a CV.',
      { exact: true },
    )
    .waitFor();
  await page
    .getByRole('heading', { level: 2, name: 'How I work', exact: true })
    .waitFor();
  const englishPrinciples = await page
    .locator('.aks-profile-work-principle-list h3')
    .allInnerTexts();
  assert.deepEqual(englishPrinciples, [
    'Make evidence inspectable',
    'Reduce before adding',
    'Design for direct entry',
  ]);
  assert.equal(
    /CSSOV/i.test(await page.locator('body').innerText()),
    false,
    'The public English Profile must not expose the internal CSSOV name.',
  );
  await page
    .getByRole('heading', { level: 2, name: 'Languages & mobility', exact: true })
    .waitFor();
  await openProfileDepth(page, 'profile-technical-depth');
  assert.deepEqual(
    await page.locator('.aks-profile-languages-mobility .aks-profile-fact-list').first().locator('li').allInnerTexts(),
    ['French', 'English', 'Arabic'],
  );
  for (const label of ['Worldwide', 'Remote', 'Relocation']) {
    await page
      .locator('.aks-profile-languages-mobility')
      .getByText(label, { exact: true })
      .waitFor();
  }
  const englishCapabilities = page.locator('.aks-profile-capabilities');
  await englishCapabilities
    .getByRole('heading', { level: 2, name: 'Technical Capabilities', exact: true })
    .waitFor();
  assert.deepEqual(
    await englishCapabilities.locator('h3').allInnerTexts(),
    ['Architecture', 'Delivery'],
  );
  assert.deepEqual(
    await englishCapabilities.locator('.aks-profile-capability .aks-text').allInnerTexts(),
    [
      'Design bounded systems',
      'Shape explicit boundaries and contracts.',
      'Qualify delivery paths',
      'Build observable paths from change to production.',
    ],
  );
  assert.equal(
    /\bReact\b|\bDocker\b/.test(await englishCapabilities.innerText()),
    false,
    'Technical Capabilities must not render concrete Technology names.',
  );
  assert.equal(
    await page.locator('.aks-experience-meta a[hreflang="fr"]').getAttribute('href'),
    '/fr/profil',
  );

  await page.goto(`${origin}/fr/profil`);
  await page.getByRole('heading', { level: 1, name: 'Amine AKIK', exact: true }).waitFor();
  await page.getByText('Concepteur de systèmes logiciels', { exact: true }).waitFor();
  await page
    .getByText('Je conçois et construis des systèmes logiciels inspectables.', { exact: true })
    .waitFor();
  await page
    .getByText(
      'Ce Profil relie l’identité professionnelle à des preuves inspectables sans reproduire un CV.',
      { exact: true },
    )
    .waitFor();
  await page
    .getByRole('heading', { level: 2, name: 'Ma manière de travailler', exact: true })
    .waitFor();
  const frenchPrinciples = await page
    .locator('.aks-profile-work-principle-list h3')
    .allInnerTexts();
  assert.deepEqual(frenchPrinciples, [
    'Rendre les preuves inspectables',
    'Réduire avant d’ajouter',
    'Concevoir pour l’accès direct',
  ]);
  assert.equal(
    /CSSOV/i.test(await page.locator('body').innerText()),
    false,
    'The public French Profile must not expose the internal CSSOV name.',
  );
  await page
    .getByRole('heading', { level: 2, name: 'Langues et mobilité', exact: true })
    .waitFor();
  await openProfileDepth(page, 'profile-technical-depth');
  assert.deepEqual(
    await page.locator('.aks-profile-languages-mobility .aks-profile-fact-list').first().locator('li').allInnerTexts(),
    ['Français', 'Anglais', 'Arabe'],
  );
  for (const label of ['International', 'À distance', 'Relocalisation']) {
    await page
      .locator('.aks-profile-languages-mobility')
      .getByText(label, { exact: true })
      .waitFor();
  }
  const frenchCapabilities = page.locator('.aks-profile-capabilities');
  await frenchCapabilities
    .getByRole('heading', { level: 2, name: 'Capacités techniques', exact: true })
    .waitFor();
  assert.deepEqual(
    await frenchCapabilities.locator('h3').allInnerTexts(),
    ['Architecture', 'Livraison'],
  );
  assert.deepEqual(
    await frenchCapabilities.locator('.aks-profile-capability .aks-text').allInnerTexts(),
    [
      'Concevoir des systèmes délimités',
      'Structurer des frontières et des contrats explicites.',
      'Qualifier les parcours de livraison',
      'Construire des parcours observables du changement à la production.',
    ],
  );

  await page.setViewportSize({ width: 390, height: 844 });
  for (const target of [
    { path: '/en/profile', heading: 'Amine AKIK' },
    { path: '/fr/profil', heading: 'Amine AKIK' },
  ]) {
    await page.goto(`${origin}${target.path}`);
    await page
      .getByRole('heading', { level: 1, name: target.heading, exact: true })
      .waitFor();
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
      true,
      `${target.path} administered Profile must not overflow on mobile.`,
    );
    await page.getByRole('heading', { level: 1, name: 'Amine AKIK', exact: true }).waitFor();
    assert.equal(
      await page.locator('.aks-profile-work-principle-list li').count(),
      3,
      `${target.path} must preserve the three administered working principles on mobile.`,
    );
    assert.equal(
      await page.locator('.aks-profile-languages-mobility .aks-profile-fact-list').count(),
      2,
      `${target.path} must preserve structured language and mobility facts on mobile.`,
    );
    assert.equal(
      await page.locator('.aks-profile-capability-group').count(),
      2,
      `${target.path} must preserve grouped Technical Capabilities on mobile.`,
    );
  }

  await page.setViewportSize({ width: 1280, height: 800 });
}

async function assertCapabilityTechnologySeparation(page) {
  await page.goto(`${origin}/admin/profile`);
  await page
    .getByRole('heading', { level: 2, name: 'Capabilities', exact: true })
    .waitFor();

  const capabilities = page.locator('textarea[name="capabilities"]');
  await capabilities.fill(
    '# Frontend engineering || Ingénierie frontend\nReact | Tool name, not an ability. || React | Nom d’outil, pas une capacité.',
  );
  await page.getByRole('button', { name: 'Save capabilities' }).click();
  await page
    .getByText(
      'Capabilities must describe conceptual or engineering abilities, not Technology names.',
      { exact: true },
    )
    .waitFor();

  await page.reload();
  const persisted = await page.locator('textarea[name="capabilities"]').inputValue();
  assert.match(
    persisted,
    /Design bounded systems/,
    'Rejecting a Technology name must preserve the previously saved capability model.',
  );
  assert.doesNotMatch(
    persisted,
    /^React\s*\|/m,
    'Technology names must not persist as Profile capabilities.',
  );
}

async function assertProfessionalJourneySelection(page) {
  await page.goto(`${origin}/admin/profile`);
  await page
    .getByRole('heading', {
      level: 2,
      name: 'Relevant professional journey',
      exact: true,
    })
    .waitFor();

  const checkbox = page.getByRole('checkbox', { name: 'Marelli', exact: true });
  await checkbox.check();
  const marelliCard = checkbox.locator('..').locator('..');
  await marelliCard.getByRole('spinbutton', { name: 'Order', exact: true }).fill('0');
  await page.getByRole('button', { name: 'Save professional journey' }).click();
  await page.getByText('Professional journey updated.', { exact: true }).waitFor();
  await publishProfileDraft(page);

  await page.goto(`${origin}/en/profile`);
  await openProfileDepth(page, 'profile-professional-evidence');
  await page
    .getByRole('heading', {
      level: 2,
      name: 'Relevant professional journey',
      exact: true,
    })
    .waitFor();
  const englishJourney = page.locator('.aks-profile-journey-list');
  await englishJourney
    .getByRole('heading', { level: 3, name: 'Marelli', exact: true })
    .waitFor();
  await englishJourney
    .getByText(
      'Industrial software context where operational constraints shaped the work.',
      { exact: true },
    )
    .waitFor();

  await page.goto(`${origin}/fr/profil`);
  await openProfileDepth(page, 'profile-professional-evidence');
  await page
    .getByRole('heading', {
      level: 2,
      name: 'Parcours professionnel pertinent',
      exact: true,
    })
    .waitFor();
  const frenchJourney = page.locator('.aks-profile-journey-list');
  await frenchJourney
    .getByRole('heading', { level: 3, name: 'Marelli', exact: true })
    .waitFor();
  await frenchJourney
    .getByText(
      'Contexte logiciel industriel où les contraintes opérationnelles ont façonné le travail.',
      { exact: true },
    )
    .waitFor();

  await page.setViewportSize({ width: 390, height: 844 });
  for (const target of [
    { path: '/en/profile', heading: 'Relevant professional journey' },
    { path: '/fr/profil', heading: 'Parcours professionnel pertinent' },
  ]) {
    await page.goto(`${origin}${target.path}`);
    await openProfileDepth(page, 'profile-professional-evidence');
    await page.getByRole('heading', { level: 2, name: target.heading, exact: true }).waitFor();
    assert.equal(
      await page.locator('.aks-profile-journey-list li').count(),
      1,
      `${target.path} must expose only the explicitly selected Experience.`,
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
      true,
      `${target.path} professional journey must not overflow on mobile.`,
    );
  }

  await page.setViewportSize({ width: 1280, height: 800 });
}

async function assertWorkPrincipleEvidence(page) {
  await page.goto(`${origin}/admin/profile`);
  await page
    .getByRole('heading', { level: 3, name: 'Evidence examples', exact: true })
    .waitFor();

  const evidenceSelects = page.locator('select[name^="evidence-"]');
  assert.ok(
    (await evidenceSelects.count()) >= 1,
    'Saved working principles must expose optional evidence selectors.',
  );
  await evidenceSelects.first().selectOption({ label: 'Sentinel' });
  await page.getByRole('button', { name: 'Save principle evidence' }).click();
  await page.getByText('How I work evidence updated.', { exact: true }).waitFor();
  await publishProfileDraft(page);

  await page.goto(`${origin}/en/profile`);
  const englishHow = page.locator('.aks-profile-work-principles');
  await englishHow
    .getByRole('heading', { level: 2, name: 'How I work', exact: true })
    .waitFor();
  await englishHow.getByText('Example', { exact: true }).waitFor();
  const englishEvidence = englishHow.getByRole('link', {
    name: 'Sentinel',
    exact: true,
  });
  assert.equal(await englishEvidence.getAttribute('href'), '/en/systems/sentinel');
  assert.equal(
    /Operational visibility built from industrial context/.test(
      await englishHow.innerText(),
    ),
    false,
    'How I work must link to System evidence without copying the System summary.',
  );

  await page.goto(`${origin}/fr/profil`);
  const frenchHow = page.locator('.aks-profile-work-principles');
  await frenchHow
    .getByRole('heading', {
      level: 2,
      name: 'Ma manière de travailler',
      exact: true,
    })
    .waitFor();
  await frenchHow.getByText('Exemple', { exact: true }).waitFor();
  const frenchEvidence = frenchHow.getByRole('link', {
    name: 'Sentinel',
    exact: true,
  });
  assert.equal(await frenchEvidence.getAttribute('href'), '/fr/systems/sentinel');
  assert.equal(
    /Visibilité opérationnelle issue d’un contexte industriel/.test(
      await frenchHow.innerText(),
    ),
    false,
    'How I work must not duplicate the localized System summary.',
  );

  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ['/en/profile', '/fr/profil']) {
    await page.goto(`${origin}${path}`);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
      true,
      `${path} How I work must not overflow on mobile.`,
    );
    assert.equal(
      await page.locator('.aks-profile-work-principle').count(),
      3,
      `${path} must preserve the three concise working principles.`,
    );
  }
  await page.setViewportSize({ width: 1280, height: 800 });
}

async function assertTechnologicalJourney(page) {
  await page.goto(`${origin}/admin/profile`);
  await page
    .getByRole('heading', { level: 2, name: 'Technological journey', exact: true })
    .waitFor();

  const journeyForm = page.locator('form').filter({
    has: page.getByRole('heading', {
      level: 2,
      name: 'Technological journey',
      exact: true,
    }),
  });

  await journeyForm
    .locator('select[name="journey-industry-evidence"]')
    .selectOption({ label: 'Experience · Marelli' });
  await journeyForm
    .locator('select[name="journey-development_akiksystems-evidence"]')
    .selectOption({ label: 'System · Sentinel' });
  await journeyForm
    .getByRole('button', { name: 'Save technological journey' })
    .click();
  await page
    .getByText('Technological journey updated.', { exact: true })
    .waitFor();
  await publishProfileDraft(page);

  await page.goto(`${origin}/en/profile`);
  await openProfileDepth(page, 'profile-technical-depth');
  const englishJourney = page.locator('.aks-profile-technology-journey');
  await englishJourney
    .getByRole('heading', { level: 2, name: 'Technological journey', exact: true })
    .waitFor();
  assert.deepEqual(
    await englishJourney.locator('h3').allInnerTexts(),
    [
      'Programming foundations',
      'Networks and telecom',
      'IT support',
      'Relevant industry',
      'Development and AkikSystems',
    ],
  );
  await englishJourney.getByText('Context: Marelli', { exact: true }).waitFor();
  await englishJourney.getByText('Evidence', { exact: true }).waitFor();
  assert.equal(
    await englishJourney
      .getByRole('link', { name: 'Sentinel', exact: true })
      .getAttribute('href'),
    '/en/systems/sentinel',
  );
  assert.equal(
    /React|Docker/.test(await englishJourney.innerText()),
    false,
    'The technological journey must not collapse into a concrete tool list.',
  );

  await page.goto(`${origin}/fr/profil`);
  await openProfileDepth(page, 'profile-technical-depth');
  const frenchJourney = page.locator('.aks-profile-technology-journey');
  await frenchJourney
    .getByRole('heading', { level: 2, name: 'Parcours technologique', exact: true })
    .waitFor();
  assert.deepEqual(
    await frenchJourney.locator('h3').allInnerTexts(),
    [
      'Fondations en programmation',
      'Réseaux et télécoms',
      'Support informatique',
      'Industrie pertinente',
      'Développement et AkikSystems',
    ],
  );
  await frenchJourney.getByText('Contexte : Marelli', { exact: true }).waitFor();
  await frenchJourney.getByText('Preuve', { exact: true }).waitFor();
  assert.equal(
    await frenchJourney
      .getByRole('link', { name: 'Sentinel', exact: true })
      .getAttribute('href'),
    '/fr/systems/sentinel',
  );

  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ['/en/profile', '/fr/profil']) {
    await page.goto(`${origin}${path}`);
    assert.equal(
      await page.locator('.aks-profile-technology-journey-stage').count(),
      5,
      `${path} must preserve the fixed five-step technological journey.`,
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
      true,
      `${path} technological journey must not overflow on mobile.`,
    );
  }
  await page.setViewportSize({ width: 1280, height: 800 });
}

async function assertProfileProgressiveDepth(browser, page) {
  for (const target of [
    {
      path: '/en/profile',
      summaries: [
        'Explore technical depth',
        'Explore professional evidence',
      ],
    },
    {
      path: '/fr/profil',
      summaries: [
        'Approfondir la technique',
        'Approfondir les preuves professionnelles',
      ],
    },
  ]) {
    await page.goto(`${origin}${target.path}`);
    const depths = page.locator('details.aks-profile-depth');
    assert.equal(
      await depths.count(),
      2,
      `${target.path} must expose exactly two intentional depth controls while How I work remains visible.`,
    );
    for (const summary of target.summaries) {
      const details = page.locator('details.aks-profile-depth').filter({
        has: page.getByText(summary, { exact: true }),
      });
      assert.equal(
        await details.getAttribute('open'),
        null,
        `${target.path} depth must be closed on first reading.`,
      );
    }

    const firstSummary = depths.first().locator(':scope > summary');
    await firstSummary.focus();
    await page.keyboard.press('Enter');
    assert.notEqual(
      await depths.first().getAttribute('open'),
      null,
      `${target.path} first depth must open from keyboard in one action.`,
    );
    await page.keyboard.press('Enter');
    assert.equal(
      await depths.first().getAttribute('open'),
      null,
      `${target.path} first depth must close from keyboard in one action.`,
    );
  }

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
  try {
    const mobilePage = await mobile.newPage();
    for (const path of ['/en/profile', '/fr/profil']) {
      await mobilePage.goto(`${origin}${path}`);
      assert.equal(
        await mobilePage.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
        true,
        `${path} progressive-depth controls must not overflow on mobile.`,
      );
      const details = mobilePage.locator('details.aks-profile-depth');
      for (let index = 0; index < (await details.count()); index += 1) {
        await details.nth(index).locator(':scope > summary').click();
      }
      assert.equal(
        await mobilePage.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
        true,
        `${path} expanded deep Profile content must not overflow on mobile.`,
      );
    }
  } finally {
    await mobile.close();
  }

  const noJs = await browser.newContext({ javaScriptEnabled: false });
  try {
    const noJsPage = await noJs.newPage();
    const response = await noJsPage.goto(`${origin}/en/profile`);
    assert.equal(response?.status(), 200);
    assert.equal(await noJsPage.locator('details.aks-profile-depth').count(), 2);
    await noJsPage
      .locator('details#profile-technical-depth > summary')
      .click();
    await noJsPage
      .getByRole('heading', { level: 2, name: 'Technical Capabilities', exact: true })
      .waitFor();
    await noJsPage.locator('#profile-how-i-work').waitFor();
    await noJsPage
      .getByRole('heading', { level: 2, name: 'How I work', exact: true })
      .waitFor();
  } finally {
    await noJs.close();
  }
}

async function assertProfileWithoutPriorCv(browser) {
  const scenarios = [
    {
      name: 'desktop EN direct Profile',
      path: '/en/profile',
      viewport: { width: 1440, height: 900 },
      locale: 'en',
      profileHeading: 'Amine AKIK',
      title: 'Software systems builder',
      introduction: 'I design and build inspectable software systems.',
      proofAction: 'Inspect System',
      howSummary: 'Explore how I work',
      principle: 'Make evidence inspectable',
      technicalSummary: 'Explore technical depth',
      capability: 'Design bounded systems',
    },
    {
      name: 'mobile EN direct Profile',
      path: '/en/profile',
      viewport: { width: 390, height: 844 },
      locale: 'en',
      profileHeading: 'Amine AKIK',
      title: 'Software systems builder',
      introduction: 'I design and build inspectable software systems.',
      proofAction: 'Inspect System',
      howSummary: 'Explore how I work',
      principle: 'Make evidence inspectable',
      technicalSummary: 'Explore technical depth',
      capability: 'Design bounded systems',
    },
    {
      name: 'desktop FR direct Profile',
      path: '/fr/profil',
      viewport: { width: 1440, height: 900 },
      locale: 'fr',
      profileHeading: 'Amine AKIK',
      title: 'Concepteur de systèmes logiciels',
      introduction: 'Je conçois et construis des systèmes logiciels inspectables.',
      proofAction: 'Inspecter le système',
      howSummary: 'Approfondir ma manière de travailler',
      principle: 'Rendre les preuves inspectables',
      technicalSummary: 'Approfondir la technique',
      capability: 'Concevoir des systèmes délimités',
    },
    {
      name: 'mobile FR direct Profile',
      path: '/fr/profil',
      viewport: { width: 390, height: 844 },
      locale: 'fr',
      profileHeading: 'Amine AKIK',
      title: 'Concepteur de systèmes logiciels',
      introduction: 'Je conçois et construis des systèmes logiciels inspectables.',
      proofAction: 'Inspecter le système',
      howSummary: 'Approfondir ma manière de travailler',
      principle: 'Rendre les preuves inspectables',
      technicalSummary: 'Approfondir la technique',
      capability: 'Concevoir des systèmes délimités',
    },
  ];

  const observations = [];

  for (const scenario of scenarios) {
    // Fresh context: no Home visit, no CV route, no cookies/history from another journey.
    const context = await browser.newContext({ viewport: scenario.viewport });
    try {
      const page = await context.newPage();
      const response = await page.goto(`${origin}${scenario.path}`);
      assert.equal(response?.status(), 200, `${scenario.name} must load directly.`);
      assert.equal(await page.locator('html').getAttribute('lang'), scenario.locale);

      // First-reading proxy: no scroll, click, hover, or prior-CV exposure.
      await page
        .getByRole('heading', { level: 1, name: scenario.profileHeading, exact: true })
        .waitFor();
      await page.getByText('Amine AKIK', { exact: true }).waitFor();
      await page.getByText(scenario.title, { exact: true }).waitFor();
      await page.getByText(scenario.introduction, { exact: true }).waitFor();

      const firstView = page.locator('.aks-profile-first-view');
      const proof = page.locator('.aks-profile-immediate-proof');
      await proof
        .getByRole('heading', { level: 3, name: 'Sentinel', exact: true })
        .waitFor();
      assert.equal(
        await proof.getByRole('link', { name: scenario.proofAction }).getAttribute('href'),
        scenario.locale === 'fr'
          ? '/fr/systems/sentinel'
          : '/en/systems/sentinel',
        `${scenario.name} must reveal where inspectable proof lives without prior context.`,
      );
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
        true,
        `${scenario.name} must remain horizontally readable on direct entry.`,
      );

      const closedDepths = await page
        .locator('details.aks-profile-depth')
        .evaluateAll((details) => details.map((detail) => detail.hasAttribute('open')));
      assert.ok(
        closedDepths.every((open) => open === false),
        `${scenario.name} must keep deeper material closed on first reading.`,
      );

      // "How he works" and deeper technical substance remain one intentional action away.
      const howSection = page.locator('#profile-how-i-work');
      await howSection.getByText(scenario.principle, { exact: true }).waitFor();

      const technicalDetails = page.locator('details#profile-technical-depth');
      await technicalDetails.getByText(scenario.technicalSummary, { exact: true }).click();
      await technicalDetails.getByText(scenario.capability, { exact: true }).waitFor();

      observations.push({
        scenario: scenario.name,
        directEntry: true,
        priorCvExposure: false,
        who: 'Amine AKIK',
        position: scenario.title,
        builds: scenario.introduction,
        immediateProof: 'Sentinel',
        proofHref:
          scenario.locale === 'fr'
            ? '/fr/systems/sentinel'
            : '/en/systems/sentinel',
        howHeWorks: scenario.principle,
        technicalAbility: scenario.capability,
        firstViewText: (await firstView.innerText()).trim(),
      });
    } finally {
      await context.close();
    }
  }

  process.stdout.write(
    `AKS-067 direct-entry automated comprehension proxy: ${JSON.stringify(observations)}\\n`,
  );
}

async function assertProfileAfterPriorCvExposure(browser) {
  const scenarios = [
    {
      name: 'desktop EN post-CV Profile',
      path: '/en/profile',
      viewport: { width: 1440, height: 900 },
      locale: 'en',
      cvBaseline: [
        'Amine AKIK',
        'Software systems builder',
        'Marelli',
        'French',
        'English',
        'Arabic',
      ],
      immediateProofAction: 'Inspect System',
      howSummary: 'Explore how I work',
      principle: 'Make evidence inspectable',
      principleEvidence: 'Sentinel',
      technicalSummary: 'Explore technical depth',
      capability: 'Design bounded systems',
      journeyStage: 'Development and AkikSystems',
      professionalSummary: 'Explore professional evidence',
      professionalHeading: 'Relevant professional journey',
    },
    {
      name: 'mobile EN post-CV Profile',
      path: '/en/profile',
      viewport: { width: 390, height: 844 },
      locale: 'en',
      cvBaseline: [
        'Amine AKIK',
        'Software systems builder',
        'Marelli',
        'French',
        'English',
        'Arabic',
      ],
      immediateProofAction: 'Inspect System',
      howSummary: 'Explore how I work',
      principle: 'Make evidence inspectable',
      principleEvidence: 'Sentinel',
      technicalSummary: 'Explore technical depth',
      capability: 'Design bounded systems',
      journeyStage: 'Development and AkikSystems',
      professionalSummary: 'Explore professional evidence',
      professionalHeading: 'Relevant professional journey',
    },
    {
      name: 'desktop FR post-CV Profile',
      path: '/fr/profil',
      viewport: { width: 1440, height: 900 },
      locale: 'fr',
      cvBaseline: [
        'Amine AKIK',
        'Concepteur de systèmes logiciels',
        'Marelli',
        'Français',
        'Anglais',
        'Arabe',
      ],
      immediateProofAction: 'Inspecter le système',
      howSummary: 'Approfondir ma manière de travailler',
      principle: 'Rendre les preuves inspectables',
      principleEvidence: 'Sentinel',
      technicalSummary: 'Approfondir la technique',
      capability: 'Concevoir des systèmes délimités',
      journeyStage: 'Développement et AkikSystems',
      professionalSummary: 'Approfondir les preuves professionnelles',
      professionalHeading: 'Parcours professionnel pertinent',
    },
    {
      name: 'mobile FR post-CV Profile',
      path: '/fr/profil',
      viewport: { width: 390, height: 844 },
      locale: 'fr',
      cvBaseline: [
        'Amine AKIK',
        'Concepteur de systèmes logiciels',
        'Marelli',
        'Français',
        'Anglais',
        'Arabe',
      ],
      immediateProofAction: 'Inspecter le système',
      howSummary: 'Approfondir ma manière de travailler',
      principle: 'Rendre les preuves inspectables',
      principleEvidence: 'Sentinel',
      technicalSummary: 'Approfondir la technique',
      capability: 'Concevoir des systèmes délimités',
      journeyStage: 'Développement et AkikSystems',
      professionalSummary: 'Approfondir les preuves professionnelles',
      professionalHeading: 'Parcours professionnel pertinent',
    },
  ];

  const observations = [];

  for (const scenario of scenarios) {
    const context = await browser.newContext({ viewport: scenario.viewport });
    try {
      const page = await context.newPage();

      // Deterministic prior-CV proxy. This is intentionally not presented as the real PDF:
      // it establishes already-known CV-like facts before Profile is visited.
      await page.setContent(
        [
          '<main><h1>Prior CV exposure proxy</h1>',
          ...scenario.cvBaseline.map((fact) => `<p>${fact}</p>`),
          '</main>',
        ].join(''),
      );
      for (const fact of scenario.cvBaseline) {
        await page.getByText(fact, { exact: true }).waitFor();
      }

      const response = await page.goto(`${origin}${scenario.path}`);
      assert.equal(response?.status(), 200, `${scenario.name} must load after the CV proxy.`);
      assert.equal(await page.locator('html').getAttribute('lang'), scenario.locale);

      const firstView = page.locator('.aks-profile-first-view');
      const firstViewText = await firstView.innerText();

      // Orientation can repeat identity/title, but CV chronology must not dominate the first view.
      assert.match(firstViewText, /Amine AKIK/);
      assert.equal(
        /Marelli/.test(firstViewText),
        false,
        `${scenario.name} must not repeat CV experience chronology in the first view.`,
      );

      const proof = page.locator('.aks-profile-immediate-proof');
      await proof
        .getByRole('heading', { level: 3, name: 'Sentinel', exact: true })
        .waitFor();
      const proofHref = await proof
        .getByRole('link', { name: scenario.immediateProofAction, exact: true })
        .getAttribute('href');
      assert.equal(
        proofHref,
        scenario.locale === 'fr' ? '/fr/systems/sentinel' : '/en/systems/sentinel',
        `${scenario.name} must add inspectable proof beyond the CV baseline.`,
      );

      // Repeated professional chronology is intentionally secondary after prior CV exposure.
      const professionalDetails = page.locator('details#profile-professional-evidence');
      assert.equal(
        await professionalDetails.getAttribute('open'),
        null,
        `${scenario.name} must keep repeated professional evidence collapsed by default.`,
      );
      await professionalDetails
        .getByText(scenario.professionalSummary, { exact: true })
        .click();
      await professionalDetails
        .getByRole('heading', {
          level: 2,
          name: scenario.professionalHeading,
          exact: true,
        })
        .waitFor();
      assert.equal(
        await professionalDetails.getByRole('heading', {
          level: 3,
          name: 'Marelli',
          exact: true,
        }).count(),
        1,
        `${scenario.name} must expose the known Experience once inside its dedicated evidence layer.`,
      );

      const howSection = page.locator('#profile-how-i-work');
      await howSection.getByText(scenario.principle, { exact: true }).waitFor();
      await howSection.getByText(scenario.principleEvidence, { exact: true }).waitFor();

      const technicalDetails = page.locator('details#profile-technical-depth');
      await technicalDetails.getByText(scenario.technicalSummary, { exact: true }).click();
      await technicalDetails.getByText(scenario.capability, { exact: true }).waitFor();
      await technicalDetails.getByText(scenario.journeyStage, { exact: true }).waitFor();
      assert.equal(
        /\bReact\b|\bDocker\b/.test(await technicalDetails.innerText()),
        false,
        `${scenario.name} must add capability context rather than repeat a CV-style tool list.`,
      );

      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
        true,
        `${scenario.name} must remain readable after opening post-CV depth.`,
      );

      observations.push({
        scenario: scenario.name,
        priorCvExposure: 'simulated-baseline',
        cvBaseline: scenario.cvBaseline,
        repeatedContextDeprioritized: 'Marelli professional evidence collapsed by default',
        novelContext: {
          immediateProof: 'Sentinel',
          proofHref,
          workingPrinciple: scenario.principle,
          workingPrincipleEvidence: 'Sentinel',
          technicalCapability: scenario.capability,
          technologicalJourney: scenario.journeyStage,
        },
      });
    } finally {
      await context.close();
    }
  }

  process.stdout.write(
    `AKS-068 post-CV automated value-add proxy: ${JSON.stringify(observations)}\\n`,
  );
}

async function assertSystemsOverview(browser) {
  const desktop = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  try {
    const page = await desktop.newPage();

    for (const target of [
      {
        path: '/en/systems',
        heading: 'Systems',
        summary: 'Operational visibility built from industrial context and inspectable evidence.',
        inspect: 'Inspect system',
      },
      {
        path: '/fr/systems',
        heading: 'Systèmes',
        summary: 'Visibilité opérationnelle issue d’un contexte industriel et de preuves inspectables.',
        inspect: 'Inspecter le système',
      },
    ]) {
      const response = await page.goto(`${origin}${target.path}`);
      assert.equal(response?.status(), 200);
      await page.getByRole('heading', { level: 1, name: target.heading, exact: true }).waitFor();
      const sentinel = page.locator('.aks-systems-entry').filter({
        has: page.getByText('Sentinel', { exact: true }),
      });
      await sentinel.waitFor();
      await sentinel.getByText(target.summary, { exact: true }).waitFor();
      const inspectLabel = sentinel.locator('.aks-systems-inspect');
      await inspectLabel.waitFor();
      assert.match(
        await inspectLabel.innerText(),
        new RegExp(`^${target.inspect}`),
        'Systems overview must expose an explicit inspection action.',
      );
      assert.equal(
        await sentinel.getAttribute('href'),
        `${target.path}/sentinel`,
        'Systems overview must deep-link to the localized published System.',
      );
      assert.equal(
        /React|Docker/.test(await sentinel.innerText()),
        false,
        'Systems overview must not collapse into a dense technology grid.',
      );
      assert.equal(
        await page.locator('link[rel="canonical"]').getAttribute('href'),
        `https://akiksystems.com${target.path}`,
      );
    }
  } finally {
    await desktop.close();
  }

  const mobile = await browser.newContext({ viewport: { width: 320, height: 720 } });
  try {
    const page = await mobile.newPage();
    for (const path of ['/en/systems', '/fr/systems']) {
      await page.goto(`${origin}${path}`);
      await page.locator('.aks-systems-entry').first().waitFor();
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
        true,
        `${path} Systems overview must not overflow at 320px.`,
      );
      await assertAxe(page);
    }
  } finally {
    await mobile.close();
  }
}

async function assertSystemProofTransparency(page, locale, expectations = []) {
  const panel = page.locator('.aks-system-proof-transparency');
  await panel
    .getByRole('heading', {
      level: 2,
      name: locale === 'fr' ? 'Transparence de preuve' : 'Proof transparency',
      exact: true,
    })
    .waitFor();

  const text = await panel.innerText();
  for (const label of locale === 'fr'
    ? ['Rôle', 'Maturité', 'Nature de la démo', 'Nature des données', 'Limites']
    : ['Role', 'Maturity', 'Demo nature', 'Data nature', 'Limits']) {
    assert.match(text, new RegExp(label, 'i'));
  }

  for (const expectation of expectations) {
    assert.match(text, expectation);
  }
}

async function assertOptimizedSystemMedia(page, path) {
  const image = page.locator('.aks-system-presentation-figure img').first();
  await image.waitFor({ state: 'attached' });

  const width = Number(await image.getAttribute('width'));
  const height = Number(await image.getAttribute('height'));
  assert.ok(width > 0, `${path} System media must expose a positive intrinsic width.`);
  assert.ok(height > 0, `${path} System media must expose a positive intrinsic height.`);
  assert.equal(
    await image.getAttribute('loading'),
    'lazy',
    `${path} System media must lazy-load below the initial reading.`,
  );
  assert.match(
    (await image.getAttribute('sizes')) ?? '',
    /max-width: 48rem/,
    `${path} System media must publish a mobile-aware sizes contract.`,
  );

  const srcset = (await image.getAttribute('srcset')) ?? '';
  assert.match(
    srcset,
    /\?width=(320|640|960|1280)\s+\d+w/,
    `${path} System media must expose real width variants through srcset.`,
  );

  const firstVariant = srcset.split(',')[0]?.trim().split(/\s+/)[0];
  assert.ok(firstVariant, `${path} must expose at least one responsive media variant.`);
  const variantResponse = await page.request.get(new URL(firstVariant, origin).toString());
  assert.equal(
    variantResponse.status(),
    200,
    `${path} responsive media variant must be served successfully.`,
  );
  assert.match(
    variantResponse.headers()['cache-control'] ?? '',
    /immutable/,
    `${path} generated responsive variants must be cacheable as immutable assets.`,
  );
}

function bootstrapL4QualificationSystems() {
  for (const command of [
    'db:bootstrap-protocap-qualification',
    'db:bootstrap-oria-qualification',
    'db:bootstrap-tugeres-qualification',
  ]) {
    execFileSync('pnpm', [command], {
      cwd: process.cwd(),
      env: process.env,
      stdio: 'pipe',
    });
  }
}

async function assertProtoCapGuidedDemo(browser) {
  const desktop = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  try {
    const page = await desktop.newPage();

    for (const target of [
      { path: '/en/systems/protocap', hypothesis: 'Hypothesis', future: 'Future integration' },
      { path: '/fr/systems/protocap', hypothesis: 'Hypothèse', future: 'Intégration future' },
    ]) {
      const response = await page.goto(`${origin}${target.path}`);
      assert.equal(response?.status(), 200);
      await page.getByRole('heading', { level: 1, name: 'ProtoCap', exact: true }).waitFor();
      assert.equal(
        await page.locator('.aks-system-experience').getAttribute('data-renderer'),
        'guided-demo',
        'ProtoCap must resolve through the guided-demo renderer.',
      );
      await page.getByText(target.hypothesis, { exact: true }).waitFor();
      await page.getByText(target.future, { exact: true }).waitFor();
      const deferredDemo = page.locator('[data-demo-loading="deferred"]');
      assert.equal(
        await deferredDemo.count(),
        1,
        'ProtoCap must defer external demo entry behind one explicit disclosure.',
      );
      assert.equal(
        await page.locator('iframe').count(),
        0,
        'ProtoCap must not embed or load a third-party demo frame on initial render.',
      );
      assert.equal(
        await deferredDemo.locator('a[href="https://protocap-demo-production.up.railway.app/demo"]').count(),
        1,
        'ProtoCap must keep the isolated public demo available after explicit intent.',
      );
      await assertOptimizedSystemMedia(page, target.path);
      assert.match(await page.locator('body').innerText(), /fictitious|fictives/i);
      assert.match(await page.locator('body').innerText(), /L'Oreal \/ La Roche-Posay/);
      await assertSystemProofTransparency(
        page,
        target.path.startsWith('/fr/') ? 'fr' : 'en',
        target.path.startsWith('/fr/')
          ? [/démonstrateur/i, /synthétiques/i, /déploiement industriel/i]
          : [/engineering portfolio/i, /synthetic demonstration data/i, /industrial deployment/i],
      );
      await assertAxe(page);
    }
  } finally {
    await desktop.close();
  }

  const mobile = await browser.newContext({ viewport: { width: 320, height: 720 } });
  try {
    const page = await mobile.newPage();
    for (const path of ['/en/systems/protocap', '/fr/systems/protocap']) {
      const response = await page.goto(`${origin}${path}`);
      assert.equal(response?.status(), 200);
      await page.getByRole('heading', { level: 1, name: 'ProtoCap', exact: true }).waitFor();
      await assertSystemProofTransparency(page, path.startsWith('/fr/') ? 'fr' : 'en');
      await assertOptimizedSystemMedia(page, path);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
        true,
        `${path} guided demo must not overflow at 320px.`,
      );
      await assertAxe(page);
    }
  } finally {
    await mobile.close();
  }
}

async function assertOriaInteractiveEntry(browser) {
  const desktop = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  try {
    const page = await desktop.newPage();

    for (const target of [
      {
        path: '/en/systems/oria-nutrition',
        liveLabel: 'Open the live application in a new tab',
        returnLabel: 'Back to Systems',
      },
      {
        path: '/fr/systems/oria-nutrition',
        liveLabel: 'Ouvrir l’application dans un nouvel onglet',
        returnLabel: 'Retour aux Systèmes',
      },
    ]) {
      const response = await page.goto(`${origin}${target.path}`);
      assert.equal(response?.status(), 200);
      await page.getByRole('heading', { level: 1, name: 'Oria Nutrition', exact: true }).waitFor();
      assert.equal(
        await page.locator('.aks-system-experience').getAttribute('data-renderer'),
        'interactive-entry',
        'Oria must resolve through the interactive-entry renderer.',
      );

      const liveLink = page.getByRole('link', { name: target.liveLabel, exact: true });
      await liveLink.waitFor();
      assert.equal(
        await liveLink.getAttribute('href'),
        'https://amineakik.github.io/orianutrition/',
      );
      assert.equal(await liveLink.getAttribute('target'), '_blank');
      assert.equal(await liveLink.getAttribute('rel'), 'noopener noreferrer');

      const returnLink = page.getByRole('link', { name: target.returnLabel, exact: true });
      assert.equal(
        await returnLink.getAttribute('href'),
        target.path.startsWith('/fr/') ? '/fr/systems' : '/en/systems',
      );

      const before = page.url();
      const [external] = await Promise.all([
        desktop.waitForEvent('page'),
        liveLink.click(),
      ]);
      await external.waitForLoadState('domcontentloaded').catch(() => undefined);
      assert.equal(
        page.url(),
        before,
        'Opening Oria must preserve the AkikSystems page as the return point.',
      );
      await external.close();

      assert.match(await page.locator('body').innerText(), /non-industrial|non industriel/i);
      assert.match(await page.locator('body').innerText(), /No real client data|Aucune donnee de client reel/i);
      await assertSystemProofTransparency(
        page,
        target.path.startsWith('/fr/') ? 'fr' : 'en',
        target.path.startsWith('/fr/')
          ? [/non industrielle/i, /fictif/i, /cabinet de nutrition/i]
          : [/non-industrial/i, /fictional/i, /operating nutrition practice/i],
      );
      await assertOptimizedSystemMedia(page, target.path);
      await assertAxe(page);
    }
  } finally {
    await desktop.close();
  }

  const mobile = await browser.newContext({ viewport: { width: 320, height: 720 } });
  try {
    const page = await mobile.newPage();
    for (const path of ['/en/systems/oria-nutrition', '/fr/systems/oria-nutrition']) {
      const response = await page.goto(`${origin}${path}`);
      assert.equal(response?.status(), 200);
      await page.getByRole('heading', { level: 1, name: 'Oria Nutrition', exact: true }).waitFor();
      await assertSystemProofTransparency(page, path.startsWith('/fr/') ? 'fr' : 'en');
      await assertOptimizedSystemMedia(page, path);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
        true,
        `${path} interactive entry must not overflow at 320px.`,
      );
      await assertAxe(page);
    }
  } finally {
    await mobile.close();
  }
}

async function assertTugeresStandardSystem(browser) {
  const desktop = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  try {
    const page = await desktop.newPage();

    for (const target of [
      { path: '/en/systems/tugeres', heading: 'Tugères' },
      { path: '/fr/systems/tugeres', heading: 'Tugères' },
    ]) {
      const response = await page.goto(`${origin}${target.path}`);
      assert.equal(response?.status(), 200);
      await page.getByRole('heading', { level: 1, name: target.heading, exact: true }).waitFor();
      assert.equal(
        await page.locator('.aks-system-experience').getAttribute('data-renderer'),
        'standard',
        'Tugeres must resolve through the standard renderer.',
      );

      const body = await page.locator('body').innerText();
      assert.match(body, /Stripe/i);
      assert.match(body, /MySQL/i);
      assert.match(body, /customer deployment|déploiement client/i);
      assert.equal(
        await page.locator('a[href*="tugeres.fr"]').count(),
        0,
        'Tugeres must not invent a live deployment link.',
      );
      assert.equal(
        await page.locator('a[href="https://unsupported.example.test/live"]').count(),
        0,
        'documented_only must suppress an unsupported stored live link.',
      );
      assert.equal(
        await page.locator('a[href="https://unsupported.example.test/demo"]').count(),
        0,
        'documented_only must suppress an unsupported stored demo link.',
      );
      await assertSystemProofTransparency(
        page,
        target.path.startsWith('/fr/') ? 'fr' : 'en',
        target.path.startsWith('/fr/')
          ? [/white-label/i, /déploiement client actif non prouvé/i, /Aucune démo publique/i]
          : [/White-label catering/i, /customer deployment not evidenced/i, /No supportable public demo/i],
      );
      await assertOptimizedSystemMedia(page, target.path);
      await assertAxe(page);
    }
  } finally {
    await desktop.close();
  }

  const mobile = await browser.newContext({ viewport: { width: 320, height: 720 } });
  try {
    const page = await mobile.newPage();
    for (const path of ['/en/systems/tugeres', '/fr/systems/tugeres']) {
      const response = await page.goto(`${origin}${path}`);
      assert.equal(response?.status(), 200);
      await page.getByRole('heading', { level: 1, name: 'Tugères', exact: true }).waitFor();
      await assertSystemProofTransparency(page, path.startsWith('/fr/') ? 'fr' : 'en');
      await assertOptimizedSystemMedia(page, path);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
        true,
        `${path} Tugeres detail must not overflow at 320px.`,
      );
      await assertAxe(page);
    }
  } finally {
    await mobile.close();
  }
}

async function assertReusableSystemReferences(browser) {
  const desktop = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  try {
    const page = await desktop.newPage();
    for (const target of [
      { path: '/en/writings', locale: 'en', heading: 'Writings' },
      { path: '/fr/ecrits', locale: 'fr', heading: 'Écrits' },
    ]) {
      const response = await page.goto(`${origin}${target.path}`);
      assert.equal(response?.status(), 200);
      await page.getByRole('heading', { level: 1, name: target.heading, exact: true }).waitFor();

      const references = page.locator('.aks-system-reference');
      assert.ok(
        (await references.count()) >= 2,
        `${target.path} must demonstrate at least two published reusable System references.`,
      );
      const first = references.first();
      assert.match(await first.innerText(), /Role|Rôle/i);
      assert.match(await first.innerText(), /Maturity|Maturité/i);

      const hrefs = await references.locator('a').evaluateAll((links) =>
        links.map((link) => link.getAttribute('href')),
      );
      for (const href of hrefs) {
        assert.ok(
          typeof href === 'string' && href.startsWith(`/${target.locale}/systems/`),
          `${target.path} must use locale-safe System deep links, received ${href}.`,
        );
      }
      await assertAxe(page);
    }
  } finally {
    await desktop.close();
  }

  const mobile = await browser.newContext({ viewport: { width: 320, height: 720 } });
  try {
    const page = await mobile.newPage();
    for (const path of ['/en/writings', '/fr/ecrits']) {
      const response = await page.goto(`${origin}${path}`);
      assert.equal(response?.status(), 200);
      await page.locator('.aks-system-reference').first().waitFor();
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
        true,
        `${path} reusable System references must not overflow at 320px.`,
      );
      await assertAxe(page);
    }
  } finally {
    await mobile.close();
  }
}


function assertHtmlTagAttributes(html, tagName, attributes, message) {
  const tags = html.match(new RegExp('<' + tagName + '\\b[^>]*>', 'gi')) ?? [];
  const found = tags.some((tag) => {
    const normalizedTag = tag.toLowerCase();
    return Object.entries(attributes).every(([name, value]) => {
      const normalizedName = name.toLowerCase();
      const normalizedValue = String(value).toLowerCase();
      return (
        normalizedTag.includes(normalizedName + '="' + normalizedValue + '"') ||
        normalizedTag.includes(normalizedName + "='" + normalizedValue + "'")
      );
    });
  });
  assert.equal(found, true, message);
}

async function assertLearningSeo(browser) {
  const context = await browser.newContext();
  try {
    const targets = [
      {
        path: '/en/learning',
        locale: 'en',
        title: 'Learning',
        description: 'Training context and inspectable learning evidence at AkikSystems.',
        alternateLocale: 'fr',
        alternatePath: '/fr/apprentissage',
        xDefaultPath: '/en/learning',
        heading: 'Learning',
        summary: 'The journey provides context.',
      },
      {
        path: '/fr/apprentissage',
        locale: 'fr',
        title: 'Apprentissage',
        description:
          'Contexte de formation et preuves d’apprentissage inspectables chez AkikSystems.',
        alternateLocale: 'en',
        alternatePath: '/en/learning',
        xDefaultPath: '/en/learning',
        heading: 'Apprentissage',
        summary: 'Le parcours donne le contexte.',
      },
      {
        path: '/en/learning/qualified-training',
        locale: 'en',
        title: 'Qualified Training',
        description: 'Published Training context.',
        alternateLocale: 'fr',
        alternatePath: '/fr/apprentissage/formation-qualifiee',
        xDefaultPath: '/en/learning/qualified-training',
        heading: 'Qualified Training',
        summary: 'Published Training context.',
      },
      {
        path: '/fr/apprentissage/formation-qualifiee',
        locale: 'fr',
        title: 'Formation qualifiée',
        description: 'Contexte de formation publié.',
        alternateLocale: 'en',
        alternatePath: '/en/learning/qualified-training',
        xDefaultPath: '/en/learning/qualified-training',
        heading: 'Formation qualifiée',
        summary: 'Contexte de formation publié.',
      },
      {
        path: '/en/learning/credentials/qualified-credential',
        locale: 'en',
        title: 'Qualified Credential',
        description: 'Published Credential evidence.',
        alternateLocale: 'fr',
        alternatePath: '/fr/apprentissage/justificatifs/justificatif-qualifie',
        xDefaultPath: '/en/learning/credentials/qualified-credential',
        heading: 'Qualified Credential',
        summary: 'Published Credential evidence.',
      },
      {
        path: '/fr/apprentissage/justificatifs/justificatif-qualifie',
        locale: 'fr',
        title: 'Justificatif qualifié',
        description: 'Preuve Credential publiée.',
        alternateLocale: 'en',
        alternatePath: '/en/learning/credentials/qualified-credential',
        xDefaultPath: '/en/learning/credentials/qualified-credential',
        heading: 'Justificatif qualifié',
        summary: 'Preuve Credential publiée.',
      },
      {
        path: '/en/learning/artifacts/qualified-learning-artifact',
        locale: 'en',
        title: 'Qualified Learning Artifact',
        description: 'Published first-class learning evidence.',
        alternateLocale: 'fr',
        alternatePath: '/fr/apprentissage/preuves/preuve-apprentissage-qualifiee',
        xDefaultPath: '/en/learning/artifacts/qualified-learning-artifact',
        heading: 'Qualified Learning Artifact',
        summary: 'Published first-class learning evidence.',
      },
      {
        path: '/fr/apprentissage/preuves/preuve-apprentissage-qualifiee',
        locale: 'fr',
        title: 'Preuve d’apprentissage qualifiée',
        description: 'Preuve d’apprentissage de premier rang publiée.',
        alternateLocale: 'en',
        alternatePath: '/en/learning/artifacts/qualified-learning-artifact',
        xDefaultPath: '/en/learning/artifacts/qualified-learning-artifact',
        heading: 'Preuve d’apprentissage qualifiée',
        summary: 'Preuve d’apprentissage de premier rang publiée.',
      },
    ];

    for (const target of targets) {
      const response = await context.request.get(origin + target.path);
      assert.equal(response.status(), 200);
      const html = await response.text();
      const canonicalUrl = 'https://akiksystems.com' + target.path;
      const alternateUrl = 'https://akiksystems.com' + target.alternatePath;
      const xDefaultUrl = 'https://akiksystems.com' + target.xDefaultPath;

      assert.match(
        html,
        new RegExp('<html[^>]+lang=["\\\']' + target.locale + '["\\\']', 'i'),
        target.path + ' must SSR the localized document language.',
      );
      assert.ok(
        html.includes('<title>' + target.title + ' · AkikSystems</title>'),
        target.path + ' must SSR its localized title before hydration.',
      );
      assertHtmlTagAttributes(
        html,
        'meta',
        { name: 'description', content: target.description },
        target.path + ' must SSR its localized description.',
      );
      assertHtmlTagAttributes(
        html,
        'meta',
        {
          name: 'robots',
          content: 'index, follow, max-image-preview:large, max-snippet:-1',
        },
        target.path + ' must be explicitly indexable.',
      );
      assertHtmlTagAttributes(
        html,
        'link',
        { rel: 'canonical', href: canonicalUrl },
        target.path + ' must expose its autonomous canonical URL.',
      );
      assertHtmlTagAttributes(
        html,
        'link',
        { rel: 'alternate', hreflang: target.locale, href: canonicalUrl },
        target.path + ' must expose a self hreflang.',
      );
      assertHtmlTagAttributes(
        html,
        'link',
        {
          rel: 'alternate',
          hreflang: target.alternateLocale,
          href: alternateUrl,
        },
        target.path + ' must expose its localized alternate.',
      );
      assertHtmlTagAttributes(
        html,
        'link',
        { rel: 'alternate', hreflang: 'x-default', href: xDefaultUrl },
        target.path + ' must point x-default at the English equivalent.',
      );
      assertHtmlTagAttributes(
        html,
        'meta',
        { property: 'og:title', content: target.title },
        target.path + ' must expose an Open Graph title.',
      );
      assertHtmlTagAttributes(
        html,
        'meta',
        { property: 'og:description', content: target.description },
        target.path + ' must expose an Open Graph description.',
      );
      assertHtmlTagAttributes(
        html,
        'meta',
        { property: 'og:url', content: canonicalUrl },
        target.path + ' must expose the canonical Open Graph URL.',
      );
      assertHtmlTagAttributes(
        html,
        'meta',
        {
          property: 'og:locale',
          content: target.locale === 'fr' ? 'fr_FR' : 'en_US',
        },
        target.path + ' must expose the localized Open Graph locale.',
      );
      assertHtmlTagAttributes(
        html,
        'meta',
        { name: 'twitter:card', content: 'summary' },
        target.path + ' must expose a stable Twitter card contract.',
      );
      assert.ok(
        html.includes(target.heading) && html.includes(target.summary),
        target.path +
          ' must contain title/summary inspection content in the initial HTML.',
      );
    }

    for (const path of [
      '/en/learning/not-published',
      '/en/learning/credentials/not-published',
      '/en/learning/artifacts/not-published',
    ]) {
      const response = await context.request.get(origin + path);
      assert.equal(response.status(), 404);
      const html = await response.text();
      assertHtmlTagAttributes(
        html,
        'meta',
        {
          name: 'robots',
          content: 'noindex, nofollow, noarchive, nosnippet',
        },
        path + ' must not become an indexable fallback page.',
      );
    }

    for (const path of [
      '/en/learning/credentials/qualified-credential/source',
      '/en/learning/artifacts/qualified-learning-artifact/source',
    ]) {
      const response = await context.request.get(origin + path);
      assert.equal(response.status(), 404);
      assert.match(
        response.headers()['x-robots-tag'] ?? '',
        /noindex/i,
        path + ' source documents must remain outside search indexes.',
      );
    }
  } finally {
    await context.close();
  }
}


function bootstrapL5TrainingQualification() {
  execFileSync('pnpm', ['db:bootstrap-training-qualification'], {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'pipe',
  });
}

async function assertTrainingPublicJourney(browser) {
  bootstrapL5TrainingQualification();

  const desktop = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  try {
    const page = await desktop.newPage();
    const targets = [
      {
        locale: 'en',
        overviewPath: '/en/learning',
        overviewHeading: 'Learning',
        detailPath: '/en/learning/qualified-training',
        detailHeading: 'Qualified Training',
        summary: 'Published Training context.',
        dateRange: '2025-01-01 → 2025-06-30',
        alternateLocale: 'fr',
        alternatePath: '/fr/apprentissage/formation-qualifiee',
      },
      {
        locale: 'fr',
        overviewPath: '/fr/apprentissage',
        overviewHeading: 'Apprentissage',
        detailPath: '/fr/apprentissage/formation-qualifiee',
        detailHeading: 'Formation qualifiée',
        summary: 'Contexte de formation publié.',
        dateRange: '2025-01-01 → 2025-06-30',
        alternateLocale: 'en',
        alternatePath: '/en/learning/qualified-training',
      },
    ];

    for (const target of targets) {
      const overviewResponse = await page.goto(`${origin}${target.overviewPath}`);
      assert.equal(overviewResponse?.status(), 200);
      await page
        .getByRole('heading', { level: 1, name: target.overviewHeading, exact: true })
        .waitFor();
      await page
        .getByRole('heading', { level: 3, name: target.detailHeading, exact: true })
        .waitFor();
      assert.equal(
        await page.locator(`a[href="${target.detailPath}"]`).count(),
        1,
        `${target.overviewPath} must link to the published Training deep route.`,
      );
      assert.match(await page.locator('body').innerText(), /Qualification Provider/i);
      await assertAxe(page);

      const detailResponse = await page.goto(`${origin}${target.detailPath}`);
      assert.equal(detailResponse?.status(), 200);
      await page
        .getByRole('heading', { level: 1, name: target.detailHeading, exact: true })
        .waitFor();
      const body = await page.locator('body').innerText();
      assert.match(body, /Qualification Provider/i);
      assert.ok(
        body.includes(target.summary),
        `${target.detailPath} must expose the published Training summary.`,
      );
      assert.ok(
        body.includes(target.dateRange),
        `${target.detailPath} must expose stable date-only Training boundaries.`,
      );
      assert.equal(
        await page
          .locator(`.aks-experience-meta a[hreflang="${target.alternateLocale}"]`)
          .getAttribute('href'),
        target.alternatePath,
        'Published Training translations must switch to the equivalent localized deep route.',
      );
      assert.equal(
        await page.locator('link[rel="canonical"]').getAttribute('href'),
        `https://akiksystems.com${target.detailPath}`,
        'Training detail must expose its canonical deep URL.',
      );
      await assertAxe(page);
    }
  } finally {
    await desktop.close();
  }

  const mobile = await browser.newContext({ viewport: { width: 320, height: 720 } });
  try {
    const page = await mobile.newPage();
    for (const path of [
      '/en/learning',
      '/fr/apprentissage',
      '/en/learning/qualified-training',
      '/fr/apprentissage/formation-qualifiee',
    ]) {
      const response = await page.goto(`${origin}${path}`);
      assert.equal(response?.status(), 200);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
        true,
        `${path} Training surface must not overflow at 320px.`,
      );
      await assertAxe(page);
    }
  } finally {
    await mobile.close();
  }
}

function bootstrapL5CredentialQualification() {
  execFileSync('pnpm', ['db:bootstrap-credential-qualification'], {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'pipe',
  });
}

async function assertCredentialPublicJourney(browser) {
  bootstrapL5CredentialQualification();

  const desktop = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  try {
    const page = await desktop.newPage();
    const targets = [
      {
        locale: 'en',
        trainingPath: '/en/learning/qualified-training',
        credentialPath: '/en/learning/credentials/qualified-credential',
        heading: 'Qualified Credential',
        summary: 'Published Credential evidence.',
        alternateLocale: 'fr',
        alternatePath: '/fr/apprentissage/justificatifs/justificatif-qualifie',
        sourcePath: '/en/learning/credentials/qualified-credential/source',
      },
      {
        locale: 'fr',
        trainingPath: '/fr/apprentissage/formation-qualifiee',
        credentialPath: '/fr/apprentissage/justificatifs/justificatif-qualifie',
        heading: 'Justificatif qualifié',
        summary: 'Preuve Credential publiée.',
        alternateLocale: 'en',
        alternatePath: '/en/learning/credentials/qualified-credential',
        sourcePath: '/fr/apprentissage/justificatifs/justificatif-qualifie/source',
      },
    ];

    for (const target of targets) {
      const trainingResponse = await page.goto(`${origin}${target.trainingPath}`);
      assert.equal(trainingResponse?.status(), 200);
      assert.equal(
        await page.locator(`a[href="${target.credentialPath}"]`).count(),
        1,
        `${target.trainingPath} must expose the connected published Credential.`,
      );

      const credentialResponse = await page.goto(`${origin}${target.credentialPath}`);
      assert.equal(credentialResponse?.status(), 200);
      await page
        .getByRole('heading', { level: 1, name: target.heading, exact: true })
        .waitFor();
      const body = await page.locator('body').innerText();
      assert.ok(body.includes(target.summary));
      assert.match(body, /Qualification Authority/i);
      assert.equal(
        await page.locator('a[href="https://example.com/verify/qualified-credential"]').count(),
        1,
        'Credential must expose its optional issuer verification URL.',
      );
      assert.equal(
        await page.locator(`a[href="${target.trainingPath}"]`).count(),
        1,
        'Credential must link back to its localized Training context.',
      );
      assert.equal(
        await page
          .locator(`.aks-experience-meta a[hreflang="${target.alternateLocale}"]`)
          .getAttribute('href'),
        target.alternatePath,
        'Credential translations must switch to the equivalent localized deep route.',
      );
      assert.equal(
        await page.locator('link[rel="canonical"]').getAttribute('href'),
        `https://akiksystems.com${target.credentialPath}`,
      );
      const sourceResponse = await desktop.request.get(`${origin}${target.sourcePath}`);
      assert.equal(
        sourceResponse.status(),
        404,
        'A Credential without a source asset must not expose a fabricated document.',
      );
      await assertAxe(page);
    }
  } finally {
    await desktop.close();
  }

  const mobile = await browser.newContext({ viewport: { width: 320, height: 720 } });
  try {
    const page = await mobile.newPage();
    for (const path of [
      '/en/learning/credentials/qualified-credential',
      '/fr/apprentissage/justificatifs/justificatif-qualifie',
    ]) {
      const response = await page.goto(`${origin}${path}`);
      assert.equal(response?.status(), 200);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
        true,
        `${path} Credential surface must not overflow at 320px.`,
      );
      await assertAxe(page);
    }
  } finally {
    await mobile.close();
  }
}

async function assertCredentialAdmin(page) {
  await page.goto(`${origin}/admin/learning/credentials`);
  await page
    .getByRole('heading', { level: 1, name: 'Credential administration', exact: true })
    .waitFor();
  await page
    .getByRole('heading', { level: 2, name: 'Qualified Credential', exact: true })
    .waitFor();
  assert.equal(
    await page.getByRole('button', { name: 'Create Credential', exact: true }).count(),
    1,
    'Credential must remain manageable from the private Learning administration.',
  );
}

async function assertFutureCredentialExtensibility(page) {
  await page.goto(origin + '/admin/learning/credentials');
  await page
    .getByRole('heading', {
      level: 1,
      name: 'Credential administration',
      exact: true,
    })
    .waitFor();

  const createForm = page.locator('form').filter({
    has: page.getByRole('heading', {
      level: 2,
      name: 'Create Credential',
      exact: true,
    }),
  });

  assert.deepEqual(
    await createForm.locator('select[name="kind"] option').allTextContents(),
    ['diploma', 'title', 'certification'],
    'Future diploma/title/certification evidence must use the same admin model.',
  );

  await createForm.locator('select[name="kind"]').selectOption('diploma');
  await createForm.locator('input[name="issuer"]').fill('Future Credential Authority');
  await createForm.locator('input[name="issuedOn"]').fill('2026-09-01');
  await createForm
    .locator('select[name="trainingId"]')
    .selectOption({ label: 'Qualified Training' });
  await createForm.getByRole('button', { name: 'Create Credential', exact: true }).click();
  await page.getByText('Credential created.', { exact: true }).waitFor();

  const futureCard = () =>
    page
      .locator('section.aks-admin-card')
      .filter({ hasText: 'Future Credential Authority' })
      .last();

  await futureCard().waitFor();
  assert.ok(
    (await futureCard().innerText()).includes('diploma · Future Credential Authority'),
    'The future Credential must be created as generic diploma evidence.',
  );
  assert.ok(
    (await futureCard().innerText()).includes('Training connected'),
    'The future Credential must keep Training as an optional connected context.',
  );

  const fillLocalization = async ({
    index,
    locale,
    slug,
    title,
    summary,
    body,
  }) => {
    let fieldset = futureCard().locator('fieldset').nth(index);
    await fieldset.locator('input[name="slug"]').fill(slug);
    await fieldset.locator('input[name="title"]').fill(title);
    await fieldset.locator('textarea[name="summary"]').fill(summary);
    await fieldset.locator('textarea[name="body"]').fill(body);
    await fieldset
      .getByRole('button', { name: 'Save ' + locale + ' draft', exact: true })
      .click();
    await page
      .getByText(locale + ' Credential draft saved.', { exact: true })
      .waitFor();

    fieldset = futureCard().locator('fieldset').nth(index);
    await fieldset
      .getByRole('button', { name: 'Publish ' + locale, exact: true })
      .click();
    await page
      .getByText(locale + ' Credential published.', { exact: true })
      .waitFor();
  };

  await fillLocalization({
    index: 0,
    locale: 'EN',
    slug: 'future-platform-diploma',
    title: 'Future Platform Diploma',
    summary: 'Future diploma added through the existing Learning administration.',
    body: 'Inspection depth for a future diploma created without credential-specific application code.',
  });

  await fillLocalization({
    index: 1,
    locale: 'FR',
    slug: 'futur-diplome-plateforme',
    title: 'Futur diplôme plateforme',
    summary: 'Futur diplôme ajouté depuis l’administration Learning existante.',
    body: 'Niveau d’inspection pour un futur diplôme créé sans code applicatif spécifique au justificatif.',
  });

  const publishedAdminText = await futureCard().innerText();
  assert.ok(publishedAdminText.includes('EN Published · FR Published'));
  assert.ok(publishedAdminText.includes('Training connected'));

  const targets = [
    {
      overviewPath: '/en/learning',
      credentialPath: '/en/learning/credentials/future-platform-diploma',
      title: 'Future Platform Diploma',
      summary: 'Future diploma added through the existing Learning administration.',
      detail: 'Inspection depth for a future diploma created without credential-specific application code.',
      kind: 'Diploma',
      trainingPath: '/en/learning/qualified-training',
      trainingTitle: 'Qualified Training',
      alternateLocale: 'fr',
      alternatePath: '/fr/apprentissage/justificatifs/futur-diplome-plateforme',
    },
    {
      overviewPath: '/fr/apprentissage',
      credentialPath: '/fr/apprentissage/justificatifs/futur-diplome-plateforme',
      title: 'Futur diplôme plateforme',
      summary: 'Futur diplôme ajouté depuis l’administration Learning existante.',
      detail: 'Niveau d’inspection pour un futur diplôme créé sans code applicatif spécifique au justificatif.',
      kind: 'Diplôme',
      trainingPath: '/fr/apprentissage/formation-qualifiee',
      trainingTitle: 'Formation qualifiée',
      alternateLocale: 'en',
      alternatePath: '/en/learning/credentials/future-platform-diploma',
    },
  ];

  for (const target of targets) {
    const overviewResponse = await page.goto(origin + target.overviewPath);
    assert.equal(overviewResponse?.status(), 200);
    await page
      .getByRole('heading', { level: 3, name: target.title, exact: true })
      .waitFor();
    assert.equal(
      await page.locator('a[href="' + target.credentialPath + '"]').count(),
      1,
      'A future Credential must appear at Learning summary depth without a dedicated renderer.',
    );
    const overviewText = await page.locator('body').innerText();
    assert.ok(overviewText.includes(target.summary));
    assert.ok(overviewText.includes(target.trainingTitle));

    const detailResponse = await page.goto(origin + target.credentialPath);
    assert.equal(detailResponse?.status(), 200);
    await page
      .getByRole('heading', { level: 1, name: target.title, exact: true })
      .waitFor();

    const detailText = await page.locator('body').innerText();
    assert.ok(detailText.includes(target.summary));
    assert.ok(detailText.includes(target.detail));
    assert.equal(
      (await page.locator('.aks-proof-eyebrow').first().textContent())?.trim(),
      target.kind,
      'The generic Credential renderer must expose the localized evidence kind.',
    );
    assert.ok(detailText.includes('Future Credential Authority'));
    assert.equal(
      await page
        .getByRole('link', { name: target.trainingTitle, exact: true })
        .getAttribute('href'),
      target.trainingPath,
      'Future evidence must keep its Training context distinct and connected.',
    );
    assert.equal(
      await page
        .locator('.aks-experience-meta a[hreflang="' + target.alternateLocale + '"]')
        .getAttribute('href'),
      target.alternatePath,
      'Future Credentials must be bilingual and switch to the equivalent deep route.',
    );
    assert.equal(
      await page.locator('link[rel="canonical"]').getAttribute('href'),
      'https://akiksystems.com' + target.credentialPath,
    );
    await assertAxe(page);
  }
}

function bootstrapL5LearningArtifactQualification() {
  execFileSync('pnpm', ['db:bootstrap-learning-artifact-qualification'], {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'pipe',
  });
}

async function assertLearningArtifactPublicJourney(browser) {
  bootstrapL5LearningArtifactQualification();

  const desktop = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  try {
    const page = await desktop.newPage();
    const targets = [
      {
        trainingPath: '/en/learning/qualified-training',
        artifactPath: '/en/learning/artifacts/qualified-learning-artifact',
        heading: 'Qualified Learning Artifact',
        summary: 'Published first-class learning evidence.',
        systemPath: '/en/systems/sentinel',
        alternateLocale: 'fr',
        alternatePath: '/fr/apprentissage/preuves/preuve-apprentissage-qualifiee',
        sourcePath: '/en/learning/artifacts/qualified-learning-artifact/source',
      },
      {
        trainingPath: '/fr/apprentissage/formation-qualifiee',
        artifactPath: '/fr/apprentissage/preuves/preuve-apprentissage-qualifiee',
        heading: 'Preuve d’apprentissage qualifiée',
        summary: 'Preuve d’apprentissage de premier rang publiée.',
        systemPath: '/fr/systems/sentinel',
        alternateLocale: 'en',
        alternatePath: '/en/learning/artifacts/qualified-learning-artifact',
        sourcePath: '/fr/apprentissage/preuves/preuve-apprentissage-qualifiee/source',
      },
    ];

    for (const target of targets) {
      const trainingResponse = await page.goto(origin + target.trainingPath);
      assert.equal(trainingResponse?.status(), 200);
      assert.equal(
        await page.locator('a[href="' + target.artifactPath + '"]').count(),
        1,
        target.trainingPath + ' must expose the connected published LearningArtifact.',
      );

      const artifactResponse = await page.goto(origin + target.artifactPath);
      assert.equal(artifactResponse?.status(), 200);
      await page
        .getByRole('heading', { level: 1, name: target.heading, exact: true })
        .waitFor();

      const body = await page.locator('body').innerText();
      assert.ok(
        body.includes(target.summary),
        target.artifactPath + ' must expose summary-depth evidence.',
      );
      assert.equal(
        await page.locator('a[href="' + target.trainingPath + '"]').count(),
        1,
        'LearningArtifact must link back to its localized Training context.',
      );
      assert.equal(
        await page.locator('a[href="' + target.systemPath + '"]').count(),
        1,
        'LearningArtifact must expose its optional published System relation.',
      );
      assert.equal(
        await page
          .locator('.aks-experience-meta a[hreflang="' + target.alternateLocale + '"]')
          .getAttribute('href'),
        target.alternatePath,
        'LearningArtifact translations must switch to the equivalent localized deep route.',
      );
      assert.equal(
        await page.locator('link[rel="canonical"]').getAttribute('href'),
        'https://akiksystems.com' + target.artifactPath,
      );

      const systemResponse = await page.goto(origin + target.systemPath);
      assert.equal(systemResponse?.status(), 200);
      await page
        .getByRole('heading', { level: 1, name: 'Sentinel', exact: true })
        .waitFor();
      const systemEvidence = page.locator('.aks-system-learning-evidence');
      await systemEvidence
        .getByRole('heading', {
          level: 2,
          name: target.systemEvidenceHeading,
          exact: true,
        })
        .waitFor();
      await systemEvidence
        .getByRole('heading', { level: 3, name: target.heading, exact: true })
        .waitFor();
      assert.ok(
        (await systemEvidence.innerText()).includes(target.summary),
        'System summary depth must expose the connected LearningArtifact summary.',
      );
      assert.equal(
        await systemEvidence
          .getByRole('link', {
            name: target.inspectEvidenceLabel,
            exact: true,
          })
          .getAttribute('href'),
        target.artifactPath,
        'Sentinel must link back to its localized LearningArtifact.',
      );

      const sourceResponse = await desktop.request.get(origin + target.sourcePath);
      assert.equal(
        sourceResponse.status(),
        404,
        'A LearningArtifact without a source asset must not expose a fabricated document.',
      );
      await assertAxe(page);
    }
  } finally {
    await desktop.close();
  }

  const mobile = await browser.newContext({ viewport: { width: 320, height: 720 } });
  try {
    const page = await mobile.newPage();
    for (const path of [
      '/en/learning/artifacts/qualified-learning-artifact',
      '/fr/apprentissage/preuves/preuve-apprentissage-qualifiee',
    ]) {
      const response = await page.goto(origin + path);
      assert.equal(response?.status(), 200);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
        true,
        path + ' LearningArtifact surface must not overflow at 320px.',
      );
      await assertAxe(page);
    }
  } finally {
    await mobile.close();
  }
}

async function assertLearningOverviewExperience(browser) {
  const desktop = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  try {
    const page = await desktop.newPage();
    const targets = [
      {
        path: '/en/learning',
        heading: 'Learning',
        mapHeading: 'Two layers, one journey',
        evidenceHeading: 'Evidence to inspect',
        trainingHeading: 'Training journey',
        trainingTitle: 'Qualified Training',
        trainingPath: '/en/learning/qualified-training',
        credentialTitle: 'Qualified Credential',
        credentialPath: '/en/learning/credentials/qualified-credential',
        artifactTitle: 'Qualified Learning Artifact',
        artifactPath: '/en/learning/artifacts/qualified-learning-artifact',
        contextCopy: 'Context · Qualified Training',
      },
      {
        path: '/fr/apprentissage',
        heading: 'Apprentissage',
        mapHeading: 'Deux niveaux, un même parcours',
        evidenceHeading: 'Preuves à inspecter',
        trainingHeading: 'Parcours de formation',
        trainingTitle: 'Formation qualifiée',
        trainingPath: '/fr/apprentissage/formation-qualifiee',
        credentialTitle: 'Justificatif qualifié',
        credentialPath: '/fr/apprentissage/justificatifs/justificatif-qualifie',
        artifactTitle: 'Preuve d’apprentissage qualifiée',
        artifactPath: '/fr/apprentissage/preuves/preuve-apprentissage-qualifiee',
        contextCopy: 'Contexte · Formation qualifiée',
      },
    ];

    for (const target of targets) {
      const response = await page.goto(origin + target.path);
      assert.equal(response?.status(), 200);
      await page
        .getByRole('heading', { level: 1, name: target.heading, exact: true })
        .waitFor();
      await page
        .getByRole('heading', { level: 2, name: target.mapHeading, exact: true })
        .waitFor();
      await page
        .getByRole('heading', { level: 2, name: target.evidenceHeading, exact: true })
        .waitFor();
      await page
        .getByRole('heading', { level: 2, name: target.trainingHeading, exact: true })
        .waitFor();

      for (const item of [
        { title: target.trainingTitle, href: target.trainingPath },
        { title: target.credentialTitle, href: target.credentialPath },
        { title: target.artifactTitle, href: target.artifactPath },
      ]) {
        await page
          .getByRole('heading', { level: 3, name: item.title, exact: true })
          .waitFor();
        assert.equal(
          await page.locator('a[href="' + item.href + '"]').count(),
          1,
          target.path + ' must expose a direct deep link to ' + item.title + '.',
        );
      }

      const body = await page.locator('body').innerText();
      assert.ok(
        body.includes(target.contextCopy),
        target.path + ' must make the Training relationship legible beside evidence.',
      );
      assert.ok(
        body.includes(
          target.path === '/en/learning'
            ? '3 published evidence objects'
            : '3 preuves publiées',
        ),
        target.path + ' must surface all qualified evidence objects at overview depth.',
      );
      await assertAxe(page);
    }
  } finally {
    await desktop.close();
  }

  const mobile = await browser.newContext({ viewport: { width: 320, height: 720 } });
  try {
    const page = await mobile.newPage();
    for (const path of ['/en/learning', '/fr/apprentissage']) {
      const response = await page.goto(origin + path);
      assert.equal(response?.status(), 200);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
        true,
        path + ' Learning overview must not overflow at 320px.',
      );
      await assertAxe(page);
    }
  } finally {
    await mobile.close();
  }
}

async function assertLearningArtifactAdmin(page) {
  await page.goto(origin + '/admin/learning/artifacts');
  await page
    .getByRole('heading', {
      level: 1,
      name: 'LearningArtifact administration',
      exact: true,
    })
    .waitFor();
  await page
    .getByRole('heading', {
      level: 2,
      name: 'Qualified Learning Artifact',
      exact: true,
    })
    .waitFor();
  assert.equal(
    await page
      .getByRole('button', { name: 'Create LearningArtifact', exact: true })
      .count(),
    1,
    'LearningArtifact must remain manageable from private Learning administration.',
  );
}
async function assertLearningAdminWorkspace(page) {
  await page.goto(origin + '/admin/learning');
  await page
    .getByRole('heading', {
      level: 1,
      name: 'Learning administration',
      exact: true,
    })
    .waitFor();

  for (const domain of [
    {
      heading: 'Trainings',
      href: '/admin/learning/trainings',
      link: 'Manage Trainings',
    },
    {
      heading: 'Credentials',
      href: '/admin/learning/credentials',
      link: 'Manage Credentials',
    },
    {
      heading: 'LearningArtifacts',
      href: '/admin/learning/artifacts',
      link: 'Manage LearningArtifacts',
    },
  ]) {
    await page
      .getByRole('heading', { level: 2, name: domain.heading, exact: true })
      .waitFor();
    assert.equal(
      await page.getByRole('link', { name: domain.link, exact: true }).getAttribute('href'),
      domain.href,
      domain.heading + ' must keep a dedicated admin workspace.',
    );
  }

  const hubText = await page.locator('body').innerText();
  assert.match(
    hubText,
    /Training is context\. Credentials and LearningArtifacts are evidence\./,
  );
  const trainingCard = page
    .locator('article.aks-admin-card')
    .filter({
      has: page.getByRole('heading', {
        level: 2,
        name: 'Trainings',
        exact: true,
      }),
    });
  const credentialCard = page
    .locator('article.aks-admin-card')
    .filter({
      has: page.getByRole('heading', {
        level: 2,
        name: 'Credentials',
        exact: true,
      }),
    });
  const artifactCard = page
    .locator('article.aks-admin-card')
    .filter({
      has: page.getByRole('heading', {
        level: 2,
        name: 'LearningArtifacts',
        exact: true,
      }),
    });

  assert.ok(
    (await trainingCard.innerText()).includes('Published snapshots · EN 1 · FR 1'),
    'Training publication summary must remain bilingual.',
  );
  assert.ok(
    (await credentialCard.innerText()).includes('Published snapshots · EN 2 · FR 2'),
    'Credential publication summary must include the admin-created future diploma.',
  );
  assert.ok(
    (await credentialCard.innerText()).includes('2 connected to Training · 0 standalone'),
    'Credential relationship summary must include both connected evidence objects.',
  );
  assert.ok(
    (await artifactCard.innerText()).includes('Published snapshots · EN 1 · FR 1'),
    'LearningArtifact publication summary must remain bilingual.',
  );
  assert.ok(
    (await artifactCard.innerText()).includes('1 connected to System · 0 with source document'),
    'LearningArtifact relationship summary must remain intact.',
  );
  assert.equal(
    await page.getByRole('button', { name: 'Create Training', exact: true }).count(),
    0,
    'The Learning hub must not collapse Training editing into a generic CMS surface.',
  );

  await page.goto(origin + '/admin/learning/trainings');
  await page
    .getByRole('heading', {
      level: 1,
      name: 'Training administration',
      exact: true,
    })
    .waitFor();
  assert.equal(
    await page.getByRole('button', { name: 'Create Training', exact: true }).count(),
    1,
    'Training must remain manageable from its dedicated workspace.',
  );
  assert.equal(
    await page.getByRole('link', { name: 'Learning hub', exact: true }).getAttribute('href'),
    '/admin/learning',
  );

  await page.goto(origin + '/admin/learning/credentials');
  assert.equal(
    await page.getByRole('link', { name: 'Learning hub', exact: true }).getAttribute('href'),
    '/admin/learning',
  );
  assert.equal(
    await page.getByRole('link', { name: 'Trainings', exact: true }).getAttribute('href'),
    '/admin/learning/trainings',
  );

  await page.goto(origin + '/admin/learning/artifacts');
  assert.equal(
    await page.getByRole('link', { name: 'Learning hub', exact: true }).getAttribute('href'),
    '/admin/learning',
  );
  assert.equal(
    await page.getByRole('link', { name: 'Trainings', exact: true }).getAttribute('href'),
    '/admin/learning/trainings',
  );
}

function bootstrapL5DwwmTraining() {
  execFileSync('pnpm', ['content:bootstrap-dwwm'], {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'pipe',
  });
}

async function assertDwwmTrainingJourney(browser, adminPage) {
  bootstrapL5DwwmTraining();

  const desktop = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  try {
    const page = await desktop.newPage();
    const targets = [
      {
        overviewPath: '/en/learning',
        detailPath: '/en/learning/full-stack-web-mobile-developer',
        heading: 'Full-Stack Web & Mobile Developer — Professional Title RNCP 37674',
        summary: 'STUDI training currently in progress toward the level-5 Professional Title RNCP 37674 in web and web-mobile development.',
        metadata: 'Dates not specified · In progress',
        body: 'This STUDI training prepares the French Ministry of Labour Professional Title',
        alternateLocale: 'fr',
        alternatePath: '/fr/apprentissage/developpeur-web-web-mobile',
        emptyEvidence: 'No published evidence is connected to this Training yet.',
      },
      {
        overviewPath: '/fr/apprentissage',
        detailPath: '/fr/apprentissage/developpeur-web-web-mobile',
        heading: 'Développeur web et web mobile — Titre professionnel RNCP 37674',
        summary: 'Formation STUDI actuellement en cours vers le titre professionnel Développeur web et web mobile de niveau 5 (RNCP 37674).',
        metadata: 'Dates non renseignées · En cours',
        body: 'Cette formation STUDI prépare au titre professionnel « Développeur web et web mobile »',
        alternateLocale: 'en',
        alternatePath: '/en/learning/full-stack-web-mobile-developer',
        emptyEvidence: 'Aucune preuve publiée n’est encore reliée à cette formation.',
      },
    ];

    for (const target of targets) {
      const overviewResponse = await page.goto(origin + target.overviewPath);
      assert.equal(overviewResponse?.status(), 200);
      await page
        .getByRole('heading', { level: 3, name: target.heading, exact: true })
        .waitFor();
      assert.equal(
        await page.locator('a[href="' + target.detailPath + '"]').count(),
        1,
        target.overviewPath + ' must expose the real DWWM Training deep link.',
      );

      const detailResponse = await page.goto(origin + target.detailPath);
      assert.equal(detailResponse?.status(), 200);
      await page
        .getByRole('heading', { level: 1, name: target.heading, exact: true })
        .waitFor();
      const detailText = await page.locator('body').innerText();
      assert.ok(detailText.includes('STUDI'));
      assert.ok(detailText.includes(target.summary));
      assert.ok(detailText.includes(target.metadata));
      assert.ok(detailText.includes(target.body));
      assert.ok(
        detailText.includes(target.emptyEvidence),
        'AKS-092 must integrate Training context without fabricating AKS-093 evidence.',
      );
      assert.equal(
        await page
          .locator('.aks-experience-meta a[hreflang="' + target.alternateLocale + '"]')
          .getAttribute('href'),
        target.alternatePath,
      );
      assert.equal(
        await page.locator('link[rel="canonical"]').getAttribute('href'),
        'https://akiksystems.com' + target.detailPath,
      );
      await assertAxe(page);
    }
  } finally {
    await desktop.close();
  }

  const mobile = await browser.newContext({ viewport: { width: 320, height: 720 } });
  try {
    const page = await mobile.newPage();
    for (const path of [
      '/en/learning/full-stack-web-mobile-developer',
      '/fr/apprentissage/developpeur-web-web-mobile',
    ]) {
      const response = await page.goto(origin + path);
      assert.equal(response?.status(), 200);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
        true,
        path + ' DWWM Training detail must not overflow at 320px.',
      );
      await assertAxe(page);
    }
  } finally {
    await mobile.close();
  }

  await adminPage.goto(origin + '/admin/learning/trainings');
  const dwwmCard = adminPage.locator('section').filter({
    has: adminPage.getByRole('heading', {
      level: 2,
      name: 'Full-Stack Web & Mobile Developer — Professional Title RNCP 37674',
      exact: true,
    }),
  });
  await dwwmCard.waitFor();
  assert.equal(await dwwmCard.locator('input[name="provider"]').first().inputValue(), 'STUDI');
  assert.equal(await dwwmCard.locator('select[name="state"]').first().inputValue(), 'in_progress');
  assert.equal(await dwwmCard.locator('input[name="startDate"]').first().inputValue(), '');
  assert.equal(await dwwmCard.locator('input[name="endDate"]').first().inputValue(), '');
}
function bootstrapL5SentinelDossier() {
  execFileSync('pnpm', ['content:bootstrap-sentinel-dossier'], {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'pipe',
  });
}

async function assertSentinelDossierJourney(browser, adminPage) {
  bootstrapL5SentinelDossier();

  const desktop = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  try {
    const page = await desktop.newPage();
    const targets = [
      {
        overviewPath: '/en/learning',
        trainingPath: '/en/learning/full-stack-web-mobile-developer',
        artifactPath: '/en/learning/artifacts/sentinel-dwwm-project-dossier',
        heading: 'Sentinel — DWWM Project Dossier',
        summary: 'First-class learning evidence connecting the DWWM training to Sentinel through problem framing, architecture, implementation, security, testing, deployment, and documented limits.',
        inspection: 'The repository documents an immutable examination baseline at release v1.0.0-rc.9',
        sections: ['Context', 'Objectives', 'Architecture', 'Design choices', 'Security', 'Tests', 'Difficulties', 'Results', 'Limits', 'Evidence'],
        trainingTitle: 'Full-Stack Web & Mobile Developer — Professional Title RNCP 37674',
        systemPath: '/en/systems/sentinel',
        systemEvidenceHeading: 'Connected learning evidence',
        inspectEvidenceLabel: 'Inspect learning evidence',
        alternateLocale: 'fr',
        alternatePath: '/fr/apprentissage/preuves/dossier-projet-dwwm-sentinel',
        sourcePath: '/en/learning/artifacts/sentinel-dwwm-project-dossier/source',
      },
      {
        overviewPath: '/fr/apprentissage',
        trainingPath: '/fr/apprentissage/developpeur-web-web-mobile',
        artifactPath: '/fr/apprentissage/preuves/dossier-projet-dwwm-sentinel',
        heading: 'Sentinel — dossier de projet DWWM',
        summary: 'Preuve d’apprentissage de premier rang reliant la formation DWWM à Sentinel à travers le cadrage du besoin, l’architecture, l’implémentation, la sécurité, les tests, le déploiement et les limites documentées.',
        inspection: 'Le dépôt documente une baseline d’examen immuable à la release v1.0.0-rc.9',
        sections: ['Contexte', 'Objectifs', 'Architecture', 'Choix de conception', 'Sécurité', 'Tests', 'Difficultés', 'Résultats', 'Limites', 'Preuves'],
        trainingTitle: 'Développeur web et web mobile — Titre professionnel RNCP 37674',
        systemPath: '/fr/systems/sentinel',
        systemEvidenceHeading: 'Preuves d’apprentissage liées',
        inspectEvidenceLabel: 'Inspecter la preuve',
        alternateLocale: 'en',
        alternatePath: '/en/learning/artifacts/sentinel-dwwm-project-dossier',
        sourcePath: '/fr/apprentissage/preuves/dossier-projet-dwwm-sentinel/source',
      },
    ];

    for (const target of targets) {
      const overviewResponse = await page.goto(origin + target.overviewPath);
      assert.equal(overviewResponse?.status(), 200);
      await page
        .getByRole('heading', { level: 3, name: target.heading, exact: true })
        .waitFor();
      assert.equal(
        await page.locator('a[href="' + target.artifactPath + '"]').count(),
        1,
        target.overviewPath + ' must expose the Sentinel dossier as first-class evidence.',
      );

      const trainingResponse = await page.goto(origin + target.trainingPath);
      assert.equal(trainingResponse?.status(), 200);
      assert.equal(
        await page.locator('a[href="' + target.artifactPath + '"]').count(),
        1,
        target.trainingPath + ' must connect DWWM context to the Sentinel dossier evidence.',
      );

      const artifactResponse = await page.goto(origin + target.artifactPath);
      assert.equal(artifactResponse?.status(), 200);
      await page
        .getByRole('heading', { level: 1, name: target.heading, exact: true })
        .waitFor();
      const body = await page.locator('body').innerText();
      assert.ok(body.includes(target.summary));
      assert.ok(body.includes(target.inspection));
      assert.ok(body.includes('ed26a25e3c005cabb0da30a4553dfbbee03afe81'));
      assert.equal(
        await page.locator('.aks-dossier-section').count(),
        10,
        'Sentinel dossier must expose all ten native inspection sections.',
      );
      for (const [index, section] of target.sections.entries()) {
        await page
          .getByRole('heading', { level: 2, name: section, exact: true })
          .waitFor();
        assert.equal(
          await page
            .locator('.aks-dossier-nav a[href="#dossier-' + [
              'context',
              'objectives',
              'architecture',
              'design',
              'security',
              'tests',
              'difficulties',
              'results',
              'limits',
              'evidence',
            ][index] + '"]')
            .count(),
          1,
          'Native dossier contents must link directly to ' + section + '.',
        );
      }
      assert.ok(
        body.includes(
          target.artifactPath.startsWith('/fr/')
            ? 'Contexte distinct, preuve connectée'
            : 'Distinct context, connected evidence',
        ),
      );
      assert.ok(
        body.includes(
          target.artifactPath.startsWith('/fr/')
            ? 'Le PDF original sera publié séparément.'
            : 'The original PDF will be published separately.',
        ),
      );
      const relationshipSurface = page.locator('.aks-dossier-context');
      assert.equal(
        await relationshipSurface
          .getByRole('link', { name: target.trainingTitle, exact: true })
          .getAttribute('href'),
        target.trainingPath,
        'Sentinel dossier must link back to its real DWWM Training context.',
      );
      assert.equal(
        await relationshipSurface.locator('a[href="' + target.systemPath + '"]').count(),
        1,
        'Sentinel dossier relationship surface must link to the published Sentinel System.',
      );
      assert.equal(
        await page
          .locator('.aks-experience-meta a[hreflang="' + target.alternateLocale + '"]')
          .getAttribute('href'),
        target.alternatePath,
      );
      assert.equal(
        await page.locator('link[rel="canonical"]').getAttribute('href'),
        'https://akiksystems.com' + target.artifactPath,
      );

      const sourceResponse = await desktop.request.get(origin + target.sourcePath);
      assert.equal(
        sourceResponse.status(),
        404,
        'AKS-094 must keep the native Web reading independent from the AKS-095 source PDF.',
      );
      await assertAxe(page);
    }
  } finally {
    await desktop.close();
  }

  const mobile = await browser.newContext({ viewport: { width: 320, height: 720 } });
  try {
    const page = await mobile.newPage();
    for (const path of [
      '/en/learning/artifacts/sentinel-dwwm-project-dossier',
      '/fr/apprentissage/preuves/dossier-projet-dwwm-sentinel',
      '/en/systems/sentinel',
      '/fr/systems/sentinel',
    ]) {
      const response = await page.goto(origin + path);
      assert.equal(response?.status(), 200);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
        true,
        path + ' Sentinel dossier must not overflow at 320px.',
      );
      await assertAxe(page);
    }
  } finally {
    await mobile.close();
  }

  await adminPage.goto(origin + '/admin/learning/artifacts');
  const dossierCard = adminPage.locator('section').filter({
    has: adminPage.getByRole('heading', {
      level: 2,
      name: 'Sentinel — DWWM Project Dossier',
      exact: true,
    }),
  });
  await dossierCard.waitFor();
  const adminText = await dossierCard.innerText();
  assert.ok(adminText.includes('Training connected'));
  assert.ok(adminText.includes('System connected'));
  assert.ok(adminText.includes('No source document'));
  assert.notEqual(
    await dossierCard.locator('select[name="systemId"]').first().inputValue(),
    '',
    'The LearningArtifact admin must remain the management boundary for the System relation.',
  );
  assert.ok(adminText.includes('Native dossier format'));

  const sourceInput = dossierCard.locator(
    'input[type="file"][accept="application/pdf"]',
  );
  await sourceInput.setInputFiles({
    name: 'qualification-sentinel-dossier.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(
      '%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<<>>\n%%EOF\n',
    ),
  });
  await dossierCard
    .getByRole('button', { name: 'Upload source PDF', exact: true })
    .click();
  await adminPage
    .getByText(
      'Source PDF uploaded. Republish EN/FR to expose it publicly.',
      { exact: true },
    )
    .waitFor();

  for (const path of [
    '/en/learning/artifacts/sentinel-dwwm-project-dossier/source',
    '/fr/apprentissage/preuves/dossier-projet-dwwm-sentinel/source',
  ]) {
    const response = await adminPage.context().request.get(origin + path);
    assert.equal(
      response.status(),
      404,
      'A newly uploaded source PDF must remain private until its locale is republished.',
    );
  }

  const localeFieldsets = dossierCard.locator('fieldset');
  await localeFieldsets
    .nth(0)
    .getByRole('button', { name: 'Publish update EN', exact: true })
    .click();
  await adminPage
    .getByText('EN LearningArtifact published.', { exact: true })
    .waitFor();

  const englishSource = await adminPage.context().request.get(
    origin + '/en/learning/artifacts/sentinel-dwwm-project-dossier/source',
  );
  assert.equal(englishSource.status(), 200);
  assert.equal(
    englishSource.headers()['content-type'],
    'application/pdf',
    'Published Sentinel source must be served as PDF.',
  );
  assert.match(
    englishSource.headers()['content-disposition'] ?? '',
    /qualification-sentinel-dossier\.pdf/,
  );
  assert.match(
    englishSource.headers()['x-robots-tag'] ?? '',
    /noindex/i,
    'Published source PDFs must not compete with their HTML inspection route.',
  );
  assert.match((await englishSource.body()).toString('utf8'), /^%PDF-/);

  const frenchBeforePublish = await adminPage.context().request.get(
    origin + '/fr/apprentissage/preuves/dossier-projet-dwwm-sentinel/source',
  );
  assert.equal(
    frenchBeforePublish.status(),
    404,
    'EN publication must not leak the PDF into the still-stale FR snapshot.',
  );

  await localeFieldsets
    .nth(1)
    .getByRole('button', { name: 'Publish update FR', exact: true })
    .click();
  await adminPage
    .getByText('FR LearningArtifact published.', { exact: true })
    .waitFor();

  const frenchSource = await adminPage.context().request.get(
    origin + '/fr/apprentissage/preuves/dossier-projet-dwwm-sentinel/source',
  );
  assert.equal(frenchSource.status(), 200);
  assert.equal(frenchSource.headers()['content-type'], 'application/pdf');
  assert.match(
    frenchSource.headers()['x-robots-tag'] ?? '',
    /noindex/i,
    'Localized source PDFs must remain outside search indexes.',
  );

  for (const path of [
    '/en/learning/artifacts/sentinel-dwwm-project-dossier',
    '/fr/apprentissage/preuves/dossier-projet-dwwm-sentinel',
  ]) {
    const localePage = await adminPage.context().newPage();
    try {
      const response = await localePage.goto(origin + path);
      assert.equal(response?.status(), 200);
      await localePage
        .getByRole('link', {
          name: path.startsWith('/fr/')
            ? 'Ouvrir le PDF original'
            : 'Open original PDF',
          exact: true,
        })
        .waitFor();
    } finally {
      await localePage.close();
    }
  }

  await dossierCard
    .getByRole('button', { name: 'Remove source from draft', exact: true })
    .click();
  await adminPage
    .getByText(
      'Source PDF removed from the draft. Existing public snapshots stay unchanged until republished.',
      { exact: true },
    )
    .waitFor();

  for (const path of [
    '/en/learning/artifacts/sentinel-dwwm-project-dossier/source',
    '/fr/apprentissage/preuves/dossier-projet-dwwm-sentinel/source',
  ]) {
    const response = await adminPage.context().request.get(origin + path);
    assert.equal(
      response.status(),
      200,
      'Removing the draft source must not break already-published source snapshots.',
    );
  }

  for (const textarea of await dossierCard.locator('textarea[name="body"]').all()) {
    assert.equal(
      await textarea.getAttribute('rows'),
      '28',
      'Native dossier inspection content must remain comfortably manageable from admin.',
    );
  }
}
async function assertRepresentativeSystemSelection(page) {
  await page.goto(`${origin}/admin/profile`);
  await page
    .getByRole('heading', { level: 2, name: 'Representative Systems', exact: true })
    .waitFor();

  const checkbox = page.getByRole('checkbox', {
    name: 'Sentinel',
    exact: true,
  });
  await checkbox.check();
  const sentinelCard = checkbox.locator('..').locator('..');
  await sentinelCard.locator('input[type="number"]').fill('0');
  await page.getByRole('button', { name: 'Save representative Systems' }).click();
  await page.getByText('Representative Systems updated.', { exact: true }).waitFor();
  await publishProfileDraft(page);

  await page.goto(`${origin}/en/profile`);
  const englishProof = page.locator('.aks-profile-immediate-proof');
  await englishProof
    .getByRole('heading', { level: 3, name: 'Sentinel', exact: true })
    .waitFor();
  await englishProof
    .getByText(
      'Operational visibility built from industrial context and inspectable evidence.',
      { exact: true },
    )
    .waitFor();
  assert.equal(
    await englishProof
      .getByRole('link', { name: 'Inspect System' })
      .getAttribute('href'),
    '/en/systems/sentinel',
  );
  assert.equal(
    await page.locator('.aks-system-reference').count(),
    1,
    'The immediate proof must be the only SystemReference card when Sentinel is the only representative System.',
  );
  assert.equal(
    /job seeker|open to work/i.test(await page.locator('.aks-profile-first-view').innerText()),
    false,
    'The first view must communicate mastery without job-seeker badging.',
  );

  await page.goto(`${origin}/fr/profil`);
  const frenchProof = page.locator('.aks-profile-immediate-proof');
  await frenchProof
    .getByRole('heading', { level: 3, name: 'Sentinel', exact: true })
    .waitFor();
  await frenchProof
    .getByText(
      'Visibilité opérationnelle issue d’un contexte industriel et de preuves inspectables.',
      { exact: true },
    )
    .waitFor();
  assert.equal(
    await frenchProof
      .getByRole('link', { name: 'Inspecter le système' })
      .getAttribute('href'),
    '/fr/systems/sentinel',
  );
  assert.equal(
    await page.locator('.aks-system-reference').count(),
    1,
    'La preuve immédiate doit être la seule carte SystemReference lorsque Sentinel est le seul système représentatif.',
  );

  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ['/en/profile', '/fr/profil']) {
    await page.goto(`${origin}${path}`);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
      true,
      `${path} Profile first view must not overflow on mobile.`,
    );
    assert.equal(
      await page.locator('.aks-profile-immediate-proof').count(),
      1,
      `${path} must keep immediate proof visible on mobile.`,
    );
  }
  await page.setViewportSize({ width: 1280, height: 800 });
}

async function saveLocalization(page, locale, values) {
  const heading = locale === 'en' ? 'English' : 'Français';
  const button = locale === 'en' ? 'Save EN only' : 'Save FR only';
  const form = page.locator('form').filter({
    has: page.getByRole('heading', { name: heading, exact: true }),
  });

  await form.locator('input[name="slug"]').fill(values.slug);
  await form.locator('input[name="title"]').fill(values.title);
  await form.locator('textarea[name="summary"]').fill(values.summary);
  await form.getByRole('button', { name: button }).click();
  await page.getByText(locale === 'en' ? 'EN content updated independently.' : 'FR content updated independently.').waitFor();
}

async function savePresentation(page, locale, text) {
  await page.goto(`${origin}${page.systemPath}/presentation/${locale}`);
  await page.getByLabel('Block type').selectOption('paragraph');
  await page.getByRole('button', { name: 'Add block' }).click();
  await page.getByRole('textbox', { name: 'Paragraph' }).fill(text);
  await page.getByRole('button', { name: 'Save presentation' }).click();
  await page.getByText(`${locale.toUpperCase()} presentation saved.`).waitFor();
}

const globalDestinations = [
  { path: '/en/profile', lang: 'en', heading: 'Amine AKIK', context: 'Profile', alternate: '/fr/profil' },
  { path: '/en/systems', lang: 'en', heading: 'Systems', context: 'Systems', alternate: '/fr/systems' },
  { path: '/en/writings', lang: 'en', heading: 'Writings', context: 'Writings', alternate: '/fr/ecrits' },
  { path: '/en/learning', lang: 'en', heading: 'Learning', context: 'Learning', alternate: '/fr/apprentissage' },
  { path: '/en/work-with-us', lang: 'en', heading: 'Work with us', context: 'Work with us', alternate: '/fr/travailler-ensemble' },
  { path: '/fr/profil', lang: 'fr', heading: 'Amine AKIK', context: 'Profil', alternate: '/en/profile' },
  { path: '/fr/systems', lang: 'fr', heading: 'Systèmes', context: 'Systèmes', alternate: '/en/systems' },
  { path: '/fr/ecrits', lang: 'fr', heading: 'Écrits', context: 'Écrits', alternate: '/en/writings' },
  { path: '/fr/apprentissage', lang: 'fr', heading: 'Apprentissage', context: 'Apprentissage', alternate: '/en/learning' },
  {
    path: '/fr/travailler-ensemble',
    lang: 'fr',
    heading: 'Travailler ensemble',
    context: 'Travailler ensemble',
    alternate: '/en/work-with-us',
  },
];

async function assertGlobalDestinations(page, { mobile = false } = {}) {
  const expectedNavigation = {
    en: [
      '/en/profile',
      '/en/systems',
      '/en/writings',
      '/en/learning',
      '/en/work-with-us',
    ],
    fr: [
      '/fr/profil',
      '/fr/systems',
      '/fr/ecrits',
      '/fr/apprentissage',
      '/fr/travailler-ensemble',
    ],
  };

  for (const destination of globalDestinations) {
    const response = await page.goto(`${origin}${destination.path}`);
    assert.equal(response?.status(), 200, `${destination.path} must return HTTP 200.`);
    assert.equal(await page.locator('html').getAttribute('lang'), destination.lang);
    await page
      .getByRole('heading', { level: 1, name: destination.heading, exact: true })
      .waitFor();
    await page.locator('.aks-brand-signature').waitFor();

    if (mobile) {
      const menu = page.locator('.aks-experience-mobile-menu');
      const trigger = page.locator('.aks-experience-mobile-menu-trigger');
      await trigger.waitFor();
      assert.equal(await menu.getAttribute('open'), null, 'Mobile menu should start collapsed.');
      await trigger.click();
      assert.notEqual(await menu.getAttribute('open'), null, 'Mobile menu should open on tap.');

      for (const href of expectedNavigation[destination.lang]) {
        const link = page.locator(`.aks-experience-mobile-nav a[href="${href}"]`);
        await link.waitFor();
        const box = await link.boundingBox();
        assert.ok(box && box.height >= 44, `${href} must expose a 44px mobile touch target.`);
      }
    } else {
      for (const href of expectedNavigation[destination.lang]) {
        await page.locator(`.aks-experience-nav a[href="${href}"]`).waitFor();
      }
    }

    const contextLabel =
      destination.lang === 'fr' ? 'Contexte actuel' : 'Current context';
    assert.equal(
      (await page.locator(`[aria-label="${contextLabel}"]`).innerText()).trim(),
      destination.context,
      `${destination.path} must expose its first-level shell context.`,
    );
    const alternateLocale = destination.lang === 'en' ? 'fr' : 'en';
    const languageLink = page.locator(
      `.aks-experience-meta a[hreflang="${alternateLocale}"]`,
    );
    await languageLink.waitFor();
    assert.equal(
      await languageLink.getAttribute('href'),
      destination.alternate,
      `${destination.path} must switch to its equivalent localized destination.`,
    );


    if (mobile) {
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
        true,
        `${destination.path} must not overflow at 320px.`,
      );
    }
  }
}

async function assertFirstLevelDeepLinkAutonomy(browser, { mobile = false } = {}) {
  const expectedNavigation = {
    en: [
      '/en/profile',
      '/en/systems',
      '/en/writings',
      '/en/learning',
      '/en/work-with-us',
    ],
    fr: [
      '/fr/profil',
      '/fr/systems',
      '/fr/ecrits',
      '/fr/apprentissage',
      '/fr/travailler-ensemble',
    ],
  };

  for (const destination of globalDestinations) {
    const directContext = await browser.newContext({
      viewport: mobile ? { width: 320, height: 720 } : { width: 1280, height: 800 },
    });

    try {
      const page = await directContext.newPage();
      const response = await page.goto(`${origin}${destination.path}`);

      assert.equal(response?.status(), 200, `${destination.path} direct load must return HTTP 200.`);
      assert.equal(
        await page.locator('html').getAttribute('lang'),
        destination.lang,
        `${destination.path} must reconstruct its locale from the URL.`,
      );
      await page
        .getByRole('heading', { level: 1, name: destination.heading, exact: true })
        .waitFor();
      await page.locator('.aks-brand-signature').waitFor();

      const contextLabel =
        destination.lang === 'fr' ? 'Contexte actuel' : 'Current context';
      assert.equal(
        (await page.locator(`[aria-label="${contextLabel}"]`).innerText()).trim(),
        destination.context,
        `${destination.path} must reconstruct its local context on direct load.`,
      );

      const alternateLocale = destination.lang === 'en' ? 'fr' : 'en';
      assert.equal(
        await page
          .locator(`.aks-experience-meta a[hreflang="${alternateLocale}"]`)
          .getAttribute('href'),
        destination.alternate,
        `${destination.path} must reconstruct its equivalent-language target on direct load.`,
      );

      if (mobile) {
        const menu = page.locator('.aks-experience-mobile-menu');
        await page.locator('.aks-experience-mobile-menu-trigger').click();
        assert.notEqual(await menu.getAttribute('open'), null);
        assert.equal(
          await page
            .locator('.aks-experience-mobile-nav a[aria-current="page"]')
            .getAttribute('href'),
          destination.path,
          `${destination.path} must reconstruct active mobile navigation on direct load.`,
        );
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
          ),
          true,
          `${destination.path} direct load must not overflow at 320px.`,
        );
      } else {
        assert.equal(
          await page
            .locator('.aks-experience-nav a[aria-current="page"]')
            .getAttribute('href'),
          destination.path,
          `${destination.path} must reconstruct active desktop navigation on direct load.`,
        );

        for (const href of expectedNavigation[destination.lang]) {
          await page.locator(`.aks-experience-nav a[href="${href}"]`).waitFor();
        }
      }
    } finally {
      await directContext.close();
    }
  }
}

async function assertTechnicalEvaluatorPaths(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  try {
    const page = await context.newPage();
    const targets = [
      {
        path: '/en/systems/sentinel',
        heading: 'Sentinel',
        evidence: [{ href: 'https://sentinel.akiksystems.fr' }],
      },
      {
        path: '/en/systems/protocap',
        heading: 'ProtoCap',
        evidence: [
          { href: 'https://github.com/AmineAKIK/protocap' },
          {
            href: 'https://github.com/AmineAKIK/protocap/blob/main/docs/product-boundaries.md',
            label: 'Product boundaries',
          },
        ],
      },
      {
        path: '/en/systems/oria-nutrition',
        heading: 'Oria Nutrition',
        evidence: [
          { href: 'https://amineakik.github.io/orianutrition/' },
          { href: 'https://github.com/AmineAKIK/orianutrition' },
          {
            href: 'https://github.com/AmineAKIK/orianutrition/blob/main/docs/case-study.md',
            label: 'Case study',
          },
          {
            href: 'https://github.com/AmineAKIK/orianutrition/blob/main/docs/content-provenance.md',
            label: 'Content provenance',
          },
        ],
      },
      {
        path: '/en/systems/tugeres',
        heading: 'Tugères',
        evidence: [
          { href: 'https://github.com/AmineAKIK/tugeres' },
          {
            href: 'https://github.com/AmineAKIK/tugeres/blob/main/docs/tugeres-operations.md',
            label: 'Operations runbook',
          },
          {
            href: 'https://github.com/AmineAKIK/tugeres/blob/main/docs/guide-installation.md',
            label: 'Installation guide',
          },
        ],
      },
    ];

    for (const target of targets) {
      const response = await page.goto(`${origin}${target.path}`);
      assert.equal(response?.status(), 200);
      await page.getByRole('heading', { level: 1, name: target.heading, exact: true }).waitFor();
      await assertSystemProofTransparency(page, 'en');

      for (const item of target.evidence) {
        const link = page.locator(`a[href="${item.href}"]`).first();
        assert.ok(
          (await link.count()) >= 1,
          `${target.path} must expose the available technical evidence link ${item.href}.`,
        );
        if (item.label) {
          assert.equal(
            (await link.innerText()).trim(),
            item.label,
            `${target.path} must give technical documentation a descriptive label.`,
          );
        }
      }
    }
  } finally {
    await context.close();
  }
}

async function assertPublishedSystemDeepLinkAutonomy(browser, { mobile = false } = {}) {
  const targets = [
    {
      enPath: '/en/systems/sentinel',
      frPath: '/fr/systems/sentinel',
      heading: 'Sentinel',
    },
    {
      enPath: '/en/systems/protocap',
      frPath: '/fr/systems/protocap',
      heading: 'ProtoCap',
    },
    {
      enPath: '/en/systems/oria-nutrition',
      frPath: '/fr/systems/oria-nutrition',
      heading: 'Oria Nutrition',
    },
    {
      enPath: '/en/systems/tugeres',
      frPath: '/fr/systems/tugeres',
      heading: 'Tugères',
    },
  ].flatMap((system) => [
    {
      path: system.enPath,
      lang: 'en',
      contextLabel: 'Current context',
      destinationHref: '/en/systems',
      alternateHref: system.frPath,
      heading: system.heading,
    },
    {
      path: system.frPath,
      lang: 'fr',
      contextLabel: 'Contexte actuel',
      destinationHref: '/fr/systems',
      alternateHref: system.enPath,
      heading: system.heading,
    },
  ]);

  for (const target of targets) {
    const directContext = await browser.newContext({
      viewport: mobile ? { width: 320, height: 720 } : { width: 1280, height: 800 },
    });

    try {
      const page = await directContext.newPage();
      const response = await page.goto(`${origin}${target.path}`);

      assert.equal(response?.status(), 200, `${target.path} direct load must return HTTP 200.`);
      assert.equal(await page.locator('html').getAttribute('lang'), target.lang);
      await page.getByRole('heading', { level: 1, name: target.heading, exact: true }).waitFor();
      await page.locator('.aks-brand-signature').waitFor();
      await assertSystemProofTransparency(page, target.lang);

      const localContext = page.locator(`[aria-label="${target.contextLabel}"]`);
      assert.equal(
        await localContext.locator('a').getAttribute('href'),
        target.destinationHref,
        `${target.path} must reconstruct its parent destination on direct load.`,
      );
      assert.equal(
        (await localContext.locator('[aria-current="page"]').innerText()).trim(),
        target.heading,
        `${target.path} must reconstruct its current item on direct load.`,
      );

      const alternateLocale = target.lang === 'en' ? 'fr' : 'en';
      assert.equal(
        await page
          .locator(`.aks-experience-meta a[hreflang="${alternateLocale}"]`)
          .getAttribute('href'),
        target.alternateHref,
        `${target.path} must reconstruct its translated deep-link target.`,
      );

      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
        true,
        `${target.path} direct load must not overflow its viewport.`,
      );

      if (mobile) {
        await page.locator('.aks-experience-mobile-menu-trigger').click();
        assert.equal(
          await page
            .locator('.aks-experience-mobile-nav a[aria-current="page"]')
            .getAttribute('href'),
          target.destinationHref,
          `${target.path} must reconstruct Systems as active on mobile direct load.`,
        );
      } else {
        assert.equal(
          await page
            .locator('.aks-experience-nav a[aria-current="page"]')
            .getAttribute('href'),
          target.destinationHref,
          `${target.path} must reconstruct Systems as active on desktop direct load.`,
        );
      }

      await assertAxe(page);
    } finally {
      await directContext.close();
    }
  }
}

async function assertRealDeviceClasses(browser, { includeDeep = false } = {}) {
  const devices = [
    { name: 'small mobile', viewport: { width: 320, height: 568 }, compact: true, homeColumns: 1 },
    { name: 'large mobile', viewport: { width: 430, height: 932 }, compact: true, homeColumns: 1 },
    { name: 'tablet', viewport: { width: 768, height: 1024 }, compact: true, homeColumns: 1 },
    { name: 'laptop', viewport: { width: 1366, height: 768 }, compact: false, homeColumns: 2 },
    { name: 'desktop', viewport: { width: 1440, height: 900 }, compact: false, homeColumns: 2 },
  ];

  for (const device of devices) {
    const context = await browser.newContext({ viewport: device.viewport });

    try {
      const page = await context.newPage();

      await page.goto(`${origin}/en`);
      await page.getByRole('heading', { level: 1, name: 'AkikSystems', exact: true }).waitFor();

      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
        true,
        `${device.name} Home must not overflow horizontally.`,
      );

      const homeColumns = await page.locator('.aks-home-portal').evaluate(
        (element) => getComputedStyle(element).gridTemplateColumns.split(' ').filter(Boolean).length,
      );
      assert.equal(
        homeColumns,
        device.homeColumns,
        `${device.name} Home must expose the expected spatial composition.`,
      );

      const desktopNavVisible = await page.locator('.aks-experience-nav').isVisible();
      const mobileMenuVisible = await page.locator('.aks-experience-mobile-menu').isVisible();
      assert.equal(
        desktopNavVisible,
        !device.compact,
        `${device.name} must use the expected global navigation mode.`,
      );
      assert.equal(
        mobileMenuVisible,
        false,
        `${device.name} Home must not duplicate the five-door portal with a second compact navigation control.`,
      );

      await page.goto(`${origin}/en/profile`);
      await page.getByRole('heading', { level: 1, name: 'Amine AKIK', exact: true }).waitFor();

      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
        true,
        `${device.name} first-level route must not overflow horizontally.`,
      );
      assert.equal(
        (await page.locator('[aria-label="Current context"]').innerText()).trim(),
        'Profile',
        `${device.name} first-level route must preserve shell context.`,
      );

      if (device.compact) {
        assert.equal(
          await page.locator('.aks-experience-mobile-menu').isVisible(),
          true,
          `${device.name} first-level route must expose compact global navigation.`,
        );
        const menu = page.locator('.aks-experience-mobile-menu');
        await page.locator('.aks-experience-mobile-menu-trigger').click();
        assert.notEqual(
          await menu.getAttribute('open'),
          null,
          `${device.name} compact menu must open.`,
        );
        assert.equal(
          await page
            .locator('.aks-experience-mobile-nav a[aria-current="page"]')
            .getAttribute('href'),
          '/en/profile',
          `${device.name} compact navigation must preserve the active destination.`,
        );
      } else {
        assert.equal(
          await page
            .locator('.aks-experience-nav a[aria-current="page"]')
            .getAttribute('href'),
          '/en/profile',
          `${device.name} desktop navigation must preserve the active destination.`,
        );
      }

      if (includeDeep) {
        await page.goto(`${origin}/en/systems/sentinel`);
        await page.getByRole('heading', { level: 1, name: 'Sentinel', exact: true }).waitFor();

        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
          true,
          `${device.name} deep System route must not overflow horizontally.`,
        );

        const deepContext = page.locator('[aria-label="Current context"]');
        assert.equal(await deepContext.locator('a').getAttribute('href'), '/en/systems');
        assert.equal(
          (await deepContext.locator('[aria-current="page"]').innerText()).trim(),
          'Sentinel',
          `${device.name} deep route must preserve item-level orientation.`,
        );

        if (device.compact) {
          await page.locator('.aks-experience-mobile-menu-trigger').click();
          assert.equal(
            await page
              .locator('.aks-experience-mobile-nav a[aria-current="page"]')
              .getAttribute('href'),
            '/en/systems',
            `${device.name} deep route must keep Systems active in compact navigation.`,
          );
        } else {
          assert.equal(
            await page
              .locator('.aks-experience-nav a[aria-current="page"]')
              .getAttribute('href'),
            '/en/systems',
            `${device.name} deep route must keep Systems active in desktop navigation.`,
          );
        }
      }
    } finally {
      await context.close();
    }
  }
}

async function assertTenSecondComprehensionBaseline(browser) {
  const scenarios = [
    {
      name: 'desktop Home',
      viewport: { width: 1440, height: 900 },
      path: '/en',
      kind: 'home',
    },
    {
      name: 'mobile Home',
      viewport: { width: 390, height: 844 },
      path: '/en',
      kind: 'home',
    },
    {
      name: 'desktop Sentinel deep link',
      viewport: { width: 1440, height: 900 },
      path: '/en/systems/sentinel',
      kind: 'deep',
    },
    {
      name: 'mobile Sentinel deep link',
      viewport: { width: 390, height: 844 },
      path: '/en/systems/sentinel',
      kind: 'deep',
    },
  ];

  const sessions = await Promise.all(
    scenarios.map(async (scenario) => {
      const context = await browser.newContext({ viewport: scenario.viewport });
      const page = await context.newPage();
      const response = await page.goto(`${origin}${scenario.path}`);
      assert.equal(response?.status(), 200, `${scenario.name} must return HTTP 200.`);

      if (scenario.kind === 'home') {
        await page.getByRole('heading', { level: 1, name: 'AkikSystems', exact: true }).waitFor();
      } else {
        await page.getByRole('heading', { level: 1, name: 'Sentinel', exact: true }).waitFor();
      }

      await page.waitForLoadState('networkidle');
      return { ...scenario, context, page };
    }),
  );

  try {
    // Ten-second-test exposure: no clicks, scrolling, hover, focus, or explanatory prompt.
    await sleep(10_000);

    const observations = [];

    for (const session of sessions) {
      const { name, viewport, kind, page } = session;

      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
        true,
        `${name} must remain horizontally readable during first impression.`,
      );

      if (kind === 'home') {
        await page.getByText('Independent software systems', { exact: true }).waitFor();
        await page.getByText('Engineering made inspectable.', { exact: true }).waitFor();
        if (viewport.width > 768) {
          await page
            .getByText(
              'Explore the systems, evidence, learning, writing, and collaboration paths that make up AkikSystems.',
              { exact: true },
            )
            .waitFor();
        }

        const destinationLabels = await page
          .locator('.aks-home-door-label')
          .allInnerTexts();
        assert.deepEqual(
          destinationLabels.map((label) => label.trim()),
          ['Profile', 'Systems', 'Writings', 'Learning', 'Work with us'],
          `${name} must expose all five destination concepts without interaction.`,
        );

        const aboveFoldDestinations = await page
          .locator('.aks-home-door')
          .evaluateAll((links, height) =>
            links
              .filter((link) => {
                const rect = link.getBoundingClientRect();
                return rect.bottom > 0 && rect.top < height;
              })
              .map((link) =>
                link.querySelector('.aks-home-door-label')?.textContent?.trim() ?? '',
              )
              .filter(Boolean),
          viewport.height);

        assert.deepEqual(
          aboveFoldDestinations,
          ['Profile', 'Systems', 'Writings', 'Learning', 'Work with us'],
          `${name} must expose all five destinations in the initial viewport.`,
        );

        observations.push({
          scenario: name,
          perceivedIdentityCues: [
            'Independent software systems',
            'AkikSystems',
            'Engineering made inspectable.',
          ],
          destinationsPresent: destinationLabels.map((label) => label.trim()),
          destinationsAboveFold: aboveFoldDestinations,
        });
      } else {
        await page.locator('.aks-brand-signature').waitFor();
        const localContext = page.locator('[aria-label="Current context"]');
        assert.equal(await localContext.locator('a').getAttribute('href'), '/en/systems');
        assert.equal(
          (await localContext.locator('[aria-current="page"]').innerText()).trim(),
          'Sentinel',
          `${name} must identify the current deep-linked System without interaction.`,
        );

        const activeDestination = viewport.width <= 768
          ? page.locator('.aks-experience-mobile-nav a[aria-current="page"]')
          : page.locator('.aks-experience-nav a[aria-current="page"]');

        if (viewport.width <= 768) {
          await page.locator('.aks-experience-mobile-menu-trigger').waitFor();
          assert.equal(
            await page.locator('.aks-experience-mobile-menu').getAttribute('open'),
            null,
            'Ten-second mobile deep-link exposure must remain interaction-free.',
          );
        } else {
          assert.equal(await activeDestination.getAttribute('href'), '/en/systems');
        }

        observations.push({
          scenario: name,
          perceivedIdentityCues: ['AkikSystems', 'Systems', 'Sentinel'],
          currentContext: 'Systems / Sentinel',
        });
      }
    }

    process.stdout.write(
      `AKS-053 ten-second automated baseline: ${JSON.stringify(observations)}\\n`,
    );
  } finally {
    await Promise.all(sessions.map(({ context }) => context.close()));
  }
}

async function assertGlobalKeyboardNavigation(browser) {
  const desktop = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });

  try {
    const page = await desktop.newPage();
    await page.goto(`${origin}/en`);
    await page.getByRole('heading', { level: 1, name: 'AkikSystems', exact: true }).waitFor();

    await page.keyboard.press('Tab');
    assert.equal(
      await page.evaluate(() => document.activeElement?.classList.contains('aks-skip-link')),
      true,
      'Desktop keyboard navigation must expose Skip to content first.',
    );

    await page.keyboard.press('Tab');
    assert.equal(
      await page.evaluate(() => document.activeElement?.classList.contains('aks-brand-signature')),
      true,
      'Brand/Home must be the next desktop shell focus target.',
    );

    for (const href of [
      '/en',
      '/en/profile',
      '/en/systems',
      '/en/writings',
      '/en/learning',
      '/en/work-with-us',
    ]) {
      await page.keyboard.press('Tab');
      assert.equal(
        await page.evaluate(() => document.activeElement?.getAttribute('href')),
        href,
        `Desktop Tab order must reach ${href} in global navigation order.`,
      );
    }

    await page.keyboard.press('Tab');
    assert.equal(
      await page.evaluate(() => document.activeElement?.getAttribute('hreflang')),
      'fr',
      'Desktop Tab order must reach the language switch after global navigation.',
    );
    await page.keyboard.press('Enter');
    await page.waitForURL(`${origin}/fr`);
    await page.waitForFunction(() => document.documentElement.lang === 'fr');
    assert.equal(await page.locator('html').getAttribute('lang'), 'fr');

    await page.goto(`${origin}/en/systems/sentinel`);
    await page.getByRole('heading', { level: 1, name: 'Sentinel', exact: true }).waitFor();

    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    assert.equal(
      await page.evaluate(() => document.activeElement?.id),
      'experience-outlet',
      'Skip link must move focus into the deep-link content outlet.',
    );

    await page.locator('.aks-brand-signature').focus();
    for (let i = 0; i < 7; i += 1) {
      await page.keyboard.press('Tab');
    }
    assert.equal(
      await page.evaluate(() => document.activeElement?.getAttribute('href')),
      '/en/systems',
      'Deep-link keyboard order must expose the parent Systems context.',
    );
    await page.keyboard.press('Enter');
    await page.waitForURL(`${origin}/en/systems`);
  } finally {
    await desktop.close();
  }

  const mobile = await browser.newContext({
    viewport: { width: 320, height: 720 },
  });

  try {
    const page = await mobile.newPage();
    await page.goto(`${origin}/en/profile`);
    await page.getByRole('heading', { level: 1, name: 'Amine AKIK', exact: true }).waitFor();

    await page.keyboard.press('Tab');
    assert.equal(
      await page.evaluate(() => document.activeElement?.classList.contains('aks-skip-link')),
      true,
      'Mobile keyboard navigation must expose Skip to content first.',
    );

    await page.keyboard.press('Tab');
    assert.equal(
      await page.evaluate(() => document.activeElement?.classList.contains('aks-brand-signature')),
      true,
      'Mobile brand/Home must follow the skip link.',
    );

    await page.keyboard.press('Tab');
    assert.equal(
      await page.evaluate(() =>
        document.activeElement?.classList.contains('aks-experience-mobile-menu-trigger'),
      ),
      true,
      'Mobile Menu must appear in keyboard order before metadata shown below it.',
    );

    await page.keyboard.press('Enter');
    assert.notEqual(
      await page.locator('.aks-experience-mobile-menu').getAttribute('open'),
      null,
      'Enter must open the mobile navigation disclosure.',
    );

    await page.keyboard.press('Tab');
    assert.equal(
      await page.evaluate(() => document.activeElement?.getAttribute('href')),
      '/en',
      'Open mobile navigation must expose Home first.',
    );
    await page.keyboard.press('Tab');
    assert.equal(
      await page.evaluate(() => document.activeElement?.getAttribute('href')),
      '/en/profile',
      'Open mobile navigation must expose the current first-level destination.',
    );
    await page.keyboard.press('Tab');
    assert.equal(
      await page.evaluate(() => document.activeElement?.getAttribute('href')),
      '/en/systems',
      'Mobile global navigation must be fully reachable by Tab.',
    );
    await page.keyboard.press('Enter');
    await page.waitForURL(`${origin}/en/systems`);
    await page.getByRole('heading', { level: 1, name: 'Systems', exact: true }).waitFor();
    assert.equal(
      await page.locator('.aks-experience-mobile-menu').getAttribute('open'),
      null,
      'Mobile navigation must reset closed after route navigation.',
    );

    await page.goto(`${origin}/en/profile`);
    await page.getByRole('heading', { level: 1, name: 'Amine AKIK', exact: true }).waitFor();
    await page.locator('.aks-experience-meta a[hreflang="fr"]').focus();
    await page.keyboard.press('Enter');
    await page.waitForURL(`${origin}/fr/profil`);
    await page.waitForFunction(() => document.documentElement.lang === 'fr');
    assert.equal(await page.locator('html').getAttribute('lang'), 'fr');
  } finally {
    await mobile.close();
  }
}

async function assertIntentPrefetching(browser) {
  const prefetchSelector = 'link[rel="prefetch"], link[rel="modulepreload"]';
  const descriptorCount = (page) => page.locator(prefetchSelector).count();

  const desktop = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });

  try {
    const page = await desktop.newPage();
    await page.goto(`${origin}/en`);
    await page.getByRole('heading', { level: 1, name: 'AkikSystems', exact: true }).waitFor();
    await page.waitForLoadState('networkidle');

    const homeNav = page.getByRole('navigation', { name: 'Explore AkikSystems' });
    const profileDoor = homeNav.locator('a[href="/en/profile"]');
    await profileDoor.waitFor();

    const homeIdleCount = await descriptorCount(page);
    await profileDoor.hover();
    await page.waitForFunction(
      ({ selector, baseline }) =>
        document.querySelectorAll(selector).length > baseline,
      { selector: prefetchSelector, baseline: homeIdleCount },
    );

    assert.ok(
      (await descriptorCount(page)) > homeIdleCount,
      'Hovering an intended Home destination must add route prefetch descriptors.',
    );

    await page.mouse.move(0, 0);
    await page.waitForFunction(
      ({ selector, baseline }) =>
        document.querySelectorAll(selector).length <= baseline,
      { selector: prefetchSelector, baseline: homeIdleCount },
    );

    await page.goto(`${origin}/en/systems`);
    await page.getByRole('heading', { level: 1, name: 'Systems', exact: true }).waitFor();
    await page.waitForLoadState('networkidle');

    const shellNav = page.locator('.aks-experience-nav');
    const writingsLink = shellNav.locator('a[href="/en/writings"]');
    await writingsLink.waitFor();

    const shellIdleCount = await descriptorCount(page);
    await writingsLink.focus();
    await page.waitForFunction(
      ({ selector, baseline }) =>
        document.querySelectorAll(selector).length > baseline,
      { selector: prefetchSelector, baseline: shellIdleCount },
    );

    assert.ok(
      (await descriptorCount(page)) > shellIdleCount,
      'Keyboard focus must add intent-prefetch descriptors for shell navigation.',
    );
  } finally {
    await desktop.close();
  }

  const mobile = await browser.newContext({
    viewport: { width: 320, height: 720 },
    hasTouch: true,
    isMobile: true,
  });

  try {
    const page = await mobile.newPage();
    await page.goto(`${origin}/en`);
    await page.getByRole('heading', { level: 1, name: 'AkikSystems', exact: true }).waitFor();
    await page.waitForLoadState('networkidle');

    const homeNav = page.getByRole('navigation', { name: 'Explore AkikSystems' });
    const systemsDoor = homeNav.locator('a[href="/en/systems"]');
    await systemsDoor.waitFor();

    const mobileIdleCount = await descriptorCount(page);
    await systemsDoor.dispatchEvent('touchstart');
    await page.waitForFunction(
      ({ selector, baseline }) =>
        document.querySelectorAll(selector).length > baseline,
      { selector: prefetchSelector, baseline: mobileIdleCount },
    );

    assert.ok(
      (await descriptorCount(page)) > mobileIdleCount,
      'Touch intent must add route prefetch descriptors without requiring navigation.',
    );
    assert.equal(
      new URL(page.url()).pathname,
      '/en',
      'Touch prefetch qualification must not navigate away from Home.',
    );
  } finally {
    await mobile.close();
  }
}

async function assertHomePortal(page, locale, { mobile = false } = {}) {
  const config =
    locale === 'fr'
      ? {
          path: '/fr',
          heading: 'AkikSystems',
          label: 'Explorer AkikSystems',
          hrefs: [
            '/fr/profil',
            '/fr/systems',
            '/fr/ecrits',
            '/fr/apprentissage',
            '/fr/travailler-ensemble',
          ],
        }
      : {
          path: '/en',
          heading: 'AkikSystems',
          label: 'Explore AkikSystems',
          hrefs: [
            '/en/profile',
            '/en/systems',
            '/en/writings',
            '/en/learning',
            '/en/work-with-us',
          ],
        };

  const response = await page.goto(`${origin}${config.path}`);
  assert.equal(response?.status(), 200, `${config.path} must return HTTP 200.`);
  await page.getByRole('heading', { level: 1, name: config.heading, exact: true }).waitFor();

  const portal = page.locator('.aks-home-portal');
  await portal.waitFor();
  const navigation = page.getByRole('navigation', { name: config.label });
  await navigation.waitFor();

  for (const href of config.hrefs) {
    const door = navigation.locator(`a[href="${href}"]`);
    await door.waitFor();
    assert.equal(await door.isVisible(), true, `${href} must be visible on Home.`);
  }

  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
    true,
    `${config.path} must not overflow horizontally.`,
  );

  if (!mobile) {
    const layout = await page.evaluate(() => {
      const portalElement = document.querySelector('.aks-home-portal');
      const orbitElement = document.querySelector('.aks-home-orbit');
      if (!(portalElement instanceof HTMLElement) || !(orbitElement instanceof HTMLElement)) {
        return null;
      }
      return {
        portalColumns: getComputedStyle(portalElement).gridTemplateColumns,
        orbitColumns: getComputedStyle(orbitElement).gridTemplateColumns,
      };
    });
    assert.ok(layout, 'Desktop Home layout must be measurable.');
    assert.match(
      layout.portalColumns,
      /\S+\s+\S+/,
      'Desktop Home must use a two-column identity/orbit composition.',
    );
    assert.match(
      layout.orbitColumns,
      /\S+\s+\S+\s+\S+/,
      'Desktop Home orbital layer must expose three spatial columns.',
    );
  } else {
    const mobileLayout = await page.evaluate((hrefs) => {
      const orbitElement = document.querySelector('.aks-home-orbit');
      const coreElement = document.querySelector('.aks-home-core');
      if (!(orbitElement instanceof HTMLElement) || !(coreElement instanceof HTMLElement)) {
        return null;
      }

      const doors = hrefs
        .map((href) => orbitElement.querySelector(`a[href="${href}"]`))
        .filter((element) => element instanceof HTMLElement);

      return {
        columns: getComputedStyle(orbitElement).gridTemplateColumns,
        gap: getComputedStyle(orbitElement).gap,
        coreDisplay: getComputedStyle(coreElement).display,
        doorHeights: doors.map((door) => door.getBoundingClientRect().height),
        doorTops: doors.map((door) => door.getBoundingClientRect().top),
      };
    }, config.hrefs);

    assert.ok(mobileLayout, 'Mobile Home layout must be measurable.');
    assert.equal(
      mobileLayout.columns.split(' ').filter(Boolean).length,
      1,
      'Mobile Home must use one dedicated reading column.',
    );
    assert.equal(mobileLayout.gap, '0px', 'Mobile Home must use a continuous route rather than an orbital gap.');
    assert.equal(
      mobileLayout.coreDisplay,
      'none',
      'Mobile Home must remove the redundant desktop orbital core from its reading sequence.',
    );
    assert.ok(
      mobileLayout.doorHeights.every((height) => height >= 44),
      'Every mobile Home door must provide at least a 44px touch target.',
    );
    assert.ok(
      mobileLayout.doorTops.every((top, index, values) => index === 0 || top > values[index - 1]),
      'Mobile Home doors must form a clear top-to-bottom sequence.',
    );
  }
}

async function assertStaticHomeOrientation(browser, locale, viewport) {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport,
  });

  try {
    const page = await context.newPage();
    const path = locale === 'fr' ? '/fr' : '/en';
    const navigationLabel = locale === 'fr' ? 'Explorer AkikSystems' : 'Explore AkikSystems';
    const hrefs =
      locale === 'fr'
        ? [
            '/fr/profil',
            '/fr/systems',
            '/fr/ecrits',
            '/fr/apprentissage',
            '/fr/travailler-ensemble',
          ]
        : [
            '/en/profile',
            '/en/systems',
            '/en/writings',
            '/en/learning',
            '/en/work-with-us',
          ];

    const response = await page.goto(`${origin}${path}`);
    assert.equal(response?.status(), 200, `${path} must SSR without JavaScript.`);
    await page.getByRole('heading', { level: 1, name: 'AkikSystems', exact: true }).waitFor();

    const navigation = page.getByRole('navigation', { name: navigationLabel });
    await navigation.waitFor();

    for (const href of hrefs) {
      const door = navigation.locator(`a[href="${href}"]`);
      await door.waitFor();
      assert.equal(await door.isVisible(), true, `${href} must be visible before enhancement.`);
    }

    const staticState = await page.evaluate((expectedHrefs) => {
      const intro = document.querySelector('.aks-home-intro');
      const doors = expectedHrefs
        .map((href) => document.querySelector(`.aks-home-door[href="${href}"]`))
        .filter((element) => element instanceof HTMLElement);

      if (!(intro instanceof HTMLElement) || doors.length !== expectedHrefs.length) {
        return null;
      }

      const introStyles = getComputedStyle(intro);
      return {
        intro: {
          opacity: introStyles.opacity,
          visibility: introStyles.visibility,
          animationName: introStyles.animationName,
          transform: introStyles.transform,
        },
        doors: doors.map((door) => {
          const styles = getComputedStyle(door);
          return {
            opacity: styles.opacity,
            visibility: styles.visibility,
            animationName: styles.animationName,
            transform: styles.transform,
          };
        }),
        overflowFree:
          document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      };
    }, hrefs);

    assert.ok(staticState, 'Static Home orientation must be measurable.');
    assert.deepEqual(
      staticState.intro,
      {
        opacity: '1',
        visibility: 'visible',
        animationName: 'none',
        transform: 'none',
      },
      'Home identity must be fully legible in the initial static state.',
    );
    assert.ok(
      staticState.doors.every(
        (door) =>
          door.opacity === '1' &&
          door.visibility === 'visible' &&
          door.animationName === 'none' &&
          door.transform === 'none',
      ),
      'All Home destinations must be fully legible before motion or JavaScript loads.',
    );
    assert.equal(staticState.overflowFree, true, 'Static Home must not overflow the viewport.');
  } finally {
    await context.close();
  }
}

async function assertAxe(page) {
  await page.addScriptTag({ content: axe.source });
  const result = await page.evaluate(async () => globalThis.axe.run(document));
  const material = result.violations.filter(
    (violation) => violation.impact === 'critical' || violation.impact === 'serious',
  );

  assert.deepEqual(
    material.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      nodes: violation.nodes.length,
    })),
    [],
    'The qualified page must have no serious or critical axe violations.',
  );
}

(async () => {
  await waitForServer();

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    await assertHomePortal(page, 'en');
    await assertHomePortal(page, 'fr');

    await assertIntentPrefetching(browser);

    await assertStaticHomeOrientation(browser, 'en', { width: 1280, height: 800 });
    await assertStaticHomeOrientation(browser, 'fr', { width: 1280, height: 800 });
    await assertStaticHomeOrientation(browser, 'en', { width: 320, height: 720 });
    await assertStaticHomeOrientation(browser, 'fr', { width: 320, height: 720 });

    await page.goto(`${origin}/admin/login`);
    await page.getByLabel('Email').fill(adminEmail);
    await page.getByLabel('Password').fill(adminPassword);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL(`${origin}/admin`);

    await assertProfileAdministration(page);

    await assertGlobalDestinations(page);
    await assertRealDeviceClasses(browser);
    await assertFirstLevelDeepLinkAutonomy(browser);
    await assertFirstLevelDeepLinkAutonomy(browser, { mobile: true });

    await page.goto(`${origin}/admin`);

    await page.getByRole('button', { name: 'Create Sentinel' }).click();
    await page.waitForURL(/\/admin\/systems\/[0-9a-f-]+$/i);
    page.systemPath = new URL(page.url()).pathname;

    await saveLocalization(page, 'en', {
      slug: 'sentinel',
      title: 'Sentinel',
      summary: 'Operational visibility built from industrial context and inspectable evidence.',
    });
    await saveLocalization(page, 'fr', {
      slug: 'sentinel',
      title: 'Sentinel',
      summary: 'Visibilité opérationnelle issue d’un contexte industriel et de preuves inspectables.',
    });

    await savePresentation(
      page,
      'en',
      'Sentinel turns operational signals into a calm, inspectable system.',
    );
    await savePresentation(
      page,
      'fr',
      'Sentinel transforme les signaux opérationnels en un système calme et inspectable.',
    );

    await page.goto(`${origin}${page.systemPath}`);
    await page
      .locator('textarea[name="technologies"]')
      .fill('react | React\ndocker | Docker');
    await page.getByRole('button', { name: 'Save technology stack' }).click();
    await page.getByText('Technology stack updated.', { exact: true }).waitFor();

    await assertCapabilityTechnologySeparation(page);

    await page.goto(`${origin}${page.systemPath}`);
    const originContextForm = page.locator('form').filter({
      has: page.getByRole('heading', { level: 2, name: 'Origin context', exact: true }),
    });
    await originContextForm.locator('input[name="experienceTitleEn"]').fill('Marelli');
    await originContextForm
      .locator('textarea[name="experienceSummaryEn"]')
      .fill(
        'Industrial software context where operational constraints shaped the work.',
      );
    await originContextForm.locator('input[name="experienceTitleFr"]').fill('Marelli');
    await originContextForm
      .locator('textarea[name="experienceSummaryFr"]')
      .fill(
        'Contexte logiciel industriel où les contraintes opérationnelles ont façonné le travail.',
      );
    await originContextForm.getByRole('button', { name: 'Save origin context' }).click();
    await page.getByText('Professional context updated.', { exact: true }).waitFor();

    await page.locator('textarea[name="links"]').fill(
      'live | https://sentinel.akiksystems.fr',
    );
    await page.getByRole('button', { name: 'Save links' }).click();
    await page.getByText('System links updated.').waitFor();

    await page.goto(`${origin}${page.systemPath}/preview/en`);
    assert.match(await page.locator('body').innerText(), /private preview/i);
    assert.equal(
      await page.locator('meta[name="robots"]').getAttribute('content'),
      'noindex, nofollow, noarchive, nosnippet',
    );

    const beforePublish = await context.request.get(`${origin}/en/systems/sentinel`);
    assert.equal(beforePublish.status(), 404);

    await page.goto(`${origin}${page.systemPath}`);
    await page.getByRole('button', { name: 'Publish EN' }).click();
    await page.getByRole('button', { name: 'Unpublish EN' }).waitFor();

    await page.goto(`${origin}/en/systems/sentinel`);
    await page.getByRole('heading', { level: 1, name: 'Sentinel' }).waitFor();
    assert.equal(
      await page.locator('.aks-system-experience').getAttribute('data-renderer'),
      'standard',
      'Sentinel must render through the stable standard System renderer.',
    );
    await assertSystemProofTransparency(page, 'en', [
      /Industrial-context software system/i,
      /Inspectable implementation/i,
      /no customer data exposed/i,
    ]);
        const unavailableLanguage = page.locator('.aks-language-unavailable');
    await unavailableLanguage.waitFor();
    assert.equal(
      (await unavailableLanguage.innerText()).trim(),
      'French unavailable',
      'A missing published translation must be explicit.',
    );
    assert.equal(
      await page.locator('.aks-experience-meta a[hreflang="fr"]').count(),
      0,
      'A missing translation must not fall back to a misleading French link.',
    );

    await page.goto(`${origin}${page.systemPath}`);
    await page.getByRole('button', { name: 'Publish FR' }).click();
    await page.getByRole('button', { name: 'Unpublish FR' }).waitFor();

    await page.goto(`${origin}/fr/systems/sentinel`);
    await page.getByRole('heading', { level: 1, name: 'Sentinel', exact: true }).waitFor();
    await assertSystemProofTransparency(page, 'fr', [
      /contexte industriel/i,
      /Implémentation inspectable/i,
      /aucune donnée client exposée/i,
    ]);

    bootstrapL4QualificationSystems();

    await assertSystemsOverview(browser);
    await assertProtoCapGuidedDemo(browser);
    await assertOriaInteractiveEntry(browser);
    await assertTugeresStandardSystem(browser);
    await assertReusableSystemReferences(browser);
    await assertTrainingPublicJourney(browser);
    await assertCredentialPublicJourney(browser);
    await assertCredentialAdmin(page);
    await assertFutureCredentialExtensibility(page);
    await assertLearningArtifactPublicJourney(browser);
    await assertLearningOverviewExperience(browser);
    await assertLearningSeo(browser);
    await assertLearningArtifactAdmin(page);
    await assertLearningAdminWorkspace(page);
    await assertDwwmTrainingJourney(browser, page);
    await assertSentinelDossierJourney(browser, page);
    await assertTechnicalEvaluatorPaths(browser);

    await assertRepresentativeSystemSelection(page);

    await assertWorkPrincipleEvidence(page);

    await assertProfessionalJourneySelection(page);

    await assertTechnologicalJourney(page);

    await assertProfileProgressiveDepth(browser, page);
    await assertProfileWithoutPriorCv(browser);
    await assertProfileAfterPriorCvExposure(browser);

    const englishResponse = await context.request.get(`${origin}/en/systems/sentinel`);
    const englishHtml = await englishResponse.text();
    assert.equal(englishResponse.status(), 200);
    assert.match(englishHtml, /<h1[^>]*>Sentinel<\/h1>/);
    assert.match(englishHtml, /Operational visibility built from industrial context/);
    assert.match(englishHtml, /Sentinel turns operational signals/);
    assert.match(englishHtml, /https:\/\/sentinel\.akiksystems\.fr/);
    assert.match(englishHtml, /rel="canonical"/);
    assert.match(englishHtml, /hreflang="fr"/i);

    await page.goto(`${origin}/en/systems/sentinel`);
    await page.getByRole('heading', { level: 1, name: 'Sentinel' }).waitFor();
    assert.equal(
      await page.locator('.aks-experience-meta a[hreflang="fr"]').getAttribute('href'),
      '/fr/systems/sentinel',
      'A published deep translation must switch to its equivalent localized System route.',
    );

    await assertPublishedSystemDeepLinkAutonomy(browser);
    await assertPublishedSystemDeepLinkAutonomy(browser, { mobile: true });
    await assertRealDeviceClasses(browser, { includeDeep: true });
    await assertTenSecondComprehensionBaseline(browser);
    await assertGlobalKeyboardNavigation(browser);

    const reducedDesktop = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      reducedMotion: 'reduce',
    });
    try {
      const reducedPage = await reducedDesktop.newPage();
      await reducedPage.goto(`${origin}/en/systems/sentinel`);
      await reducedPage.getByRole('heading', { level: 1, name: 'Sentinel' }).waitFor();
      assert.equal(
        await reducedPage.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches),
        true,
        'Desktop qualification must exercise the reduced-motion preference.',
      );
      const reducedTokens = await reducedPage.evaluate(() => {
        const styles = getComputedStyle(document.documentElement);
        return {
          duration: styles.getPropertyValue('--aks-transition-route-duration').trim(),
          distance: styles.getPropertyValue('--aks-transition-route-distance').trim(),
        };
      });
      assert.deepEqual(reducedTokens, { duration: '1ms', distance: '0rem' });
      await reducedPage.locator('.aks-experience-nav a[href="/en/profile"]').click();
      await reducedPage.waitForURL(`${origin}/en/profile`);
      await reducedPage
        .getByRole('heading', { level: 1, name: 'Amine AKIK', exact: true })
        .waitFor();
      assert.equal(
        await reducedPage.locator('.aks-experience-nav a[aria-current="page"]').getAttribute('href'),
        '/en/profile',
        'Reduced motion must preserve complete desktop navigation semantics.',
      );
    } finally {
      await reducedDesktop.close();
    }

    assert.equal(
      await page.evaluate(() => typeof document.startViewTransition),
      'function',
      'Chromium must expose View Transitions for the enhanced route path.',
    );
    const transitionProbe = await page.evaluate(async () => {
      const link = document.querySelector('.aks-experience-nav a[href="/en/profile"]');
      if (!(link instanceof HTMLAnchorElement)) {
        return { supported: false, started: 0 };
      }
      let started = 0;
      const original = document.startViewTransition.bind(document);
      document.startViewTransition = (callback) => {
        started += 1;
        return original(callback);
      };
      link.click();
      await new Promise((resolve) => setTimeout(resolve, 50));
      return { supported: true, started };
    });
    assert.equal(transitionProbe.supported, true);
    assert.ok(
      transitionProbe.started >= 1,
      'Client-side shell navigation must opt into a View Transition when supported.',
    );
    await page.waitForURL(`${origin}/en/profile`);
    await page
      .getByRole('heading', { level: 1, name: 'Amine AKIK', exact: true })
      .waitFor();
    assert.equal(
      await page.locator('.aks-experience-nav a[aria-current="page"]').getAttribute('href'),
      '/en/profile',
      'The destination must remain usable after the enhanced transition completes.',
    );
    await page.goto(`${origin}/en/systems/sentinel`);
    await page.getByRole('heading', { level: 1, name: 'Sentinel' }).waitFor();
    for (const href of [
      '/en/profile',
      '/en/systems',
      '/en/writings',
      '/en/learning',
      '/en/work-with-us',
    ]) {
      await page.locator(`.aks-experience-nav a[href="${href}"]`).waitFor();
    }
    assert.equal(
      await page.locator('.aks-experience-nav a[aria-current="page"]').getAttribute('href'),
      '/en/systems',
      'A deep System route must keep Systems marked as the current global destination.',
    );
    const localContext = page.locator('[aria-label="Current context"]');
    assert.equal(
      await localContext.locator('a').getAttribute('href'),
      '/en/systems',
      'Deep System local context must link back to its first-level destination.',
    );
    assert.equal(
      await localContext.locator('[aria-current="page"]').innerText(),
      'Sentinel',
      'Deep System local context must identify the current item.',
    );
    assert.equal(await page.locator('html').getAttribute('lang'), 'en');
    assert.equal(
      await page.locator('a[href="https://sentinel.akiksystems.fr"]').getAttribute('href'),
      'https://sentinel.akiksystems.fr',
    );
    assert.equal(
      await page.locator('link[rel="canonical"]').getAttribute('href'),
      'https://akiksystems.com/en/systems/sentinel',
    );
    assert.equal(
      await page.locator('link[rel="alternate"][hreflang="fr"]').getAttribute('href'),
      'https://akiksystems.com/fr/systems/sentinel',
    );

    await page.goto(`${origin}${page.systemPath}`);
    await saveLocalization(page, 'fr', {
      slug: 'sentinel',
      title: 'Sentinel',
      summary: 'Visibilité opérationnelle, contexte industriel et preuves inspectables.',
    });

    const englishAfterFrenchEdit = await context.request.get(
      `${origin}/en/systems/sentinel`,
    );
    assert.match(
      await englishAfterFrenchEdit.text(),
      /Operational visibility built from industrial context/,
    );

    const frenchSystemBeforeRepublish = await context.request.get(
      `${origin}/fr/systems/sentinel`,
    );
    assert.match(
      await frenchSystemBeforeRepublish.text(),
      /Visibilité opérationnelle issue d’un contexte industriel et de preuves inspectables\./,
      'Saving a draft must leave the previous FR public snapshot unchanged.',
    );
    assert.doesNotMatch(
      await frenchSystemBeforeRepublish.text(),
      /Visibilité opérationnelle, contexte industriel et preuves inspectables\./,
    );

    const frenchProfileBeforeRepublish = await context.request.get(
      `${origin}/fr/profil`,
    );
    assert.equal(frenchProfileBeforeRepublish.status(), 200);
    assert.match(
      await frenchProfileBeforeRepublish.text(),
      /Visibilité opérationnelle issue d’un contexte industriel et de preuves inspectables\./,
      'Profile references must remain on the published System snapshot while a newer draft exists.',
    );

    await page.goto(`${origin}${page.systemPath}`);
    await page.getByRole('button', { name: 'Publish FR update' }).click();
    await page.getByText('FR public snapshot published.', { exact: true }).waitFor();

    const frenchProfileAfterRepublish = await context.request.get(
      `${origin}/fr/profil`,
    );
    assert.equal(frenchProfileAfterRepublish.status(), 200);
    assert.match(
      await frenchProfileAfterRepublish.text(),
      /Visibilité opérationnelle, contexte industriel et preuves inspectables\./,
      'Profile must move to the new System content only after the FR System snapshot is republished.',
    );

    const mobile = await browser.newContext({
      viewport: { width: 320, height: 720 },
      reducedMotion: 'reduce',
    });
    try {
      const mobilePage = await mobile.newPage();
      await assertGlobalDestinations(mobilePage, { mobile: true });
      await assertHomePortal(mobilePage, 'en', { mobile: true });
      await assertHomePortal(mobilePage, 'fr', { mobile: true });
      await mobilePage.goto(`${origin}/en/systems/sentinel`);
      assert.equal(
        await mobilePage.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches),
        true,
        'Mobile qualification must exercise the reduced-motion preference.',
      );
      const reducedMotionTokens = await mobilePage.evaluate(() => {
        const styles = getComputedStyle(document.documentElement);
        return {
          duration: styles.getPropertyValue('--aks-transition-route-duration').trim(),
          distance: styles.getPropertyValue('--aks-transition-route-distance').trim(),
        };
      });
      assert.deepEqual(
        reducedMotionTokens,
        { duration: '1ms', distance: '0rem' },
        'Reduced motion must remove perceptible route travel while preserving navigation.',
      );
      const mobileMenu = mobilePage.locator('.aks-experience-mobile-menu');
      await mobilePage.locator('.aks-experience-mobile-menu-trigger').click();
      assert.equal(
        await mobilePage
          .locator('.aks-experience-mobile-nav a[aria-current="page"]')
          .getAttribute('href'),
        '/en/systems',
        'Mobile deep System routes must preserve Systems as the active destination.',
      );
      const mobileLocalContext = mobilePage.locator('[aria-label="Current context"]');
      assert.equal(await mobileLocalContext.locator('a').getAttribute('href'), '/en/systems');
      assert.equal(
        await mobileLocalContext.locator('[aria-current="page"]').innerText(),
        'Sentinel',
      );
      await mobilePage.locator('.aks-experience-mobile-menu-trigger').click();
      assert.equal(await mobileMenu.getAttribute('open'), null);

      // Reload before the keyboard-only skip-link scenario so focus starts from
      // the document rather than remaining on the disclosure trigger.
      await mobilePage.goto(`${origin}/en/systems/sentinel`);
      await mobilePage.keyboard.press('Tab');
      assert.equal(
        await mobilePage.evaluate(() => document.activeElement?.classList.contains('aks-skip-link')),
        true,
      );
      await mobilePage.keyboard.press('Enter');
      assert.equal(
        await mobilePage.evaluate(() => document.activeElement?.id),
        'experience-outlet',
      );
      assert.equal(
        await mobilePage.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
        true,
        '320px layout must not require horizontal page scrolling.',
      );
      await assertAxe(mobilePage);
    } finally {
      await mobile.close();
    }

    const lighthouseBin = process.env.LIGHTHOUSE_BIN;
    assert.ok(lighthouseBin, 'LIGHTHOUSE_BIN is required for performance qualification.');

    const runMobileLighthouse = (attempt) => {
      const lighthouseOutput = `/tmp/akiksystems-lighthouse-${attempt}.json`;
      execFileSync(
        lighthouseBin,
        [
          `${origin}/en/systems/sentinel`,
          '--only-categories=performance',
          '--form-factor=mobile',
          '--throttling-method=simulate',
          '--chrome-flags=--headless --no-sandbox',
          '--output=json',
          `--output-path=${lighthouseOutput}`,
          '--quiet',
        ],
        {
          env: {
            ...process.env,
            CHROME_PATH: chromium.executablePath(),
          },
          stdio: 'pipe',
        },
      );

      const report = JSON.parse(fs.readFileSync(lighthouseOutput, 'utf8'));
      return {
        performanceScore: report.categories?.performance?.score ?? 0,
        lcp:
          report.audits?.['largest-contentful-paint']?.numericValue ?? Infinity,
        cls:
          report.audits?.['cumulative-layout-shift']?.numericValue ?? Infinity,
        tbt:
          report.audits?.['total-blocking-time']?.numericValue ?? Infinity,
      };
    };

    const lcpTargetMs = 4500;
    const lcpCiVarianceAllowanceMs = 150;
    const lcpCiCeilingMs = lcpTargetMs + lcpCiVarianceAllowanceMs;
    const lcpBorderlineRetestWindowMs = 300;

    const writeLighthouseObservation = (attempt, metrics) => {
      process.stdout.write(
        `Mobile Lighthouse observation #${attempt}: score=${metrics.performanceScore.toFixed(2)}, LCP=${Math.round(metrics.lcp)}ms, CLS=${metrics.cls.toFixed(3)}, TBT=${Math.round(metrics.tbt)}ms. Target LCP<=${lcpTargetMs}ms; CI variance ceiling<=${lcpCiCeilingMs}ms.\\n`,
      );
    };

    let lighthouseMetrics = runMobileLighthouse(1);
    writeLighthouseObservation(1, lighthouseMetrics);

    if (
      lighthouseMetrics.lcp > lcpCiCeilingMs &&
      lighthouseMetrics.lcp <= lcpCiCeilingMs + lcpBorderlineRetestWindowMs &&
      lighthouseMetrics.cls <= 0.1 &&
      lighthouseMetrics.tbt <= 600
    ) {
      process.stdout.write(
        `Borderline synthetic LCP exceeded the CI ceiling by ${Math.round(lighthouseMetrics.lcp - lcpCiCeilingMs)}ms; retrying Lighthouse once without rerunning the functional browser qualification.\\n`,
      );
      lighthouseMetrics = runMobileLighthouse(2);
      writeLighthouseObservation(2, lighthouseMetrics);
    }

    if (
      lighthouseMetrics.lcp > lcpTargetMs &&
      lighthouseMetrics.lcp <= lcpCiCeilingMs
    ) {
      process.stdout.write(
        `Mobile simulated LCP exceeded the 4.5s target by ${Math.round(lighthouseMetrics.lcp - lcpTargetMs)}ms but remained within the ${lcpCiVarianceAllowanceMs}ms synthetic-runner variance allowance.\\n`,
      );
    }

    assert.ok(
      lighthouseMetrics.lcp <= lcpCiCeilingMs,
      `Mobile simulated LCP exceeded the 4.5s target plus ${lcpCiVarianceAllowanceMs}ms CI variance allowance after qualification: ${lighthouseMetrics.lcp}ms`,
    );
    assert.ok(
      lighthouseMetrics.cls <= 0.1,
      `Mobile CLS regressed above 0.1: ${lighthouseMetrics.cls}`,
    );
    assert.ok(
      lighthouseMetrics.tbt <= 600,
      `Mobile TBT regressed above 600ms: ${lighthouseMetrics.tbt}ms`,
    );

    const noJs = await browser.newContext({ javaScriptEnabled: false });
    try {
      const noJsPage = await noJs.newPage();
      const response = await noJsPage.goto(`${origin}/en/systems/sentinel`);
      assert.equal(response?.status(), 200);
      await noJsPage.getByRole('heading', { level: 1, name: 'Sentinel' }).waitFor();
      assert.match(
        await noJsPage.locator('body').innerText(),
        /Sentinel turns operational signals/,
      );
      await noJsPage.locator('.aks-brand-signature').waitFor();
      for (const href of [
        '/en/profile',
        '/en/systems',
        '/en/writings',
        '/en/learning',
        '/en/work-with-us',
      ]) {
        await noJsPage.locator(`.aks-experience-nav a[href="${href}"]`).waitFor();
      }
      assert.equal(
        await noJsPage.locator('.aks-experience-nav a[aria-current="page"]').getAttribute('href'),
        '/en/systems',
        'Deep-link orientation must identify Systems before client enhancement.',
      );
      assert.equal(
        await noJsPage.locator('[aria-label="Current context"] [aria-current="page"]').innerText(),
        'Sentinel',
        'Deep-link local context must identify the current System without JavaScript.',
      );
    } finally {
      await noJs.close();
    }

    process.stdout.write(
      'AkikSystems full browser qualification passed: Home, Profile, Systems, EN/FR publication, deep links, responsive media, accessibility, keyboard access, 320px reflow, reduced motion, Lighthouse performance, and no-JS reading are verified.\\n',
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
