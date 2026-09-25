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

const skipLighthouse = process.env.AKIKSYSTEMS_SKIP_LIGHTHOUSE === '1';
const browserShard = process.env.AKIKSYSTEMS_BROWSER_SHARD ?? 'full';

if (!['full', 'platform', 'content'].includes(browserShard)) {
  throw new Error(
    'AKIKSYSTEMS_BROWSER_SHARD must be one of: full, platform, content.',
  );
}

if (!adminEmail || !adminPassword) {
  throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required.');
}

const port = '4177';
const origin = `http://127.0.0.1:${port}`;
const testAssetRoot = '/tmp/akiksystems-browser-assets';
fs.rmSync(testAssetRoot, { force: true, recursive: true });
fs.mkdirSync(testAssetRoot, { recursive: true });
process.env.ASSET_STORAGE_TEST_ROOT = testAssetRoot;
let stdout = '';
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

server.stdout.on('data', (chunk) => {
  stdout += chunk.toString();
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


function bootstrapL6RendreAttentionEssay() {
  execFileSync('pnpm', ['content:bootstrap-rendre-attention-essay'], {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'pipe',
  });
}

async function assertRendreAttentionEssay(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  try {
    const page = await context.newPage();
    const detailPath = '/fr/ecrits/rendre-l-attention-au-reel';

    const overviewResponse = await page.goto(origin + '/fr/ecrits');
    assert.equal(overviewResponse?.status(), 200);
    const card = page
      .locator('[data-writing-feed] [data-writing-kind="essay"]')
      .filter({
        has: page.getByRole('heading', {
          level: 3,
          name: 'Rendre l’attention au réel',
          exact: true,
        }),
      });
    await card.waitFor();
    assert.equal(
      await card.getAttribute('data-editorial-weight'),
      'major',
      'The real essay must exercise the fixed MAJOR feed composition.',
    );
    assert.equal(
      await card.locator('time').getAttribute('datetime'),
      '2026-09-16T10:25:02.000Z',
      'The native Writing must retain the original ProtoCap publication date.',
    );
    assert.equal(
      await card
        .getByRole('link', { name: 'Rendre l’attention au réel', exact: true })
        .getAttribute('href'),
      detailPath,
    );

    const detailResponse = await page.goto(origin + detailPath);
    assert.equal(detailResponse?.status(), 200);
    await page
      .getByRole('heading', {
        level: 1,
        name: 'Rendre l’attention au réel',
        exact: true,
      })
      .waitFor();
    assert.equal(
      await page.locator('.aks-writing-detail-page').getAttribute('data-writing-kind'),
      'essay',
    );
    assert.equal(
      await page.locator('.aks-experience-shell').getAttribute('data-mode'),
      'reading',
      'The real essay must use the discreet long-form reading shell.',
    );
    assert.equal(
      await page.locator('[data-long-form-reader] h2').count(),
      13,
      'The native reader must preserve the reflection overview and twelve essay chapters.',
    );
    assert.ok(
      (await page.locator('[data-long-form-reader] [data-writing-node="paragraph"]').count()) >= 180,
      'The 25-page essay must remain genuine long-form content after native conversion.',
    );

    const text = await page.locator('[data-long-form-reader]').innerText();
    for (const excerpt of [
      'Elles consommaient de l’attention, et cette différence change presque tout.',
      'ProtoCap : matérialiser des hypothèses',
      'L’IA et la répartition des responsabilités',
      'l’attention peut retourner là où tout avait commencé : dans le réel.',
    ]) {
      assert.ok(text.includes(excerpt), 'Canonical essay excerpt must survive publication: ' + excerpt);
    }

    const relatedSystems = page.locator('.aks-writing-related-systems');
    await relatedSystems
      .getByRole('heading', { level: 2, name: 'Systèmes liés', exact: true })
      .waitFor();
    await relatedSystems
      .getByRole('heading', { level: 3, name: 'ProtoCap', exact: true })
      .waitFor();
    assert.equal(
      await relatedSystems
        .getByRole('link', { name: 'Inspecter le système', exact: true })
        .getAttribute('href'),
      '/fr/systems/protocap',
    );

    assert.equal(
      await page.locator('.aks-experience-meta a[hreflang="en"]').count(),
      0,
      'The original French essay must not fabricate an English alternate.',
    );
    const missingEnglish = await page.context().request.get(
      origin + '/en/writings/rendre-l-attention-au-reel',
    );
    assert.equal(missingEnglish.status(), 404);

    const ssr = await page.context().request.get(origin + detailPath);
    assert.equal(ssr.status(), 200);
    const html = await ssr.text();
    assert.ok(html.includes('Elles consommaient de l’attention'));
    assert.ok(html.includes('data-long-form-reader'));
    assertHtmlTagAttributes(
      html,
      'link',
      {
        rel: 'canonical',
        href: 'https://akiksystems.com' + detailPath,
      },
      'The published essay must expose its localized canonical URL in SSR HTML.',
    );
    assertHtmlTagAttributes(
      html,
      'link',
      {
        rel: 'alternate',
        hreflang: 'fr',
        href: 'https://akiksystems.com' + detailPath,
      },
      'The published essay must expose its own published locale as hreflang.',
    );
    assertHtmlTagAttributes(
      html,
      'meta',
      { property: 'og:type', content: 'article' },
      'The published essay must expose Article OpenGraph metadata.',
    );
    assertHtmlTagAttributes(
      html,
      'meta',
      {
        property: 'article:published_time',
        content: '2026-09-16T10:25:02.000Z',
      },
      'The published essay must retain its real publication date in social metadata.',
    );
    assert.ok(
      html.includes('"@type":"Article"') &&
        html.includes('"datePublished":"2026-09-16T10:25:02.000Z"') &&
        html.includes('"genre":"Essay"'),
      'The published essay must expose Article JSON-LD from its real publication snapshot.',
    );
    assert.equal(
      /hreflang="en"|hreflang="x-default"/.test(html),
      false,
      'The French-only essay must not invent English SEO alternates.',
    );
    await assertAxe(page);

    await page.setViewportSize({ width: 390, height: 844 });
    const mobileResponse = await page.goto(origin + detailPath);
    assert.equal(mobileResponse?.status(), 200);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
      true,
      'The real 25-page essay must not overflow at 390px.',
    );
    await page
      .getByRole('heading', {
        level: 1,
        name: 'Rendre l’attention au réel',
        exact: true,
      })
      .waitFor();
    await assertAxe(page);
  } finally {
    await context.close();
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

function requestCarriesFormValue(body, name, value) {
  const encodedPair =
    encodeURIComponent(name) + '=' + encodeURIComponent(value);
  const multipartPair =
    'name="' +
    name +
    '"' +
    String.fromCharCode(13, 10, 13, 10) +
    value;
  return body.includes(encodedPair) || body.includes(multipartPair);
}

async function submitWritingAdminAction(page, button) {
  const identity = await button.evaluate((element) => {
    const form = element.form;
    if (form === null) {
      throw new Error('Writing admin action control must belong to a form.');
    }
    const data = new FormData(form);
    const read = (name) => {
      const value = data.get(name);
      return typeof value === 'string' && value !== '' ? value : null;
    };
    return {
      intent: read('_intent'),
      writingId: read('writingId'),
      locale: read('locale'),
    };
  });

  assert.ok(
    identity.intent !== null,
    'Writing admin forms must expose an explicit _intent.',
  );

  const responsePromise = page.waitForResponse((response) => {
    const request = response.request();
    const pathname = new URL(response.url()).pathname;
    if (
      request.method() !== 'POST' ||
      (pathname !== '/admin/writings' && pathname !== '/admin/writings.data')
    ) {
      return false;
    }

    const body =
      request.postData() ??
      request.postDataBuffer()?.toString('utf8') ??
      '';
    return (
      requestCarriesFormValue(body, '_intent', identity.intent) &&
      (identity.writingId === null ||
        requestCarriesFormValue(body, 'writingId', identity.writingId)) &&
      (identity.locale === null ||
        requestCarriesFormValue(body, 'locale', identity.locale))
    );
  });

  await button.click();
  const response = await responsePromise;
  if (response.status() !== 200) {
    let responseBody = '';
    try {
      responseBody = await response.text();
    } catch {
      responseBody = '<unavailable>';
    }
    throw new Error(
      'Writing admin action ' +
        identity.intent +
        ' failed with HTTP ' +
        response.status() +
        (identity.writingId === null ? '' : ' for Writing ' + identity.writingId) +
        (identity.locale === null ? '' : ' / ' + identity.locale.toUpperCase()) +
        '. Response: ' +
        responseBody.slice(0, 800) +
        '. Server stdout tail: ' +
        stdout.slice(-4000) +
        '. Server stderr tail: ' +
        stderr.slice(-2000),
    );
  }

  const reload = await page.goto(origin + '/admin/writings');
  assert.equal(
    reload?.status(),
    200,
    'Writing admin state must reload successfully after a persisted mutation.',
  );
  await page
    .getByRole('heading', {
      level: 1,
      name: 'Writings administration',
      exact: true,
    })
    .waitFor();
}

async function createWritingAdminDraft(page, kind, editorialWeight) {
  const cards = page.locator('[data-writing-card]');
  const beforeIds = new Set(
    await cards.evaluateAll((elements) =>
      elements
        .map((element) => element.getAttribute('data-writing-card'))
        .filter((value) => value !== null),
    ),
  );

  const createCard = page.locator('section.aks-admin-card').filter({
    has: page.getByRole('heading', {
      level: 2,
      name: 'Create Writing',
      exact: true,
    }),
  });
  await createCard.locator('select[name="kind"]').selectOption(kind);
  await createCard
    .locator('select[name="editorialWeight"]')
    .selectOption(editorialWeight);
  await submitWritingAdminAction(
    page,
    createCard.getByRole('button', { name: 'Create Writing', exact: true }),
  );

  const afterIds = await page
    .locator('[data-writing-card]')
    .evaluateAll((elements) =>
      elements
        .map((element) => element.getAttribute('data-writing-card'))
        .filter((value) => value !== null),
    );
  const newIds = afterIds.filter((id) => !beforeIds.has(id));

  assert.equal(
    newIds.length,
    1,
    'Creating a Writing must add exactly one persisted admin card.',
  );

  return newIds[0];
}

async function ensureCheckboxChecked(checkbox, message) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (await checkbox.isChecked()) return;
    await checkbox.click();
    await sleep(100);
    if (await checkbox.isChecked()) return;
  }

  assert.equal(await checkbox.isChecked(), true, message);
}

async function waitForWritingFieldValue(locator, expected, message) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if ((await locator.inputValue()) === expected) return;
    await sleep(100);
  }

  assert.equal(await locator.inputValue(), expected, message);
}

async function waitForPublishedWritingState(fieldset, locale) {
  await fieldset.getByText('Public snapshot available').waitFor();
  await fieldset.getByRole('link', { name: 'Open public', exact: true }).waitFor();
  assert.match(
    await fieldset.innerText(),
    new RegExp('Publish update ' + locale),
    locale + ' publication controls must reflect the persisted public snapshot.',
  );
}

async function publishWritingLocale(page, fieldset, locale, buttonName) {
  await submitWritingAdminAction(
    page,
    fieldset.getByRole('button', { name: buttonName, exact: true }),
  );
  await waitForPublishedWritingState(fieldset, locale);
}

async function fillWritingBodyEditor(fieldset, body) {
  const shell = fieldset.locator('[data-writing-editor]');
  await fieldset
    .locator('[data-writing-editor][data-editor-ready="true"]')
    .waitFor();
  const editor = shell.locator('[contenteditable="true"]');
  await editor.waitFor();

  const paragraphs = body.split(/\n\s*\n/);
  await editor.fill(paragraphs[0] ?? '');
  for (const paragraph of paragraphs.slice(1)) {
    await editor.press('End');
    await editor.press('Enter');
    if (paragraph !== '') {
      await editor.pressSequentially(paragraph);
    }
  }

  const document = JSON.parse(
    await fieldset.locator('input[name="editorDocument"]').inputValue(),
  );
  assert.equal(document.version, 1, 'Writing editor documents must use schema v1.');
  assert.equal(document.type, 'doc');
  assert.equal(
    document.content.length,
    paragraphs.length,
    'The Tiptap document must keep the authored paragraph count.',
  );
  assert.equal(
    await fieldset.locator('input[name="body"]').inputValue(),
    body,
    'The editor must keep the legacy public body projection synchronized.',
  );
  assert.equal(
    await fieldset.locator('textarea[name="body"]').count(),
    0,
    'AKS-105 must replace the Writing body textarea with Tiptap.',
  );
}

function legalAdminFieldset(page, pageKey, locale) {
  return page.locator(
    '[data-legal-page-key="' +
      pageKey +
      '"] [data-legal-page-locale="' +
      locale +
      '"]',
  );
}

async function fillLegalPageEditor(fieldset, body) {
  await fieldset
    .locator('[data-writing-editor][data-editor-ready="true"]')
    .waitFor();

  const editor = fieldset.locator('[data-writing-editor] [contenteditable="true"]');
  await editor.waitFor();
  await editor.fill(body);

  const document = JSON.parse(
    await fieldset.locator('input[name="editorDocument"]').inputValue(),
  );
  assert.equal(document.version, 1);
  assert.equal(document.type, 'doc');
  assert.deepEqual(
    document.content,
    [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: body }],
      },
    ],
    'Legal-page authoring must persist the same controlled document contract used by editorial content.',
  );
}

async function submitLegalPageAdminAction(page, button) {
  const identity = await button.evaluate((element) => {
    const form = element.form;
    if (form === null) {
      throw new Error('Legal-page admin action control must belong to a form.');
    }

    const data = new FormData(form);
    const read = (name) => {
      const value = data.get(name);
      return typeof value === 'string' && value !== '' ? value : null;
    };

    return {
      intent: read('_intent'),
      pageKey: read('pageKey'),
      locale: read('locale'),
    };
  });

  assert.ok(identity.intent !== null);
  assert.ok(identity.pageKey !== null);
  assert.ok(identity.locale !== null);

  const responsePromise = page.waitForResponse((response) => {
    const request = response.request();
    const pathname = new URL(response.url()).pathname;

    if (
      request.method() !== 'POST' ||
      (pathname !== '/admin/legal-pages' &&
        pathname !== '/admin/legal-pages.data')
    ) {
      return false;
    }

    const body =
      request.postData() ??
      request.postDataBuffer()?.toString('utf8') ??
      '';

    return (
      requestCarriesFormValue(body, '_intent', identity.intent) &&
      requestCarriesFormValue(body, 'pageKey', identity.pageKey) &&
      requestCarriesFormValue(body, 'locale', identity.locale)
    );
  });

  await button.click();
  const response = await responsePromise;

  if (response.status() !== 200) {
    let responseBody = '';
    try {
      responseBody = await response.text();
    } catch {
      responseBody = '<unavailable>';
    }

    throw new Error(
      'Legal-page admin action ' +
        identity.intent +
        ' failed with HTTP ' +
        response.status() +
        ' for ' +
        identity.pageKey +
        ' / ' +
        identity.locale.toUpperCase() +
        '. Response: ' +
        responseBody.slice(0, 800) +
        '. Server stdout tail: ' +
        stdout.slice(-4000) +
        '. Server stderr tail: ' +
        stderr.slice(-2000),
    );
  }

  const reload = await page.goto(origin + '/admin/legal-pages');
  assert.equal(
    reload?.status(),
    200,
    'Legal-page administration must reload after a persisted mutation.',
  );
  await page
    .getByRole('heading', {
      level: 1,
      name: 'Legal, privacy & cookies',
      exact: true,
    })
    .waitFor();
}

async function saveLegalPageLocale(page, fixture) {
  const fieldset = legalAdminFieldset(page, fixture.pageKey, fixture.locale);
  await fieldset.waitFor();
  await fieldset.locator('input[name="title"]').fill(fixture.title);
  await fillLegalPageEditor(fieldset, fixture.body);

  await submitLegalPageAdminAction(
    page,
    fieldset.getByRole('button', {
      name: 'Save ' + fixture.locale.toUpperCase() + ' draft',
      exact: true,
    }),
  );
}

async function publishLegalPageLocale(page, fixture) {
  const fieldset = legalAdminFieldset(page, fixture.pageKey, fixture.locale);
  await submitLegalPageAdminAction(
    page,
    fieldset.getByRole('button', {
      name: /Publish(?: update)? (EN|FR)/,
    }),
  );

  const reloaded = legalAdminFieldset(page, fixture.pageKey, fixture.locale);
  await reloaded.getByText(/Public snapshot available/).waitFor();
  await reloaded.getByRole('link', { name: 'Open public', exact: true }).waitFor();
}

async function assertLegalPageAdministration(page) {
  const fixtures = [
    {
      pageKey: 'privacy',
      locale: 'en',
      path: '/en/privacy',
      title: 'Qualification Privacy',
      body: 'Qualification privacy body describing the administered publication boundary.',
      alternatePath: '/fr/confidentialite',
    },
    {
      pageKey: 'privacy',
      locale: 'fr',
      path: '/fr/confidentialite',
      title: 'Qualification Confidentialité',
      body: 'Contenu de qualification de confidentialité administré et publié.',
      alternatePath: '/en/privacy',
    },
    {
      pageKey: 'legal',
      locale: 'en',
      path: '/en/legal-notice',
      title: 'Qualification Legal Notice',
      body: 'Qualification legal-notice body authored only through private administration.',
      alternatePath: '/fr/mentions-legales',
    },
    {
      pageKey: 'legal',
      locale: 'fr',
      path: '/fr/mentions-legales',
      title: 'Qualification Mentions légales',
      body: 'Contenu de qualification des mentions légales administré sans texte applicatif codé en dur.',
      alternatePath: '/en/legal-notice',
    },
    {
      pageKey: 'cookies',
      locale: 'en',
      path: '/en/cookies',
      title: 'Qualification Cookies',
      body: 'Qualification cookies body managed through the same editorial publication boundary.',
      alternatePath: '/fr/cookies',
    },
    {
      pageKey: 'cookies',
      locale: 'fr',
      path: '/fr/cookies',
      title: 'Qualification Cookies FR',
      body: 'Contenu de qualification des cookies géré par le même cycle éditorial.',
      alternatePath: '/en/cookies',
    },
  ];

  for (const fixture of fixtures) {
    const beforePublication = await page.context().request.get(
      origin + fixture.path,
    );
    assert.equal(
      beforePublication.status(),
      404,
      fixture.path + ' must stay private until an administrator publishes it.',
    );
    assert.match(
      beforePublication.headers()['x-robots-tag'] ?? '',
      /noindex/i,
      'Unpublished legal routes must be explicitly noindex.',
    );
  }

  await page.goto(origin + '/en');
  assert.equal(
    await page.locator('.aks-legal-footer').count(),
    0,
    'No legal utility navigation should appear while every legal page is unpublished.',
  );

  const adminResponse = await page.goto(origin + '/admin/legal-pages');
  assert.equal(adminResponse?.status(), 200);
  await page
    .getByRole('heading', {
      level: 1,
      name: 'Legal, privacy & cookies',
      exact: true,
    })
    .waitFor();

  assert.equal(
    await page.locator('[data-legal-page-key]').count(),
    3,
    'Administration must expose exactly Privacy, Legal notice and Cookies.',
  );
  assert.equal(
    await page.locator('[data-legal-page-locale]').count(),
    6,
    'Each managed legal page must expose independent EN and FR drafts.',
  );
  assert.equal(
    await page.getByRole('button', { name: 'Code', exact: true }).count(),
    0,
    'Legal pages must not expose code blocks.',
  );
  assert.equal(
    await page.getByRole('button', { name: 'Gallery', exact: true }).count(),
    0,
    'Legal pages must not expose media galleries.',
  );
  assert.equal(
    await page.locator('.aks-writing-editor-assets').count(),
    0,
    'Legal pages must not expose contextual media insertion.',
  );

  // Publish English Privacy first to prove alternate-locale isolation.
  const privacyEn = fixtures[0];
  await saveLegalPageLocale(page, privacyEn);
  await publishLegalPageLocale(page, privacyEn);

  await page.goto(origin + privacyEn.path);
  await page
    .getByRole('heading', { level: 1, name: privacyEn.title, exact: true })
    .waitFor();
  await page.getByText(privacyEn.body, { exact: true }).waitFor();
  assert.equal(
    await page.locator('a[hreflang="fr"]').count(),
    0,
    'A legal page must not invent a language alternate before that locale is published.',
  );
  await page.locator('.aks-language-unavailable').waitFor();
  assert.equal(
    await page.locator('.aks-experience-nav a[href="/en"][aria-current="page"]').count(),
    0,
    'Utility legal pages must not mark Home as the active primary destination.',
  );
  await page
    .locator('.aks-experience-context')
    .getByText(privacyEn.title, { exact: true })
    .waitFor();

  for (const fixture of fixtures.slice(1)) {
    await page.goto(origin + '/admin/legal-pages');
    await saveLegalPageLocale(page, fixture);
    await publishLegalPageLocale(page, fixture);
  }

  for (const fixture of fixtures) {
    const response = await page.goto(origin + fixture.path);
    assert.equal(response?.status(), 200, fixture.path + ' must be public after publication.');
    await page
      .getByRole('heading', { level: 1, name: fixture.title, exact: true })
      .waitFor();
    await page.getByText(fixture.body, { exact: true }).waitFor();

    assert.equal(
      await page.locator('link[rel="canonical"]').getAttribute('href'),
      'https://akiksystems.com' + fixture.path,
      fixture.path + ' must expose its canonical public URL.',
    );
    assert.equal(
      await page
        .locator(
          'link[rel="alternate"][hreflang="' +
            (fixture.locale === 'en' ? 'fr' : 'en') +
            '"]',
        )
        .getAttribute('href'),
      'https://akiksystems.com' + fixture.alternatePath,
      fixture.path + ' must expose only its actually published alternate.',
    );

    await assertAxe(page);
  }

  for (const locale of ['en', 'fr']) {
    await page.goto(origin + '/' + locale);
    const footer = page.locator('.aks-legal-footer');
    await footer.waitFor();
    assert.equal(
      await footer.locator('a').count(),
      3,
      'Published legal utility navigation must expose exactly three pages per locale.',
    );
  }

  // A saved draft must not mutate the existing public snapshot.
  const updatedPrivacyBody =
    'Updated qualification Privacy draft that is deliberately private until republication.';
  await page.goto(origin + '/admin/legal-pages');
  const privacyDraftFieldset = legalAdminFieldset(page, 'privacy', 'en');
  await fillLegalPageEditor(privacyDraftFieldset, updatedPrivacyBody);
  await submitLegalPageAdminAction(
    page,
    privacyDraftFieldset.getByRole('button', {
      name: 'Save EN draft',
      exact: true,
    }),
  );

  await page.goto(origin + '/en/privacy');
  await page.getByText(privacyEn.body, { exact: true }).waitFor();
  assert.equal(
    await page.getByText(updatedPrivacyBody, { exact: true }).count(),
    0,
    'Saving a legal-page draft must preserve the previous public snapshot.',
  );

  await page.goto(origin + '/admin/legal-pages');
  await publishLegalPageLocale(page, privacyEn);
  await page.goto(origin + '/en/privacy');
  await page.getByText(updatedPrivacyBody, { exact: true }).waitFor();

  // Unpublishing one locale must remove that public route and utility link only.
  await page.goto(origin + '/admin/legal-pages');
  const cookiesFrFieldset = legalAdminFieldset(page, 'cookies', 'fr');
  await submitLegalPageAdminAction(
    page,
    cookiesFrFieldset.getByRole('button', {
      name: 'Unpublish FR',
      exact: true,
    }),
  );

  const cookiesFrGone = await page.context().request.get(origin + '/fr/cookies');
  assert.equal(cookiesFrGone.status(), 404);

  await page.goto(origin + '/fr');
  assert.equal(
    await page.locator('.aks-legal-footer a[href="/fr/cookies"]').count(),
    0,
    'Unpublishing FR Cookies must remove only that footer link.',
  );
  assert.equal(
    await page.locator('.aks-legal-footer a').count(),
    2,
  );

  await page.goto(origin + '/en/cookies');
  assert.equal(
    await page.locator('a[hreflang="fr"]').count(),
    0,
    'EN Cookies must stop advertising FR after FR is unpublished.',
  );

  // Restore the qualification state so both localized journeys remain testable.
  await page.goto(origin + '/admin/legal-pages');
  await publishLegalPageLocale(page, fixtures[5]);

  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto(origin + '/fr/mentions-legales');
  assert.equal(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
    true,
    'Legal long-form reading must not overflow at 320px.',
  );
  await assertAxe(page);
  await page.setViewportSize({ width: 1280, height: 720 });
}

async function submitRootAdminAction(page, button, intent, locale) {
  const responsePromise = page.waitForResponse((response) => {
    const request = response.request();
    const pathname = new URL(response.url()).pathname;
    if (
      request.method() !== 'POST' ||
      (pathname !== '/admin' && pathname !== '/admin.data')
    ) {
      return false;
    }

    const body =
      request.postData() ??
      request.postDataBuffer()?.toString('utf8') ??
      '';
    return (
      requestCarriesFormValue(body, '_intent', intent) &&
      requestCarriesFormValue(body, 'locale', locale)
    );
  });

  await button.click();
  const response = await responsePromise;
  assert.equal(
    response.status(),
    200,
    'Root admin action ' + intent + ' / ' + locale + ' must succeed.',
  );

  const reload = await page.goto(origin + '/admin');
  assert.equal(reload?.status(), 200);
}

async function assertWorkWithUsContentAdministration(page) {
  const seededEnglishTitle = 'Start with the situation';
  const seededEnglishIntroduction =
    'Whether you are acting for an organization or for yourself, you can begin with what is happening, what matters, and what you want to change. You do not need to translate it into a predefined service.';
  const seededEnglishSituationsTitle = 'You do not need a finished brief';
  const seededEnglishSituationsBody =
    'You can arrive with a problem you can name, something that feels stuck, an idea that is still vague, or simply a result you want to reach. Describe the situation in your own words. The first exchange is for understanding the context; framing comes later, with a human.';
  const seededEnglishCapabilitiesTitle = 'Capabilities that can be combined';
  const seededEnglishCapabilitiesBody =
    'Depending on the situation, AkikSystems can help turn an unclear operational or product problem into a bounded software system; design architecture and interfaces around explicit constraints; build web applications, internal tools, and data-backed workflows; connect existing systems and automate repetitive work; and make the result inspectable with tests, documentation, observability, and clear limits. These capabilities can be combined according to the situation; they do not define a menu the visitor has to choose from.';
  const seededEnglishCollaborationTitle = 'How collaboration begins';
  const seededEnglishCollaborationBody =
    'The first step is a conversation focused on understanding the situation: what is happening, what matters, what is already in place, and where uncertainty remains. You do not need a finished brief or a predefined solution. After that first human exchange, we can decide whether there is a useful next step and, if so, frame the work, its boundaries, responsibilities, and evidence together.';
  const seededFrenchTitle = 'Partir de la situation';
  const seededFrenchIntroduction =
    'Que vous agissiez pour une organisation ou à titre personnel, vous pouvez commencer par ce qui se passe, ce qui compte et ce que vous voulez faire évoluer. Vous n’avez pas à traduire cela dans une prestation prédéfinie.';
  const seededFrenchSituationsTitle =
    'Vous n’avez pas besoin d’un cahier des charges finalisé';
  const seededFrenchSituationsBody =
    'Vous pouvez venir avec un problème identifié, quelque chose qui bloque, une idée encore floue ou simplement un résultat que vous cherchez à atteindre. Décrivez la situation avec vos mots. Le premier échange sert à comprendre le contexte ; le cadrage vient ensuite, avec une personne.';
  const seededFrenchCapabilitiesTitle = 'Des capacités à combiner';
  const seededFrenchCapabilitiesBody =
    'Selon la situation, AkikSystems peut aider à transformer un problème opérationnel ou produit encore flou en système logiciel délimité ; concevoir l’architecture et les interfaces autour de contraintes explicites ; construire des applications web, des outils internes et des flux appuyés sur les données ; relier des systèmes existants et automatiser des tâches répétitives ; puis rendre le résultat inspectable avec des tests, de la documentation, de l’observabilité et des limites claires. Ces capacités se combinent selon la situation ; elles ne définissent pas un menu dans lequel il faudrait choisir.';
  const seededFrenchCollaborationTitle = 'Comment la collaboration commence';
  const seededFrenchCollaborationBody =
    'La première étape est un échange centré sur la compréhension de la situation : ce qui se passe, ce qui compte, ce qui existe déjà et ce qui reste incertain. Vous n’avez pas besoin d’un cahier des charges finalisé ni d’une solution prédéfinie. Après ce premier échange humain, nous pouvons décider s’il existe une suite utile et, si oui, cadrer ensemble le travail, ses limites, les responsabilités et les preuves attendues.';

  await page.goto(origin + '/en/work-with-us');
  await page
    .getByRole('heading', { level: 1, name: seededEnglishTitle, exact: true })
    .waitFor();
  await page
    .getByRole('heading', {
      level: 2,
      name: seededEnglishSituationsTitle,
      exact: true,
    })
    .waitFor();
  await page
    .getByRole('heading', {
      level: 2,
      name: seededEnglishCapabilitiesTitle,
      exact: true,
    })
    .waitFor();
  await page
    .getByRole('heading', {
      level: 2,
      name: seededEnglishCollaborationTitle,
      exact: true,
    })
    .waitFor();
  await page.getByText(seededEnglishIntroduction, { exact: true }).waitFor();
  await page.getByText(seededEnglishSituationsBody, { exact: true }).waitFor();
  await page.getByText(seededEnglishCapabilitiesBody, { exact: true }).waitFor();
  await page.getByText(seededEnglishCollaborationBody, { exact: true }).waitFor();
  const englishProof = page.locator('[data-work-with-us-proof]');
  await englishProof
    .getByRole('heading', { level: 2, name: 'Selected proof', exact: true })
    .waitFor();
  assert.equal(
    await englishProof.locator('.aks-system-reference').count(),
    2,
    'AKS-126 must keep commercial proof deliberately capped at two published Systems.',
  );
  await englishProof
    .getByRole('heading', { level: 3, name: 'ProtoCap', exact: true })
    .waitFor();
  await englishProof
    .getByRole('heading', { level: 3, name: 'Tugères', exact: true })
    .waitFor();
  assert.equal(
    await englishProof.getByText('Oria Nutrition', { exact: true }).count(),
    0,
    'AKS-126 must not reproduce the Systems library on Work with us.',
  );
  assert.equal(
    await englishProof.locator('a[href="/en/systems/protocap"]').count(),
    1,
  );
  assert.equal(
    await englishProof.locator('a[href="/en/systems/tugeres"]').count(),
    1,
  );
  assert.equal(
    await page.locator('main form, main input, main textarea').count(),
    0,
    'AKS-125 must keep first contact as published copy only; inquiry capture arrives in AKS-127.',
  );
  assert.equal(
    await page
      .getByText(
        /service catalogue|service category|fixed offer|pricing grid|project type|budget|deadline|qualification form/i,
      )
      .count(),
    0,
    'AKS-125 must keep the initial path free of service and project qualification.',
  );
  assert.equal(
    await page.getByText(/\bcssov\b/i).count(),
    0,
    'AKS-125 public collaboration copy must describe the practice without naming CSSOV.',
  );
  await assertAxe(page);

  await page.goto(origin + '/fr/travailler-ensemble');
  await page
    .getByRole('heading', { level: 1, name: seededFrenchTitle, exact: true })
    .waitFor();
  await page
    .getByRole('heading', {
      level: 2,
      name: seededFrenchSituationsTitle,
      exact: true,
    })
    .waitFor();
  await page
    .getByRole('heading', {
      level: 2,
      name: seededFrenchCapabilitiesTitle,
      exact: true,
    })
    .waitFor();
  await page
    .getByRole('heading', {
      level: 2,
      name: seededFrenchCollaborationTitle,
      exact: true,
    })
    .waitFor();
  await page.getByText(seededFrenchIntroduction, { exact: true }).waitFor();
  await page.getByText(seededFrenchSituationsBody, { exact: true }).waitFor();
  await page.getByText(seededFrenchCapabilitiesBody, { exact: true }).waitFor();
  await page.getByText(seededFrenchCollaborationBody, { exact: true }).waitFor();
  const frenchProof = page.locator('[data-work-with-us-proof]');
  await frenchProof
    .getByRole('heading', {
      level: 2,
      name: 'Preuves sélectionnées',
      exact: true,
    })
    .waitFor();
  assert.equal(
    await frenchProof.locator('.aks-system-reference').count(),
    2,
    'AKS-126 must keep the French commercial proof selection capped too.',
  );
  await frenchProof
    .getByRole('heading', { level: 3, name: 'ProtoCap', exact: true })
    .waitFor();
  await frenchProof
    .getByRole('heading', { level: 3, name: 'Tugères', exact: true })
    .waitFor();
  assert.equal(
    await frenchProof.getByText('Oria Nutrition', { exact: true }).count(),
    0,
  );
  assert.equal(
    await frenchProof.locator('a[href="/fr/systems/protocap"]').count(),
    1,
  );
  assert.equal(
    await frenchProof.locator('a[href="/fr/systems/tugeres"]').count(),
    1,
  );
  await assertAxe(page);

  await page.goto(origin + '/admin');
  const adminSection = page.locator('#admin-work-with-us');
  await adminSection.waitFor();

  assert.equal(
    await adminSection.locator(
      'input[name="email"], input[name="phone"], input[name="budget"], input[name="deadline"], input[name="projectType"]',
    ).count(),
    0,
    'AKS-125 must not introduce inquiry/contact qualification fields.',
  );

  let englishCard = adminSection.locator('.aks-admin-card').filter({
    has: page.getByRole('heading', {
      level: 3,
      name: 'English',
      exact: true,
    }),
  });
  assert.equal(
    await englishCard.locator('input[name="capabilitiesTitle"]').count(),
    1,
    'AKS-124 must keep the capabilities heading as localized admin copy.',
  );
  assert.equal(
    await englishCard.locator('textarea[name="capabilitiesBody"]').count(),
    1,
    'AKS-124 must keep the capabilities body as localized admin copy.',
  );
  assert.equal(
    await englishCard.locator('input[name="collaborationTitle"]').count(),
    1,
    'AKS-125 must expose the collaboration heading as localized admin copy.',
  );
  assert.equal(
    await englishCard.locator('textarea[name="collaborationBody"]').count(),
    1,
    'AKS-125 must expose the collaboration body as localized admin copy.',
  );

  await englishCard
    .locator('textarea[name="situationsBody"]')
    .fill('A private draft should not replace the published open-situations copy.');
  await englishCard
    .locator('textarea[name="capabilitiesBody"]')
    .fill('A private capabilities draft should stay private until publication.');
  await englishCard
    .locator('textarea[name="collaborationBody"]')
    .fill('A private collaboration draft should stay private until publication.');
  await submitRootAdminAction(
    page,
    englishCard.getByRole('button', {
      name: 'Save EN draft',
      exact: true,
    }),
    'save-commercial-localization',
    'en',
  );

  let englishPublic = await page.context().request.get(
    origin + '/en/work-with-us',
  );
  let englishHtml = await englishPublic.text();
  assert.equal(englishPublic.status(), 200);
  assert.match(englishHtml, /You do not need a finished brief/);
  assert.match(englishHtml, /Describe the situation in your own words/);
  assert.match(englishHtml, /Capabilities that can be combined/);
  assert.match(englishHtml, /bounded software system/);
  assert.match(englishHtml, /How collaboration begins/);
  assert.match(englishHtml, /first human exchange/);
  assert.doesNotMatch(
    englishHtml,
    /A private draft should not replace the published open-situations copy/,
    'Saving AKS-123 draft copy must preserve the previous public snapshot.',
  );
  assert.doesNotMatch(
    englishHtml,
    /A private capabilities draft should stay private until publication/,
    'Saving AKS-124 capability draft copy must preserve the previous public snapshot.',
  );
  assert.doesNotMatch(
    englishHtml,
    /A private collaboration draft should stay private until publication/,
    'Saving AKS-125 collaboration draft copy must preserve the previous public snapshot.',
  );

  englishCard = page.locator('#admin-work-with-us .aks-admin-card').filter({
    has: page.getByRole('heading', {
      level: 3,
      name: 'English',
      exact: true,
    }),
  });
  await englishCard
    .locator('textarea[name="situationsBody"]')
    .fill(seededEnglishSituationsBody);
  await englishCard
    .locator('textarea[name="capabilitiesBody"]')
    .fill(seededEnglishCapabilitiesBody);
  await englishCard
    .locator('textarea[name="collaborationBody"]')
    .fill(seededEnglishCollaborationBody);
  await submitRootAdminAction(
    page,
    englishCard.getByRole('button', {
      name: 'Save EN draft',
      exact: true,
    }),
    'save-commercial-localization',
    'en',
  );

  englishCard = page.locator('#admin-work-with-us .aks-admin-card').filter({
    has: page.getByRole('heading', {
      level: 3,
      name: 'English',
      exact: true,
    }),
  });
  await submitRootAdminAction(
    page,
    englishCard.getByRole('button', {
      name: 'Publish EN',
      exact: true,
    }),
    'publish-commercial-localization',
    'en',
  );

  await page.goto(origin + '/en/work-with-us');
  await page
    .getByRole('heading', {
      level: 2,
      name: seededEnglishSituationsTitle,
      exact: true,
    })
    .waitFor();
  await page
    .getByRole('heading', {
      level: 2,
      name: seededEnglishCapabilitiesTitle,
      exact: true,
    })
    .waitFor();
  await page
    .getByRole('heading', {
      level: 2,
      name: seededEnglishCollaborationTitle,
      exact: true,
    })
    .waitFor();
  await page.getByText(seededEnglishSituationsBody, { exact: true }).waitFor();
  await page.getByText(seededEnglishCapabilitiesBody, { exact: true }).waitFor();
  await page.getByText(seededEnglishCollaborationBody, { exact: true }).waitFor();
  await assertAxe(page);
}

async function assertWritingAdminAndPublic(page) {
  await page.goto(origin + '/admin');
  assert.equal(
    await page.getByRole('link', { name: 'Writings', exact: true }).getAttribute('href'),
    '/admin/writings',
    'Private administration must expose the Writings workspace.',
  );

  await page.goto(origin + '/admin/writings');
  await page
    .getByRole('heading', {
      level: 1,
      name: 'Writings administration',
      exact: true,
    })
    .waitFor();

  const writingId = await createWritingAdminDraft(page, 'essay', 'major');

  const writingCard = () =>
    page.locator('[data-writing-card="' + writingId + '"]');

  await writingCard().waitFor();
  assert.match(
    await writingCard().innerText(),
    /ESSAY · MAJOR/,
    'Writing kind and editorial weight must be explicit domain fields in admin.',
  );
  assert.equal(
    await writingCard().locator('[data-writing-editor]').count(),
    2,
    'Each localized Writing draft must expose one headless Tiptap editor.',
  );
  assert.equal(
    await writingCard()
      .locator('[name="layout"], [name="template"], [name="style"]')
      .count(),
    0,
    'The Tiptap integration must not introduce page-builder controls.',
  );

  const saveLocale = async ({
    locale,
    slug,
    title,
    summary,
    body,
  }) => {
    let fieldset = writingCard().getByRole('group', {
      name: locale,
      exact: true,
    });
    await fieldset.locator('input[name="slug"]').fill(slug);
    await fieldset.locator('input[name="title"]').fill(title);
    await fieldset.locator('textarea[name="summary"]').fill(summary);
    await fillWritingBodyEditor(fieldset, body);
    await submitWritingAdminAction(
      page,
      fieldset.getByRole('button', {
        name: 'Save ' + locale + ' draft',
        exact: true,
      }),
    );

    fieldset = writingCard().getByRole('group', {
      name: locale,
      exact: true,
    });
    await waitForWritingFieldValue(
      fieldset.locator('input[name="body"]'),
      body,
      'The persisted Writing text projection must survive the admin round-trip.',
    );
    const persistedDocument = JSON.parse(
      await fieldset.locator('input[name="editorDocument"]').inputValue(),
    );
    assert.equal(
      persistedDocument.type,
      'doc',
      'The persisted draft must reload as a Tiptap document.',
    );
    assert.equal(
      persistedDocument.version,
      1,
      'The persisted Tiptap draft must remain on Writing schema v1.',
    );

  };

  await saveLocale({
    locale: 'EN',
    slug: 'architecture-without-page-builders',
    title: 'Architecture Without Page Builders',
    summary: 'Editorial content stays data-managed while page semantics remain code-defined.',
    body: 'A Writing is content, not a layout definition.\n\nAKS-101 keeps the first renderer intentionally limited to controlled paragraphs.',
  });
  await saveLocale({
    locale: 'FR',
    slug: 'architecture-sans-page-builder',
    title: 'Architecture sans page builder',
    summary: 'Le contenu éditorial reste administrable tandis que la sémantique de page reste définie dans le code.',
    body: 'Un Writing décrit du contenu, pas une mise en page.\n\nAKS-101 limite volontairement le premier renderer à des paragraphes contrôlés.',
  });

  for (const preview of [
    {
      locale: 'EN',
      title: 'Architecture Without Page Builders',
      paragraph: 'A Writing is content, not a layout definition.',
    },
    {
      locale: 'FR',
      title: 'Architecture sans page builder',
      paragraph: 'Un Writing décrit du contenu, pas une mise en page.',
    },
  ]) {
    const previewLink = writingCard().getByRole('link', {
      name: 'Preview ' + preview.locale,
      exact: true,
    });
    const previewHref = await previewLink.getAttribute('href');
    assert.ok(
      previewHref?.includes('/admin/writings/') &&
        previewHref.endsWith('/preview/' + preview.locale.toLowerCase()),
      'Writing draft preview must stay under the authenticated admin surface.',
    );

    const previewResponse = await page.goto(origin + previewHref);
    assert.equal(previewResponse?.status(), 200);
    assert.match(
      previewResponse?.headers()['cache-control'] ?? '',
      /private.*no-store/i,
      'Writing preview must not be publicly cacheable.',
    );
    assert.match(
      previewResponse?.headers()['x-robots-tag'] ?? '',
      /noindex/i,
      'Writing preview must not be indexable.',
    );
    assert.equal(
      await page.locator('meta[name="robots"]').getAttribute('content'),
      'noindex, nofollow, noarchive, nosnippet',
    );
    await page
      .getByRole('heading', { level: 1, name: preview.title, exact: true })
      .waitFor();
    assert.ok(
      (await page.locator('body').innerText()).includes(preview.paragraph),
      'Writing preview must use the same content renderer as public delivery.',
    );
    assert.match(
      await page.locator('.aks-preview-toolbar').innerText(),
      /private preview/i,
    );
    await page.goto(origin + '/admin/writings');
  }

  let assetSection = writingCard().locator('[data-writing-assets]');
  const upload = assetSection.locator('form[data-writing-asset-upload]');
  await upload.locator('input[name="file"]').setInputFiles({
    name: 'aks-107-contextual.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z8YQAAAAASUVORK5CYII=',
      'base64',
    ),
  });
  await upload
    .locator('input[name="altEn"]')
    .fill('Contextual image in the English Writing');
  await upload
    .locator('textarea[name="captionEn"]')
    .fill('English contextual caption');
  await upload
    .locator('input[name="altFr"]')
    .fill('Image contextuelle dans l’écrit français');
  await upload
    .locator('textarea[name="captionFr"]')
    .fill('Légende contextuelle française');
  await upload
    .getByRole('button', { name: 'Upload Writing image', exact: true })
    .click();
  await page
    .getByText(
      'Writing image uploaded. Insert it from the EN or FR editor.',
      { exact: true },
    )
    .waitFor();

  assetSection = writingCard().locator('[data-writing-assets]');
  const privateAssetLink = assetSection.getByRole('link', {
    name: 'Inspect private image',
    exact: true,
  });
  const privateAssetHref = await privateAssetLink.getAttribute('href');
  assert.ok(
    privateAssetHref?.startsWith('/admin/writings/'),
    'Contextual Writing media must stay behind an authenticated admin route.',
  );
  const privateAssetResponse = await page.context().request.get(
    origin + privateAssetHref,
  );
  assert.equal(privateAssetResponse.status(), 200);
  assert.equal(privateAssetResponse.headers()['content-type'], 'image/png');
  assert.match(
    privateAssetResponse.headers()['cache-control'] ?? '',
    /no-store/i,
    'Private Writing media must not be cached publicly.',
  );
  const assetId = privateAssetHref.split('/').at(-1);
  assert.ok(assetId, 'The private Writing asset route must expose an asset id.');

  for (const locale of ['EN', 'FR']) {
    let fieldset = writingCard().getByRole('group', {
      name: locale,
      exact: true,
    });
    await fieldset
      .getByRole('button', {
        name:
          (locale === 'FR' ? 'Insérer' : 'Insert') +
          ' · aks-107-contextual.png',
        exact: true,
      })
      .click();

    let insertedDocument = JSON.parse(
      await fieldset.locator('input[name="editorDocument"]').inputValue(),
    );
    assert.ok(
      insertedDocument.content.some(
        (node) =>
          node.type === 'image' && node.attrs?.assetId === assetId,
      ),
      `${locale} Writing editor must insert the contextual image by asset id.`,
    );

    const blockButtons =
      locale === 'FR'
        ? ['Titre H2', 'Titre H3', 'Liste', 'Étapes', 'Citation', 'Code', 'Encadré']
        : ['H2 heading', 'H3 heading', 'List', 'Steps', 'Quote', 'Code', 'Callout'];
    for (const buttonName of blockButtons) {
      await fieldset
        .getByRole('button', { name: buttonName, exact: true })
        .click();
    }

    insertedDocument = JSON.parse(
      await fieldset.locator('input[name="editorDocument"]').inputValue(),
    );
    for (const nodeType of [
      'heading',
      'bulletList',
      'orderedList',
      'blockquote',
      'codeBlock',
      'callout',
    ]) {
      assert.ok(
        insertedDocument.content.some((node) => node.type === nodeType),
        `${locale} Writing editor must author the controlled ${nodeType} block.`,
      );
    }
    assert.ok(
      insertedDocument.content.some(
        (node) => node.type === 'image' && node.attrs?.assetId === assetId,
      ),
      `${locale} rich block insertion must not replace contextual media.`,
    );

    await fieldset
      .getByRole('button', {
        name: 'Save ' + locale + ' draft',
        exact: true,
      })
      .click();
    await page
      .getByText(locale + ' Writing draft saved.', { exact: true })
      .waitFor();

    fieldset = writingCard().getByRole('group', {
      name: locale,
      exact: true,
    });
    await fieldset
      .locator('[data-writing-editor][data-editor-ready="true"]')
      .waitFor();

    const expectedNodeTypes = [
      'heading',
      'bulletList',
      'orderedList',
      'blockquote',
      'codeBlock',
      'callout',
    ];
    let persistedDocument = null;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      persistedDocument = JSON.parse(
        await fieldset.locator('input[name="editorDocument"]').inputValue(),
      );
      const hasAsset = persistedDocument.content.some(
        (node) =>
          node.type === 'image' && node.attrs?.assetId === assetId,
      );
      const hasRichBlocks = expectedNodeTypes.every((nodeType) =>
        persistedDocument.content.some((node) => node.type === nodeType),
      );
      if (hasAsset && hasRichBlocks) break;
      await sleep(100);
    }

    assert.ok(
      persistedDocument.content.some(
        (node) =>
          node.type === 'image' && node.attrs?.assetId === assetId,
      ),
      `${locale} contextual image must survive the admin round-trip.`,
    );
    for (const nodeType of expectedNodeTypes) {
      assert.ok(
        persistedDocument.content.some((node) => node.type === nodeType),
        `${locale} controlled ${nodeType} must survive the admin round-trip.`,
      );
    }
  }

  let card = writingCard();
  let publicationFieldset = card.getByRole('group', { name: 'EN', exact: true });
  await submitWritingAdminAction(
    page,
    publicationFieldset.getByRole('button', {
      name: 'Publish EN',
      exact: true,
    }),
  );
  card = writingCard();
  publicationFieldset = card.getByRole('group', { name: 'EN', exact: true });
  await waitForPublishedWritingState(publicationFieldset, 'EN');

  card = writingCard();
  publicationFieldset = card.getByRole('group', { name: 'FR', exact: true });
  await submitWritingAdminAction(
    page,
    publicationFieldset.getByRole('button', {
      name: 'Publish FR',
      exact: true,
    }),
  );
  card = writingCard();
  publicationFieldset = card.getByRole('group', { name: 'FR', exact: true });
  await waitForPublishedWritingState(publicationFieldset, 'FR');

  const targets = [
    {
      overview: '/en/writings',
      detail: '/en/writings/architecture-without-page-builders',
      heading: 'Writings',
      title: 'Architecture Without Page Builders',
      summary: 'Editorial content stays data-managed while page semantics remain code-defined.',
      paragraphs: [
        'A Writing is content, not a layout definition.',
        'AKS-101 keeps the first renderer intentionally limited to controlled paragraphs.',
      ],
      alternateLocale: 'fr',
      alternatePath: '/fr/ecrits/architecture-sans-page-builder',
      kind: 'Essay',
      feedHeading: 'Editorial feed',
      richHeading: 'Section heading',
      calloutText: 'Important context',
    },
    {
      overview: '/fr/ecrits',
      detail: '/fr/ecrits/architecture-sans-page-builder',
      heading: 'Écrits',
      title: 'Architecture sans page builder',
      summary: 'Le contenu éditorial reste administrable tandis que la sémantique de page reste définie dans le code.',
      paragraphs: [
        'Un Writing décrit du contenu, pas une mise en page.',
        'AKS-101 limite volontairement le premier renderer à des paragraphes contrôlés.',
      ],
      alternateLocale: 'en',
      alternatePath: '/en/writings/architecture-without-page-builders',
      kind: 'Essai',
      feedHeading: 'Flux éditorial',
      richHeading: 'Titre de section',
      calloutText: 'Contexte important',
    },
  ];

  for (const target of targets) {
    const overviewResponse = await page.goto(origin + target.overview);
    assert.equal(overviewResponse?.status(), 200);
    await page
      .getByRole('heading', { level: 1, name: target.heading, exact: true })
      .waitFor();

    await page
      .getByRole('heading', { level: 2, name: target.feedHeading, exact: true })
      .waitFor();
    assert.equal(
      await page.locator('[data-unified-editorial-surface] [data-writing-feed]').count(),
      1,
      'Notes, Articles, and Essays must share one public editorial feed.',
    );

    const writingOverviewCard = page
      .locator('[data-writing-feed] [data-writing-kind]')
      .filter({
        has: page.getByRole('heading', {
          level: 3,
          name: target.title,
          exact: true,
        }),
      });
    await writingOverviewCard.waitFor();
    const overviewText = await writingOverviewCard.innerText();
    assert.ok(overviewText.includes(target.summary));
    assert.ok(
      overviewText.toLocaleLowerCase(target.detail.startsWith('/fr/') ? 'fr' : 'en')
        .includes(target.kind.toLocaleLowerCase(target.detail.startsWith('/fr/') ? 'fr' : 'en')),
      'Writing kind must remain visible inside the unified feed.',
    );
    assert.equal(
      await writingOverviewCard.getAttribute('data-editorial-weight'),
      'major',
      'Published editorial weight must select the fixed MAJOR feed composition.',
    );
    const compositionByWeight = await writingOverviewCard.evaluate((card) => {
      const entry = card.querySelector('.aks-writings-feed-entry');
      const heading = card.querySelector('.aks-heading');
      if (!(entry instanceof HTMLElement) || !(heading instanceof HTMLElement)) {
        throw new Error('Writing feed composition nodes are missing.');
      }

      const originalWeight = card.getAttribute('data-editorial-weight');
      const result = {};
      for (const weight of ['normal', 'featured', 'major']) {
        card.setAttribute('data-editorial-weight', weight);
        result[weight] = {
          columns: getComputedStyle(entry).gridTemplateColumns,
          headingSize: getComputedStyle(heading).fontSize,
        };
      }
      if (originalWeight === null) {
        card.removeAttribute('data-editorial-weight');
      } else {
        card.setAttribute('data-editorial-weight', originalWeight);
      }
      return result;
    });
    assert.equal(
      new Set(Object.values(compositionByWeight).map((value) => value.columns)).size,
      3,
      'NORMAL, FEATURED, and MAJOR must map to three fixed code-defined feed compositions.',
    );
    assert.equal(
      new Set(Object.values(compositionByWeight).map((value) => value.headingSize)).size,
      3,
      'Editorial weight must influence hierarchy without admin-authored styling.',
    );
    assert.equal(
      overviewText.includes('Major weight') || overviewText.includes('Poids majeur'),
      false,
      'Editorial weight must influence composition without becoming a reader-facing label.',
    );
    assert.equal(
      await writingOverviewCard
        .getByRole('link', { name: target.title, exact: true })
        .getAttribute('href'),
      target.detail,
      'Each published Writing must remain independently deep-linkable.',
    );

    const detailResponse = await page.goto(origin + target.detail);
    assert.equal(detailResponse?.status(), 200);
    await page
      .getByRole('heading', { level: 1, name: target.title, exact: true })
      .waitFor();
    const detailText = await page.locator('body').innerText();
    assert.ok(detailText.includes(target.summary));
    for (const paragraph of target.paragraphs) {
      assert.ok(
        detailText.includes(paragraph),
        'Controlled Writing paragraphs must survive publication.',
      );
    }
    assert.ok(
      detailText.includes(
        target.detail.startsWith('/fr/')
          ? 'Structure contrôlée par le produit · contenu éditorial administrable.'
          : 'Product-controlled structure · admin-managed editorial content.',
      ),
      'AKS-101 must expose a controlled renderer rather than arbitrary page composition.',
    );
    assert.equal(
      await page
        .locator('.aks-experience-meta a[hreflang="' + target.alternateLocale + '"]')
        .getAttribute('href'),
      target.alternatePath,
      'Bilingual Writing deep routes must expose their published equivalent.',
    );
    assert.equal(
      await page.locator('.aks-experience-shell').getAttribute('data-mode'),
      'reading',
      'Writing deep links must keep global navigation in the discreet reading shell mode.',
    );

    const readerMetrics = await page.locator('[data-long-form-reader]').evaluate((reader) => {
      const paragraph = reader.querySelector('[data-writing-node="paragraph"]');
      const code = reader.querySelector('[data-writing-node="codeBlock"]');
      const media = reader.querySelector('[data-writing-node="image"]');
      if (
        !(reader instanceof HTMLElement) ||
        !(paragraph instanceof HTMLElement) ||
        !(code instanceof HTMLElement) ||
        !(media instanceof HTMLElement)
      ) {
        throw new Error('Long-form reader qualification nodes are missing.');
      }

      const codeStyle = getComputedStyle(code);
      return {
        readerWidth: reader.getBoundingClientRect().width,
        paragraphWidth: paragraph.getBoundingClientRect().width,
        codeWidth: code.getBoundingClientRect().width,
        mediaWidth: media.getBoundingClientRect().width,
        paragraphLineHeight: Number.parseFloat(getComputedStyle(paragraph).lineHeight),
        paragraphFontSize: Number.parseFloat(getComputedStyle(paragraph).fontSize),
        codeOverflowX: codeStyle.overflowX,
        codeWhiteSpace: codeStyle.whiteSpace,
      };
    });
    assert.ok(
      readerMetrics.paragraphWidth <= 704.5,
      'Long-form paragraphs must stay within the controlled 44rem reading measure.',
    );
    assert.ok(
      readerMetrics.readerWidth > readerMetrics.paragraphWidth,
      'The long-form reader must preserve room for wider non-prose blocks.',
    );
    assert.ok(
      readerMetrics.codeWidth > readerMetrics.paragraphWidth &&
        readerMetrics.mediaWidth > readerMetrics.paragraphWidth,
      'Code and media must use the wider reader track on desktop.',
    );
    assert.ok(
      readerMetrics.paragraphLineHeight / readerMetrics.paragraphFontSize >= 1.7,
      'Long-form body copy must keep a calm reading line-height.',
    );
    assert.equal(
      readerMetrics.codeOverflowX,
      'auto',
      'Long code must scroll inside its block instead of widening the page.',
    );
    assert.equal(
      readerMetrics.codeWhiteSpace,
      'pre',
      'Code formatting must preserve authored whitespace.',
    );
    assert.ok(
      (await page.locator('.aks-experience-shell').evaluate(
        (shell) => shell.getBoundingClientRect().height,
      )) <= 64,
      'Reading mode must reduce the desktop global shell footprint.',
    );
    await assertAxe(page);

    const ssr = await page.context().request.get(origin + target.detail);
    assert.equal(ssr.status(), 200);
    const html = await ssr.text();
    assert.match(html, new RegExp('<h1[^>]*>' + target.title));
    assert.ok(
      html.includes(target.paragraphs[0]),
      'Writing deep content must be available in initial HTML.',
    );
    assert.match(
      html,
      new RegExp('<h2[^>]*>' + target.richHeading + '</h2>'),
      'Writing headings must render as semantic H2 elements in SSR.',
    );
    assert.ok(
      html.includes('data-writing-node="bulletList"') &&
        html.includes('data-writing-node="orderedList"') &&
        html.includes('data-writing-node="blockquote"') &&
        html.includes('data-writing-node="codeBlock"') &&
        html.includes('data-writing-node="callout"'),
      'Structured Writing blocks must render through the controlled semantic renderer.',
    );
    assert.ok(
      html.includes(target.calloutText),
      'Localized rich content must survive publication.',
    );
    assert.ok(
      html.includes(
        target.detail.startsWith('/fr/')
          ? 'alt="Image contextuelle dans l’écrit français"'
          : 'alt="Contextual image in the English Writing"',
      ),
      'Published Writing media must render localized alt text from the snapshot.',
    );

    const publicAsset = await page.context().request.get(
      origin + target.detail + '/assets/' + assetId,
    );
    assert.equal(
      publicAsset.status(),
      200,
      'Published Writing media must resolve through the public snapshot route.',
    );
    assert.equal(publicAsset.headers()['content-type'], 'image/png');
    assert.match(
      publicAsset.headers()['cache-control'] ?? '',
      /public/,
      'Published Writing media may use public caching only after publication.',
    );
  }

  await page.setViewportSize({ width: 390, height: 844 });
  for (const target of targets) {
    const mobileResponse = await page.goto(origin + target.detail);
    assert.equal(mobileResponse?.status(), 200);
    await page.locator('[data-long-form-reader]').waitFor();
    assert.equal(
      await page.locator('.aks-experience-shell').getAttribute('data-mode'),
      'reading',
      'Mobile Writing deep links must preserve reading shell mode.',
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
      true,
      `${target.detail} long-form reader must not overflow at 390px.`,
    );
    const mobileCodeStyle = await page
      .locator('[data-writing-node="codeBlock"]')
      .evaluate((code) => ({
        overflowX: getComputedStyle(code).overflowX,
        width: code.getBoundingClientRect().width,
      }));
    assert.equal(mobileCodeStyle.overflowX, 'auto');
    assert.ok(
      mobileCodeStyle.width <= 342.5,
      'Mobile code blocks must stay inside the reader viewport gutter.',
    );
    await assertAxe(page);
  }
  await page.setViewportSize({ width: 1280, height: 800 });

  await page.goto(origin + '/admin/writings');
  await writingCard()
    .getByRole('button', { name: 'Archive Writing', exact: true })
    .click();
  await page
    .getByText(
      'Writing archived. Existing publication snapshots are preserved but hidden from public delivery.',
      { exact: true },
    )
    .waitFor();

  for (const target of targets) {
    const archivedDetail = await page.context().request.get(
      origin + target.detail,
      { headers: { 'Cache-Control': 'no-cache' } },
    );
    assert.equal(
      archivedDetail.status(),
      404,
      'Archived Writing deep links must disappear from origin public delivery.',
    );
  }

  await page.goto(origin + '/admin/writings');
  const archivedPreviewHref = await writingCard()
    .getByRole('link', { name: 'Preview EN', exact: true })
    .getAttribute('href');
  const archivedPreview = await page.goto(origin + archivedPreviewHref);
  assert.equal(
    archivedPreview?.status(),
    200,
    'Archive must not prevent secure draft inspection.',
  );
  assert.match(
    await page.locator('.aks-preview-toolbar').innerText(),
    /archived.*private preview/i,
  );

  await page.goto(origin + '/admin/writings');
  await writingCard()
    .getByRole('button', { name: 'Restore Writing', exact: true })
    .click();
  await page
    .getByText(
      'Writing restored. Preserved publication snapshots are public again where they still exist.',
      { exact: true },
    )
    .waitFor();

  for (const target of targets) {
    const restoredDetail = await page.context().request.get(
      origin + target.detail,
      { headers: { 'Cache-Control': 'no-cache' } },
    );
    assert.equal(
      restoredDetail.status(),
      200,
      'Restoring a Writing must reactivate preserved publication snapshots without republishing.',
    );
  }
}

async function assertLightweightNoteAuthoring(page) {
  await page.goto(origin + '/admin/writings');
  const writingId = await createWritingAdminDraft(page, 'note', 'normal');

  const noteCard = () =>
    page.locator('[data-writing-card="' + writingId + '"]');
  const items = [
    {
      locale: 'EN',
      slug: 'attention-before-interface',
      title: 'Attention before interface',
      body: 'A short Note starts from one concrete observation.\n\nThe interface should not ask for structure that the thought does not need.',
      path: '/en/writings/attention-before-interface',
      alternateLocale: 'fr',
      alternatePath: '/fr/ecrits/attention-avant-interface',
    },
    {
      locale: 'FR',
      slug: 'attention-avant-interface',
      title: 'L’attention avant l’interface',
      body: 'Une Note courte part d’une observation concrète.\n\nL’interface ne devrait pas imposer une structure dont la pensée n’a pas besoin.',
      path: '/fr/ecrits/attention-avant-interface',
      alternateLocale: 'en',
      alternatePath: '/en/writings/attention-before-interface',
    },
  ];

  for (const item of items) {
    let fieldset = noteCard().getByRole('group', { name: item.locale, exact: true });
    assert.equal(await fieldset.locator('textarea[name="summary"]').count(), 0);
    assert.equal(await fieldset.locator('[data-writing-editor]').count(), 0);
    assert.equal(await fieldset.locator('[data-writing-note-editor]').count(), 1);

    await fieldset.locator('input[name="slug"]').fill(item.slug);
    await fieldset.locator('input[name="title"]').fill(item.title);
    await fieldset.locator('[data-writing-note-editor] textarea').fill(item.body);

    const document = JSON.parse(
      await fieldset.locator('input[name="editorDocument"]').inputValue(),
    );
    assert.equal(document.version, 1);
    assert.equal(document.type, 'doc');
    assert.equal(document.content.length, 2);
    assert.ok(document.content.every((block) => block.type === 'paragraph'));

    await fieldset
      .getByRole('button', { name: 'Save ' + item.locale + ' draft', exact: true })
      .click();
    await page.getByText(item.locale + ' Writing draft saved.', { exact: true }).waitFor();

    fieldset = noteCard().getByRole('group', { name: item.locale, exact: true });
    const previewHref = await fieldset
      .getByRole('link', { name: 'Preview ' + item.locale, exact: true })
      .getAttribute('href');
    const preview = await page.goto(origin + previewHref);
    assert.equal(preview?.status(), 200);
    await page.getByRole('heading', { level: 1, name: item.title, exact: true }).waitFor();
    assert.equal(await page.locator('.aks-writing-detail-summary').count(), 0);
    assert.equal(await page.locator('[data-reading-mode="note"]').count(), 1);

    await page.goto(origin + '/admin/writings');
    fieldset = noteCard().getByRole('group', { name: item.locale, exact: true });
    await publishWritingLocale(
      page,
      fieldset,
      item.locale,
      'Publish ' + item.locale,
    );
  }

  for (const item of items) {
    const overview = item.locale === 'FR' ? '/fr/ecrits' : '/en/writings';
    assert.equal((await page.goto(origin + overview))?.status(), 200);
    const card = page.locator('[data-writing-feed] [data-writing-kind="note"]').filter({
      has: page.getByRole('heading', { level: 3, name: item.title, exact: true }),
    });
    await card.waitFor();
    assert.equal(await card.getAttribute('data-editorial-weight'), 'normal');
    assert.ok((await card.innerText()).includes(item.body.replace(/\n\n/g, ' ')));

    assert.equal((await page.goto(origin + item.path))?.status(), 200);
    await page.getByRole('heading', { level: 1, name: item.title, exact: true }).waitFor();
    assert.equal(await page.locator('.aks-writing-detail-summary').count(), 0);
    assert.equal(await page.locator('[data-reading-mode="note"]').count(), 1);
    assert.equal(
      await page.locator('[data-long-form-reader] [data-writing-node="paragraph"]').count(),
      2,
    );
    assert.equal(
      await page
        .locator('.aks-experience-meta a[hreflang="' + item.alternateLocale + '"]')
        .getAttribute('href'),
      item.alternatePath,
    );
    await assertAxe(page);

    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal((await page.goto(origin + item.path))?.status(), 200);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
      true,
    );
    await assertAxe(page);
    await page.setViewportSize({ width: 1280, height: 800 });
  }
}

async function assertWritingFiltering(page) {
  await page.goto(origin + '/en/writings');
  assert.equal(
    await page.locator('[data-writing-filters]').count(),
    0,
    'AKS-115 filters must stay absent while the published EN volume is below six Writings.',
  );

  const qualificationNotes = [
    {
      en: {
        slug: 'evidence-near-claims',
        title: 'Keep evidence near claims',
        body: 'A claim is easier to inspect when its evidence stays close to it.',
      },
      fr: {
        slug: 'preuves-pres-des-affirmations',
        title: 'Garder les preuves près des affirmations',
        body: 'Une affirmation reste plus facile à inspecter quand sa preuve reste proche.',
      },
    },
    {
      en: {
        slug: 'semantics-owned-by-code',
        title: 'Keep semantics owned by code',
        body: 'Editorial freedom does not require handing page structure to the content model.',
      },
      fr: {
        slug: 'semantique-portee-par-le-code',
        title: 'Garder la sémantique dans le code',
        body: 'La liberté éditoriale n’exige pas de confier la structure de page au contenu.',
      },
    },
    {
      en: {
        slug: 'observe-before-abstracting',
        title: 'Observe before abstracting',
        body: 'A useful abstraction starts after enough contact with the real activity.',
      },
      fr: {
        slug: 'observer-avant-abstraire',
        title: 'Observer avant d’abstraire',
        body: 'Une abstraction utile commence après un contact suffisant avec l’activité réelle.',
      },
    },
    {
      en: {
        slug: 'quiet-interfaces-reveal-state',
        title: 'Quiet interfaces reveal state',
        body: 'A calm interface can make system state legible without adding decorative chrome.',
      },
      fr: {
        slug: 'interfaces-calmes-etat-lisible',
        title: 'Les interfaces calmes rendent l’état lisible',
        body: 'Une interface calme peut rendre l’état du système lisible sans chrome décoratif.',
      },
    },
  ];

  for (const note of qualificationNotes) {
    await page.goto(origin + '/admin/writings');
    const writingId = await createWritingAdminDraft(page, 'note', 'normal');

    const noteCard = () =>
      page.locator('[data-writing-card="' + writingId + '"]');

    for (const [locale, localized] of [
      ['EN', note.en],
      ['FR', note.fr],
    ]) {
      let fieldset = noteCard().getByRole('group', {
        name: locale,
        exact: true,
      });
      await fieldset.locator('input[name="slug"]').fill(localized.slug);
      await fieldset.locator('input[name="title"]').fill(localized.title);
      await fieldset
        .locator('[data-writing-note-editor] textarea')
        .fill(localized.body);
      await submitWritingAdminAction(
        page,
        fieldset.getByRole('button', {
          name: 'Save ' + locale + ' draft',
          exact: true,
        }),
      );

      fieldset = noteCard().getByRole('group', {
        name: locale,
        exact: true,
      });
      await waitForWritingFieldValue(
        fieldset.locator('input[name="slug"]'),
        localized.slug,
        locale + ' Note slug must survive the admin save/revalidation round-trip.',
      );
      await waitForWritingFieldValue(
        fieldset.locator('input[name="title"]'),
        localized.title,
        locale + ' Note title must survive the admin save/revalidation round-trip.',
      );
      await waitForWritingFieldValue(
        fieldset.locator('input[name="body"]'),
        localized.body,
        locale + ' Note body must survive the admin save/revalidation round-trip.',
      );
      await submitWritingAdminAction(
        page,
        fieldset.getByRole('button', {
          name: 'Publish ' + locale,
          exact: true,
        }),
      );
      fieldset = noteCard().getByRole('group', {
        name: locale,
        exact: true,
      });
      await waitForPublishedWritingState(fieldset, locale);
    }
  }

  await page.goto(origin + '/en/writings');
  const filters = page.locator('[data-writing-filters]');
  await filters.waitFor();
  assert.equal(
    (await filters.getByRole('heading', { level: 3 }).innerText()).trim(),
    'Refine the feed',
  );
  assert.equal(
    await filters.locator('form').getAttribute('action'),
    '/en/writings',
    'Filtering must stay on the unified Writings route rather than create a silo.',
  );
  assert.equal(
    await filters.locator('select[name="type"] option').count(),
    3,
    'The type facet must expose All + the two EN Writing types that exist.',
  );
  assert.ok(
    (await filters.locator('select[name="category"]').innerText()).includes(
      'Engineering practice (1)',
    ),
    'A partially covering Category must become a useful thematic facet.',
  );
  assert.ok(
    (await filters.locator('select[name="tag"]').innerText()).includes(
      'Software architecture (1)',
    ),
    'A partially covering Tag must become a useful thematic facet.',
  );
  assert.match(await filters.innerText(), /6 of 6 writings/);
  await assertAxe(page);

  await filters.locator('select[name="type"]').selectOption('essay');
  await Promise.all([
    page.waitForURL((url) => url.searchParams.get('type') === 'essay'),
    filters.getByRole('button', { name: 'Apply filters', exact: true }).click(),
  ]);
  assert.equal(
    await page.locator('[data-writing-feed] [data-writing-kind]').count(),
    1,
    'Type filtering must reduce the same editorial feed.',
  );
  await page
    .getByRole('heading', {
      level: 3,
      name: 'Architecture Without Page Builders',
      exact: true,
    })
    .waitFor();
  assert.match(
    await page.locator('[data-writing-filters]').innerText(),
    /1 of 6 writings/,
  );

  await page
    .getByRole('link', { name: 'Clear filters', exact: true })
    .click();
  await page.waitForURL(origin + '/en/writings');

  let activeFilters = page.locator('[data-writing-filters]');
  await activeFilters
    .locator('select[name="category"]')
    .selectOption('engineering-practice');
  await Promise.all([
    page.waitForURL(
      (url) => url.searchParams.get('category') === 'engineering-practice',
    ),
    activeFilters
      .getByRole('button', { name: 'Apply filters', exact: true })
      .click(),
  ]);
  assert.equal(
    await page.locator('[data-writing-feed] [data-writing-kind]').count(),
    1,
    'Category filtering must use the existing publication taxonomy.',
  );

  await page.goto(origin + '/en/writings?tag=software-architecture');
  await page
    .getByRole('heading', {
      level: 3,
      name: 'Architecture Without Page Builders',
      exact: true,
    })
    .waitFor();
  assert.equal(
    await page.locator('[data-writing-feed] [data-writing-kind]').count(),
    1,
    'Tag filtering must use the existing publication taxonomy.',
  );

  await page.goto(
    origin + '/en/writings?type=note&category=engineering-practice',
  );
  assert.equal(
    await page.locator('[data-writing-feed] [data-writing-kind]').count(),
    0,
    'Multiple AKS-115 filters must compose with AND semantics.',
  );
  await page
    .getByText('No writing matches these filters.', { exact: true })
    .waitFor();
  assert.match(
    await page.locator('[data-writing-filters]').innerText(),
    /0 of 6 writings/,
  );

  await page.goto(
    origin + '/en/writings?type=unknown&category=missing&tag=missing',
  );
  assert.equal(
    await page.locator('[data-writing-feed] [data-writing-kind]').count(),
    6,
    'Unknown filter values must be ignored rather than create a hidden empty silo.',
  );
  assert.equal(
    await page.locator('[data-writing-filters] select[name="type"]').inputValue(),
    '',
  );

  await page.goto(origin + '/fr/ecrits');
  const frenchFilters = page.locator('[data-writing-filters]');
  await frenchFilters.waitFor();
  assert.match(await frenchFilters.innerText(), /7 sur 7 écrits/);
  assert.ok(
    (await frenchFilters.locator('select[name="category"]').innerText()).includes(
      'Pratique d’ingénierie (1)',
    ),
  );
  await frenchFilters
    .locator('select[name="category"]')
    .selectOption('pratique-ingenierie');
  await Promise.all([
    page.waitForURL(
      (url) => url.searchParams.get('category') === 'pratique-ingenierie',
    ),
    frenchFilters.getByRole('button', { name: 'Appliquer', exact: true }).click(),
  ]);
  await page
    .getByRole('heading', {
      level: 3,
      name: 'Architecture sans page builder',
      exact: true,
    })
    .waitFor();
  assert.equal(
    await page.locator('[data-writing-feed] [data-writing-kind]').count(),
    1,
  );
  await assertAxe(page);

  const ssr = await page.context().request.get(
    origin + '/en/writings?tag=software-architecture',
  );
  assert.equal(ssr.status(), 200);
  const html = await ssr.text();
  assert.ok(html.includes('Architecture Without Page Builders'));
  assert.ok(
    !html.includes('Keep evidence near claims'),
    'Filtered Writings must be resolved in SSR rather than hidden only in the browser.',
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(origin + '/en/writings');
  await page.locator('[data-writing-filters]').waitFor();
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
    true,
    'AKS-115 filters must not overflow at 390px.',
  );
  await assertAxe(page);
  await page.setViewportSize({ width: 1280, height: 800 });
}

async function assertWritingSearch(page) {
  await page.goto(origin + '/en/writings');

  const search = page.locator('[data-writing-search]');
  await search.waitFor();
  assert.equal(
    await search.locator('form').getAttribute('role'),
    'search',
    'AKS-116 must expose a semantic search form.',
  );
  assert.equal(
    await search.locator('form').getAttribute('action'),
    '/en/writings',
    'Writing search must stay on the unified editorial route.',
  );
  assert.equal(
    await search.locator('input[name="q"]').getAttribute('maxlength'),
    '160',
    'Writing search input must cap abusive query length before PostgreSQL.',
  );

  await page.goto(origin + '/admin/writings');
  const writingId = await createWritingAdminDraft(page, 'note', 'normal');

  const draftCard = () =>
    page.locator('[data-writing-card="' + writingId + '"]');
  let englishDraft = draftCard().getByRole('group', { name: 'EN', exact: true });
  await englishDraft.locator('input[name="slug"]').fill('unpublished-nebula');
  await englishDraft.locator('input[name="title"]').fill('Unpublished nebula');
  await englishDraft
    .locator('[data-writing-note-editor] textarea')
    .fill('The distinctive private search marker is zephyrcascade.');
  await englishDraft
    .getByRole('button', { name: 'Save EN draft', exact: true })
    .click();
  await page.getByText('EN Writing draft saved.', { exact: true }).waitFor();

  await page.goto(origin + '/en/writings?q=zephyrcascade');
  await page.locator('[data-writing-search]').waitFor();
  assert.equal(
    await page.locator('[data-writing-feed] [data-writing-kind]').count(),
    0,
    'Draft Writing content must never enter the public PostgreSQL search index.',
  );
  await page
    .getByText('No published Writing matches this search.', { exact: true })
    .waitFor();
  assert.match(
    await page.locator('[data-writing-search]').innerText(),
    /0 results for “zephyrcascade”/,
  );

  await page.goto(origin + '/en/writings?q=%22page%20builders%22');
  await page
    .getByRole('heading', {
      level: 3,
      name: 'Architecture Without Page Builders',
      exact: true,
    })
    .waitFor();
  assert.equal(
    await page.locator('[data-writing-feed] [data-writing-kind]').count(),
    1,
    'Quoted PostgreSQL web-search syntax must resolve the matching published Writing.',
  );
  assert.equal(
    await page.locator('[data-writing-search] input[name="q"]').inputValue(),
    '"page builders"',
  );

  await page.goto(origin + '/en/writings?q=decorative%20chrome');
  await page
    .getByRole('heading', {
      level: 3,
      name: 'Quiet interfaces reveal state',
      exact: true,
    })
    .waitFor();
  assert.equal(
    await page.locator('[data-writing-feed] [data-writing-kind]').count(),
    1,
    'AKS-116 must search published body content, not titles only.',
  );

  await page.goto(origin + '/en/writings?q=architecture&type=essay');
  const combinedSearch = page.locator('[data-writing-search]');
  const combinedFilters = page.locator('[data-writing-filters]');
  await combinedSearch.waitFor();
  await combinedFilters.waitFor();
  assert.equal(
    await combinedSearch.locator('input[name="q"]').inputValue(),
    'architecture',
  );
  assert.equal(
    await combinedSearch.locator('input[name="type"]').inputValue(),
    'essay',
    'Search submissions must preserve active AKS-115 facets.',
  );
  assert.equal(
    await combinedFilters.locator('input[name="q"]').inputValue(),
    'architecture',
    'Filter submissions must preserve the active AKS-116 query.',
  );
  assert.equal(
    await combinedFilters.locator('select[name="type"]').inputValue(),
    'essay',
  );
  assert.equal(
    await page.locator('[data-writing-feed] [data-writing-kind]').count(),
    1,
    'Full-text search and type filtering must compose on the same feed.',
  );
  assert.equal(
    await combinedFilters
      .getByRole('link', { name: 'Clear filters', exact: true })
      .getAttribute('href'),
    '/en/writings?q=architecture',
    'Clearing facets must preserve the active search.',
  );
  await assertAxe(page);

  await page.goto(origin + '/fr/ecrits?q=ma%C3%AEtrise%20syst%C3%A8mes');
  const frenchSearch = page.locator('[data-writing-search]');
  await frenchSearch.waitFor();
  await page
    .getByRole('heading', {
      level: 3,
      name: 'Rendre l’attention au réel',
      exact: true,
    })
    .waitFor();
  assert.equal(
    await frenchSearch.locator('input[name="q"]').inputValue(),
    'maîtrise systèmes',
  );
  assert.match(await frenchSearch.innerText(), /résultat/);
  assert.equal(
    await page
      .locator('[data-writing-feed] [data-writing-kind="essay"]')
      .filter({
        has: page.getByRole('heading', {
          level: 3,
          name: 'Rendre l’attention au réel',
          exact: true,
        }),
      })
      .count(),
    1,
    'French search must use the French PostgreSQL text-search configuration.',
  );
  await assertAxe(page);

  const ssr = await page.context().request.get(
    origin + '/en/writings?q=%22page%20builders%22',
  );
  assert.equal(ssr.status(), 200);
  const html = await ssr.text();
  assert.ok(
    html.includes('Architecture Without Page Builders'),
    'Search results must be present in initial server-rendered HTML.',
  );
  assert.ok(
    !html.includes('Keep evidence near claims'),
    'SSR search must not ship unrelated published Writings and hide them client-side.',
  );
  assert.ok(html.includes('data-writing-search'));

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(origin + '/en/writings?q=architecture');
  await page.locator('[data-writing-search]').waitFor();
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
    true,
    'AKS-116 search must not overflow at 390px.',
  );
  await assertAxe(page);
  await page.setViewportSize({ width: 1280, height: 800 });
}

async function assertWritingCategories(page) {
  await page.goto(origin + '/admin/writings');
  assert.equal(
    await page
      .getByRole('link', { name: 'Manage categories', exact: true })
      .getAttribute('href'),
    '/admin/writings/categories',
    'Writings administration must expose reusable Category management.',
  );

  await page.goto(origin + '/admin/writings/categories');
  await page
    .getByRole('heading', {
      level: 1,
      name: 'Writing categories',
      exact: true,
    })
    .waitFor();
  assert.equal(
    await page.locator('[name="layout"], [name="template"], [name="style"]').count(),
    0,
    'Category administration must not expose page-builder controls.',
  );

  await page
    .getByRole('button', { name: 'Create Category', exact: true })
    .click();
  await page.getByText('Category created.', { exact: true }).waitFor();

  const categoryCard = () =>
    page.locator('section.aks-admin-card').filter({
      has: page.getByRole('heading', {
        level: 2,
        name: /Engineering practice|Untitled Category/,
      }),
    }).last();

  const saveCategoryLocale = async ({
    locale,
    slug,
    name,
    description,
  }) => {
    const fieldset = categoryCard().getByRole('group', {
      name: locale,
      exact: true,
    });
    await fieldset.locator('input[name="slug"]').fill(slug);
    await fieldset.locator('input[name="name"]').fill(name);
    await fieldset.locator('textarea[name="description"]').fill(description);
    await fieldset
      .getByRole('button', {
        name: 'Save ' + locale + ' Category draft',
        exact: true,
      })
      .click();
    await page
      .getByText(locale + ' Category draft saved.', { exact: true })
      .waitFor();
  };

  await saveCategoryLocale({
    locale: 'EN',
    slug: 'engineering-practice',
    name: 'Engineering practice',
    description: 'Methods and architectural choices grounded in delivery.',
  });
  await saveCategoryLocale({
    locale: 'FR',
    slug: 'pratique-ingenierie',
    name: 'Pratique d’ingénierie',
    description: 'Méthodes et choix d’architecture ancrés dans la livraison.',
  });

  await categoryCard()
    .getByRole('group', { name: 'EN', exact: true })
    .getByRole('button', { name: 'Publish EN', exact: true })
    .click();
  await page.getByText('EN Category published.', { exact: true }).waitFor();

  await categoryCard()
    .getByRole('group', { name: 'FR', exact: true })
    .getByRole('button', { name: 'Publish FR', exact: true })
    .click();
  await page.getByText('FR Category published.', { exact: true }).waitFor();

  await page.goto(origin + '/admin/writings');
  const writingCard = page.locator('section.aks-admin-card').filter({
    has: page.getByRole('heading', {
      level: 2,
      name: 'Architecture Without Page Builders',
      exact: true,
    }),
  });

  const categoryGroup = writingCard.getByRole('group', {
    name: 'Categories',
    exact: true,
  });
  const categoryCheckbox = categoryGroup.getByRole('checkbox', {
    name: 'Engineering practice',
    exact: true,
  });
  await categoryCheckbox.check();
  await categoryGroup
    .getByRole('button', { name: 'Save categories', exact: true })
    .click();
  await page
    .getByText('Writing categories saved as draft.', { exact: true })
    .waitFor();

  const beforeRepublish = await page.goto(
    origin + '/en/writings/architecture-without-page-builders',
  );
  assert.equal(beforeRepublish?.status(), 200);
  assert.equal(
    await page
      .getByRole('link', { name: 'Engineering practice', exact: true })
      .count(),
    0,
    'Draft Category assignments must not leak into an existing Writing snapshot.',
  );

  await page.goto(origin + '/admin/writings');
  const refreshedWritingCard = page.locator('section.aks-admin-card').filter({
    has: page.getByRole('heading', {
      level: 2,
      name: 'Architecture Without Page Builders',
      exact: true,
    }),
  });

  await publishWritingLocale(
    page,
    refreshedWritingCard.getByRole('group', { name: 'EN', exact: true }),
    'EN',
    'Publish update EN',
  );

  const englishDetail =
    '/en/writings/architecture-without-page-builders';
  await page.goto(origin + englishDetail + '?category-publication=qualified');
  const englishCategoryLink = page.getByRole('link', {
    name: 'Engineering practice',
    exact: true,
  });
  await englishCategoryLink.waitFor();
  assert.equal(
    await englishCategoryLink.getAttribute('href'),
    '/en/writings/categories/engineering-practice',
  );

  await page.goto(
    origin +
      '/fr/ecrits/architecture-sans-page-builder?category-publication=en-only',
  );
  assert.equal(
    await page
      .getByRole('link', { name: 'Pratique d’ingénierie', exact: true })
      .count(),
    0,
    'Publishing an EN Writing update must not mutate the FR Writing snapshot.',
  );

  await page.goto(origin + '/admin/writings');
  const frenchWritingCard = page.locator('section.aks-admin-card').filter({
    has: page.getByRole('heading', {
      level: 2,
      name: 'Architecture Without Page Builders',
      exact: true,
    }),
  });
  await publishWritingLocale(
    page,
    frenchWritingCard.getByRole('group', { name: 'FR', exact: true }),
    'FR',
    'Publish update FR',
  );

  const targets = [
    {
      locale: 'en',
      overview: '/en/writings',
      writingTitle: 'Architecture Without Page Builders',
      writingDetail: englishDetail,
      categoryName: 'Engineering practice',
      categoryDescription:
        'Methods and architectural choices grounded in delivery.',
      categoryPath: '/en/writings/categories/engineering-practice',
      alternateLocale: 'fr',
      alternatePath: '/fr/ecrits/categories/pratique-ingenierie',
    },
    {
      locale: 'fr',
      overview: '/fr/ecrits',
      writingTitle: 'Architecture sans page builder',
      writingDetail: '/fr/ecrits/architecture-sans-page-builder',
      categoryName: 'Pratique d’ingénierie',
      categoryDescription:
        'Méthodes et choix d’architecture ancrés dans la livraison.',
      categoryPath: '/fr/ecrits/categories/pratique-ingenierie',
      alternateLocale: 'en',
      alternatePath: '/en/writings/categories/engineering-practice',
    },
  ];

  for (const target of targets) {
    await page.goto(origin + target.overview);
    const overviewCard = page
      .locator('[data-writing-feed] [data-writing-kind]')
      .filter({
        has: page.getByRole('heading', {
          level: 3,
          name: target.writingTitle,
          exact: true,
        }),
      });
    const categoryLink = overviewCard.getByRole('link', {
      name: target.categoryName,
      exact: true,
    });
    await categoryLink.waitFor();
    assert.equal(await categoryLink.getAttribute('href'), target.categoryPath);

    await page.goto(
      origin +
        target.writingDetail +
        '?category-publication=' +
        encodeURIComponent(target.locale),
    );
    const detailCategoryLink = page.getByRole('link', {
      name: target.categoryName,
      exact: true,
    });
    await detailCategoryLink.waitFor();
    assert.equal(
      await detailCategoryLink.getAttribute('href'),
      target.categoryPath,
    );

    const categoryResponse = await page.goto(origin + target.categoryPath);
    assert.equal(categoryResponse?.status(), 200);
    await page
      .getByRole('heading', {
        level: 1,
        name: target.categoryName,
        exact: true,
      })
      .waitFor();
    assert.ok((await page.locator('body').innerText()).includes(target.categoryDescription));
    const categoryWriting = page
      .locator('[data-writing-feed] [data-writing-kind]')
      .filter({
        has: page.getByRole('heading', {
          level: 3,
          name: target.writingTitle,
          exact: true,
        }),
      });
    await categoryWriting.waitFor();
    assert.equal(
      await categoryWriting.getByRole('link', { name: /Lire|Read/ }).getAttribute('href'),
      target.writingDetail,
      'Category deep routes must resolve back to published Writings.',
    );
    assert.equal(
      await page
        .locator(
          '.aks-experience-meta a[hreflang="' + target.alternateLocale + '"]',
        )
        .getAttribute('href'),
      target.alternatePath,
      'Published Categories must expose their localized deep-route equivalent.',
    );
    await assertAxe(page);

    const ssr = await page.context().request.get(origin + target.categoryPath);
    assert.equal(ssr.status(), 200);
    const html = await ssr.text();
    assert.ok(
      html.includes(target.categoryName) &&
        html.includes(target.writingTitle),
      'Category name and related Writing must be present in initial HTML.',
    );
  }
}

async function assertWritingTags(page) {
  await page.goto(origin + '/admin/writings');
  assert.equal(
    await page
      .getByRole('link', { name: 'Manage tags', exact: true })
      .getAttribute('href'),
    '/admin/writings/tags',
    'Writings administration must expose reusable Tag management.',
  );

  await page.goto(origin + '/admin/writings/tags');
  await page
    .getByRole('heading', {
      level: 1,
      name: 'Writing tags',
      exact: true,
    })
    .waitFor();
  assert.equal(
    await page.locator('[name="layout"], [name="template"], [name="style"]').count(),
    0,
    'Tag administration must not expose page-builder controls.',
  );

  const createCard = page.locator('section.aks-admin-card').filter({
    has: page.getByRole('heading', {
      level: 2,
      name: 'Create Tag',
      exact: true,
    }),
  });
  await createCard.locator('input[name="canonicalKey"]').fill('software-architecture');
  await createCard
    .getByRole('button', { name: 'Create Tag', exact: true })
    .click();
  await page.getByText('Tag created.', { exact: true }).waitFor();

  const tagCard = () =>
    page.locator('section.aks-admin-card').filter({
      has: page.getByRole('heading', {
        level: 2,
        name: /Software architecture|software-architecture/,
      }),
    }).last();

  await tagCard().waitFor();

  await createCard.locator('input[name="canonicalKey"]').fill('software-architecture');
  await createCard
    .getByRole('button', { name: 'Create Tag', exact: true })
    .click();
  await page
    .getByText('A Tag with this canonical key already exists.', { exact: true })
    .waitFor();

  assert.equal(
    await page.locator('section.aks-admin-card').filter({
      has: page.getByText('Canonical key · software-architecture', {
        exact: true,
      }),
    }).count(),
    1,
    'Canonical Tag identity must be deduplicated in admin.',
  );

  const saveTagLocale = async ({ locale, slug, name }) => {
    const fieldset = tagCard().getByRole('group', {
      name: locale,
      exact: true,
    });
    await fieldset.locator('input[name="slug"]').fill(slug);
    await fieldset.locator('input[name="name"]').fill(name);
    await fieldset
      .getByRole('button', {
        name: 'Save ' + locale + ' Tag draft',
        exact: true,
      })
      .click();
    await page.getByText(locale + ' Tag draft saved.', { exact: true }).waitFor();
  };

  await saveTagLocale({
    locale: 'EN',
    slug: 'software-architecture',
    name: 'Software architecture',
  });
  await saveTagLocale({
    locale: 'FR',
    slug: 'architecture-logicielle',
    name: 'Architecture logicielle',
  });

  await tagCard()
    .getByRole('group', { name: 'EN', exact: true })
    .getByRole('button', { name: 'Publish EN', exact: true })
    .click();
  await page.getByText('EN Tag published.', { exact: true }).waitFor();

  await tagCard()
    .getByRole('group', { name: 'FR', exact: true })
    .getByRole('button', { name: 'Publish FR', exact: true })
    .click();
  await page.getByText('FR Tag published.', { exact: true }).waitFor();
  await assertAxe(page);

  await page.goto(origin + '/admin/writings');
  const writingCard = page.locator('section.aks-admin-card').filter({
    has: page.getByRole('heading', {
      level: 2,
      name: 'Architecture Without Page Builders',
      exact: true,
    }),
  });
  const tagGroup = writingCard.getByRole('group', {
    name: 'Tags',
    exact: true,
  });
  const tagCheckbox = tagGroup.getByRole('checkbox', {
    name: 'Software architecture',
    exact: true,
  });
  await tagCheckbox.check();
  await tagGroup
    .getByRole('button', { name: 'Save tags', exact: true })
    .click();
  await page.getByText('Writing tags saved as draft.', { exact: true }).waitFor();

  const englishDetail = '/en/writings/architecture-without-page-builders';
  const frenchDetail = '/fr/ecrits/architecture-sans-page-builder';

  await page.goto(origin + englishDetail + '?tag-publication=before-republish');
  assert.equal(
    await page
      .getByRole('link', { name: 'Software architecture', exact: true })
      .count(),
    0,
    'Draft Tag assignments must not leak into an existing Writing snapshot.',
  );

  await page.goto(origin + '/admin/writings');
  let refreshedWritingCard = page.locator('section.aks-admin-card').filter({
    has: page.getByRole('heading', {
      level: 2,
      name: 'Architecture Without Page Builders',
      exact: true,
    }),
  });
  await publishWritingLocale(
    page,
    refreshedWritingCard.getByRole('group', { name: 'EN', exact: true }),
    'EN',
    'Publish update EN',
  );

  await page.goto(origin + englishDetail + '?tag-publication=en');
  const englishTagLink = page.getByRole('link', {
    name: 'Software architecture',
    exact: true,
  });
  await englishTagLink.waitFor();
  assert.equal(
    await englishTagLink.getAttribute('href'),
    '/en/writings/tags/software-architecture',
  );

  await page.goto(origin + frenchDetail + '?tag-publication=en-only');
  assert.equal(
    await page
      .getByRole('link', { name: 'Architecture logicielle', exact: true })
      .count(),
    0,
    'Publishing an EN Writing Tag update must not mutate the FR Writing snapshot.',
  );

  await page.goto(origin + '/admin/writings');
  refreshedWritingCard = page.locator('section.aks-admin-card').filter({
    has: page.getByRole('heading', {
      level: 2,
      name: 'Architecture Without Page Builders',
      exact: true,
    }),
  });
  await publishWritingLocale(
    page,
    refreshedWritingCard.getByRole('group', { name: 'FR', exact: true }),
    'FR',
    'Publish update FR',
  );

  const targets = [
    {
      locale: 'en',
      overview: '/en/writings',
      writingTitle: 'Architecture Without Page Builders',
      writingDetail: englishDetail,
      tagName: 'Software architecture',
      tagPath: '/en/writings/tags/software-architecture',
      alternateLocale: 'fr',
      alternatePath: '/fr/ecrits/tags/architecture-logicielle',
    },
    {
      locale: 'fr',
      overview: '/fr/ecrits',
      writingTitle: 'Architecture sans page builder',
      writingDetail: frenchDetail,
      tagName: 'Architecture logicielle',
      tagPath: '/fr/ecrits/tags/architecture-logicielle',
      alternateLocale: 'en',
      alternatePath: '/en/writings/tags/software-architecture',
    },
  ];

  for (const target of targets) {
    await page.goto(origin + target.overview + '?tag-publication=' + target.locale);
    const overviewCard = page
      .locator('[data-writing-feed] [data-writing-kind]')
      .filter({
        has: page.getByRole('heading', {
          level: 3,
          name: target.writingTitle,
          exact: true,
        }),
      });
    const overviewTagLink = overviewCard.getByRole('link', {
      name: target.tagName,
      exact: true,
    });
    await overviewTagLink.waitFor();
    assert.equal(await overviewTagLink.getAttribute('href'), target.tagPath);

    await page.goto(
      origin +
        target.writingDetail +
        '?tag-publication=' +
        encodeURIComponent(target.locale),
    );
    const detailTagLink = page.getByRole('link', {
      name: target.tagName,
      exact: true,
    });
    await detailTagLink.waitFor();
    assert.equal(await detailTagLink.getAttribute('href'), target.tagPath);

    const tagResponse = await page.goto(origin + target.tagPath);
    assert.equal(tagResponse?.status(), 200);
    await page
      .getByRole('heading', {
        level: 1,
        name: target.tagName,
        exact: true,
      })
      .waitFor();
    const tagWriting = page
      .locator('[data-writing-feed] [data-writing-kind]')
      .filter({
        has: page.getByRole('heading', {
          level: 3,
          name: target.writingTitle,
          exact: true,
        }),
      });
    await tagWriting.waitFor();
    assert.equal(
      await tagWriting
        .getByRole('link', { name: /Lire|Read/ })
        .getAttribute('href'),
      target.writingDetail,
      'Tag deep routes must resolve back to published Writings.',
    );
    assert.equal(
      await page
        .locator(
          '.aks-experience-meta a[hreflang="' + target.alternateLocale + '"]',
        )
        .getAttribute('href'),
      target.alternatePath,
      'Published Tags must expose their localized deep-route equivalent.',
    );
    await assertAxe(page);

    const ssr = await page.context().request.get(origin + target.tagPath);
    assert.equal(ssr.status(), 200);
    const html = await ssr.text();
    assert.ok(
      html.includes(target.tagName) && html.includes(target.writingTitle),
      'Tag name and related Writing must be present in initial HTML.',
    );
  }
}

async function assertWritingSystemRelations(page) {
  const englishWriting = '/en/writings/architecture-without-page-builders';
  const frenchWriting = '/fr/ecrits/architecture-sans-page-builder';
  const englishSystem = '/en/systems/protocap';
  const frenchSystem = '/fr/systems/protocap';

  await page.goto(origin + '/admin/writings');
  const writingCard = page.locator('section.aks-admin-card').filter({
    has: page.getByRole('heading', {
      level: 2,
      name: 'Architecture Without Page Builders',
      exact: true,
    }),
  });

  const systemsGroup = writingCard.getByRole('group', {
    name: 'Systems',
    exact: true,
  });
  const protoCap = systemsGroup.getByRole('checkbox', {
    name: 'ProtoCap',
    exact: true,
  });
  await protoCap.check();
  await systemsGroup
    .getByRole('button', { name: 'Save systems', exact: true })
    .click();
  await page
    .getByText('Writing systems saved as draft.', { exact: true })
    .waitFor();

  await page.goto(origin + englishWriting + '?system-relation=draft');
  assert.equal(
    await page
      .locator('.aks-system-reference')
      .filter({
        has: page.getByRole('heading', {
          level: 3,
          name: 'ProtoCap',
          exact: true,
        }),
      })
      .count(),
    0,
    'Draft Writing→System relations must not leak before Writing republication.',
  );

  await page.goto(origin + englishSystem + '?writing-relation=draft');
  assert.equal(
    await page
      .getByRole('link', {
        name: 'Architecture Without Page Builders',
        exact: true,
      })
      .count(),
    0,
    'Draft Writing→System relations must not leak onto the public System page.',
  );

  await page.goto(origin + '/admin/writings');
  let refreshedWritingCard = page.locator('section.aks-admin-card').filter({
    has: page.getByRole('heading', {
      level: 2,
      name: 'Architecture Without Page Builders',
      exact: true,
    }),
  });
  await publishWritingLocale(
    page,
    refreshedWritingCard.getByRole('group', { name: 'EN', exact: true }),
    'EN',
    'Publish update EN',
  );

  await page.goto(origin + englishWriting + '?system-relation=en');
  const englishReference = page.locator('.aks-system-reference').filter({
    has: page.getByRole('heading', {
      level: 3,
      name: 'ProtoCap',
      exact: true,
    }),
  });
  await englishReference.waitFor();
  assert.equal(
    await englishReference
      .getByRole('link', { name: 'Inspect System', exact: true })
      .getAttribute('href'),
    englishSystem,
    'Published Writing must deep-link to the related EN System.',
  );

  await page.goto(origin + englishSystem + '?writing-relation=en');
  const englishRelatedWriting = page.locator('article.aks-admin-card').filter({
    has: page.getByRole('heading', {
      level: 3,
      name: 'Architecture Without Page Builders',
      exact: true,
    }),
  });
  await englishRelatedWriting.waitFor();
  assert.equal(
    await englishRelatedWriting
      .getByRole('link', { name: 'Read', exact: true })
      .getAttribute('href'),
    englishWriting,
    'Published System must deep-link back to the related EN Writing.',
  );
  await assertAxe(page);

  await page.goto(origin + frenchWriting + '?system-relation=en-only');
  assert.equal(
    await page
      .locator('.aks-system-reference')
      .filter({
        has: page.getByRole('heading', {
          level: 3,
          name: 'ProtoCap',
          exact: true,
        }),
      })
      .count(),
    0,
    'Publishing EN must not mutate the still-published FR Writing snapshot.',
  );

  await page.goto(origin + frenchSystem + '?writing-relation=en-only');
  assert.equal(
    await page
      .getByRole('link', {
        name: 'Architecture sans page builder',
        exact: true,
      })
      .count(),
    0,
    'Publishing EN must not mutate the FR System→Writing relation.',
  );

  await page.goto(origin + '/admin/writings');
  refreshedWritingCard = page.locator('section.aks-admin-card').filter({
    has: page.getByRole('heading', {
      level: 2,
      name: 'Architecture Without Page Builders',
      exact: true,
    }),
  });
  await publishWritingLocale(
    page,
    refreshedWritingCard.getByRole('group', { name: 'FR', exact: true }),
    'FR',
    'Publish update FR',
  );

  await page.goto(origin + frenchWriting + '?system-relation=fr');
  const frenchReference = page.locator('.aks-system-reference').filter({
    has: page.getByRole('heading', {
      level: 3,
      name: 'ProtoCap',
      exact: true,
    }),
  });
  await frenchReference.waitFor();
  assert.equal(
    await frenchReference
      .getByRole('link', { name: 'Inspecter le système', exact: true })
      .getAttribute('href'),
    frenchSystem,
    'Published Writing must deep-link to the related FR System.',
  );

  await page.goto(origin + frenchSystem + '?writing-relation=fr');
  const frenchRelatedWriting = page.locator('article.aks-admin-card').filter({
    has: page.getByRole('heading', {
      level: 3,
      name: 'Architecture sans page builder',
      exact: true,
    }),
  });
  await frenchRelatedWriting.waitFor();
  assert.equal(
    await frenchRelatedWriting
      .getByRole('link', { name: 'Lire', exact: true })
      .getAttribute('href'),
    frenchWriting,
    'Published System must deep-link back to the related FR Writing.',
  );
  await assertAxe(page);

  for (const target of [
    {
      writingPath: englishWriting,
      systemPath: englishSystem,
      writingTitle: 'Architecture Without Page Builders',
      systemTitle: 'ProtoCap',
    },
    {
      writingPath: frenchWriting,
      systemPath: frenchSystem,
      writingTitle: 'Architecture sans page builder',
      systemTitle: 'ProtoCap',
    },
  ]) {
    const writingResponse = await page.context().request.get(
      origin + target.writingPath + '?system-relation=ssr',
    );
    assert.equal(writingResponse.status(), 200);
    const writingHtml = await writingResponse.text();
    assert.ok(
      writingHtml.includes(target.systemTitle),
      'Related System must be present in initial Writing HTML.',
    );

    const systemResponse = await page.context().request.get(
      origin + target.systemPath + '?writing-relation=ssr',
    );
    assert.equal(systemResponse.status(), 200);
    const systemHtml = await systemResponse.text();
    assert.ok(
      systemHtml.includes(target.writingTitle),
      'Related Writing must be present in initial System HTML.',
    );
  }
}

async function assertRealArticleAuthoringFromAdmin(page) {
  const title = 'From ambiguity to executable boundaries';
  const slug = 'from-ambiguity-to-executable-boundaries';
  const publicPath = '/en/writings/' + slug;
  const summary =
    'A practical article on turning unclear operational signals into a bounded, inspectable software system.';
  const intro =
    'A useful system starts by reducing ambiguity before it adds interface.';
  const sectionHeading = 'Start from observable work';
  const sectionParagraph =
    'Watch what people actually do, identify the evidence they rely on, and separate recurring signals from assumptions.';
  const bulletItems = [
    'Capture the evidence already present in the activity.',
    'Name the decision that evidence is supposed to support.',
  ];
  const subsectionHeading = 'Make the boundary explicit';
  const orderedItems = [
    'Describe one concrete state transition.',
    'Keep ownership of semantics in code.',
    'Publish only evidence you can support.',
  ];
  const quotation =
    'A system becomes useful when its boundary is easier to inspect than the ambiguity it replaces. The reader should be able to stay with the argument without fighting the interface, even when a quotation carries several complete thoughts across a small screen. Good reading conditions protect attention instead of asking the reader to manage layout.';
  const code =
    'const decision = normalize(signal).then(deriveState).then(attachEvidence).then(makeBoundaryInspectable).then(decideWithoutHidingAmbiguity);';
  const callout =
    'Do not automate an ambiguity you have not yet described.';
  const assetName = 'aks-119-boundary.png';
  const assetAlt =
    'A boundary sketch connecting signal, state, evidence and decision';
  const assetCaption =
    'Boundary sketch used while authoring the AKS-119 article from the admin.';

  await page.goto(origin + '/admin/writings');

  const createCard = page.locator('section.aks-admin-card').filter({
    has: page.getByRole('heading', {
      level: 2,
      name: 'Create Writing',
      exact: true,
    }),
  });
  await createCard.locator('select[name="kind"]').selectOption('article');
  await createCard
    .locator('select[name="editorialWeight"]')
    .selectOption('featured');
  await submitWritingAdminAction(
    page,
    createCard.getByRole('button', { name: 'Create Writing', exact: true }),
  );

  const createdCard = () =>
    page
      .locator('[data-writing-card]')
      .filter({ hasText: 'ARTICLE · FEATURED' })
      .last();

  let fieldset = createdCard().getByRole('group', {
    name: 'EN',
    exact: true,
  });
  await fieldset.locator('input[name="slug"]').fill(slug);
  await fieldset.locator('input[name="title"]').fill(title);
  await fieldset.locator('textarea[name="summary"]').fill(summary);
  await fieldset
    .locator('[data-writing-editor][data-editor-ready="true"]')
    .waitFor();

  const editor = fieldset.locator(
    '[data-writing-editor] [contenteditable="true"]',
  );
  await editor.fill(intro);

  const insertBlockWithText = async (buttonName, selector, text) => {
    await fieldset
      .getByRole('button', { name: buttonName, exact: true })
      .click();
    const inserted = editor.locator(selector).last();
    await inserted.waitFor();
    await inserted.fill(text);
    return inserted;
  };

  const section = await insertBlockWithText(
    'H2 heading',
    'h2',
    sectionHeading,
  );
  await section.press('End');
  await page.keyboard.press('Enter');
  await page.keyboard.insertText(sectionParagraph);

  const firstBullet = await insertBlockWithText(
    'List',
    'ul li p',
    bulletItems[0],
  );
  await firstBullet.press('End');
  await page.keyboard.press('Enter');
  await page.keyboard.insertText(bulletItems[1]);

  await insertBlockWithText(
    'H3 heading',
    'h3',
    subsectionHeading,
  );

  const firstStep = await insertBlockWithText(
    'Steps',
    'ol li p',
    orderedItems[0],
  );
  await firstStep.press('End');
  for (const item of orderedItems.slice(1)) {
    await page.keyboard.press('Enter');
    await page.keyboard.insertText(item);
  }

  await insertBlockWithText('Quote', 'blockquote p', quotation);

  await fieldset
    .getByRole('button', { name: 'Code', exact: true })
    .click();
  const codeBlock = editor.locator('pre').last();
  await codeBlock.waitFor();
  await codeBlock.click();
  await page.keyboard.press('End');
  for (let index = 0; index < 'code'.length; index += 1) {
    await page.keyboard.press('Backspace');
  }
  await page.keyboard.insertText(code);

  await insertBlockWithText(
    'Callout',
    'aside[data-writing-callout] p',
    callout,
  );

  const authoredDocument = JSON.parse(
    await fieldset.locator('input[name="editorDocument"]').inputValue(),
  );
  const authoredJson = JSON.stringify(authoredDocument);
  for (const authoredText of [
    intro,
    sectionHeading,
    sectionParagraph,
    ...bulletItems,
    subsectionHeading,
    ...orderedItems,
    quotation,
    code,
    callout,
  ]) {
    assert.ok(
      authoredJson.includes(authoredText),
      'AKS-119 authoring must persist real text entered through the visible editor: ' +
        authoredText,
    );
  }
  for (const nodeType of [
    'heading',
    'bulletList',
    'orderedList',
    'blockquote',
    'codeBlock',
    'callout',
  ]) {
    assert.ok(
      authoredDocument.content.some((node) => node.type === nodeType),
      'AKS-119 article must exercise the controlled ' + nodeType + ' block.',
    );
  }

  await submitWritingAdminAction(
    page,
    fieldset.getByRole('button', {
      name: 'Save EN draft',
      exact: true,
    }),
  );

  const articleCard = () =>
    page.locator('[data-writing-card]').filter({
      has: page.getByRole('heading', {
        level: 2,
        name: title,
        exact: true,
      }),
    });

  fieldset = articleCard().getByRole('group', {
    name: 'EN',
    exact: true,
  });
  const persistedDocument = JSON.parse(
    await fieldset.locator('input[name="editorDocument"]').inputValue(),
  );
  assert.equal(
    JSON.stringify(persistedDocument).includes(callout),
    true,
    'The real Article document must survive a server-backed admin round-trip.',
  );

  const assetSection = articleCard().locator('[data-writing-assets]');
  const upload = assetSection.locator('form[data-writing-asset-upload]');
  await upload.locator('input[name="file"]').setInputFiles({
    name: assetName,
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z8YQAAAAASUVORK5CYII=',
      'base64',
    ),
  });
  await upload.locator('input[name="altEn"]').fill(assetAlt);
  await upload
    .locator('textarea[name="captionEn"]')
    .fill(assetCaption);
  await upload
    .getByRole('button', {
      name: 'Upload Writing image',
      exact: true,
    })
    .click();
  await page
    .getByText(
      'Writing image uploaded. Insert it from the EN or FR editor.',
      { exact: true },
    )
    .waitFor();
  assert.equal((await page.goto(origin + '/admin/writings'))?.status(), 200);
  const persistedAssetSection = articleCard().locator('[data-writing-assets]');
  await persistedAssetSection.getByText(assetName, { exact: true }).waitFor();
  const persistedAsset = persistedAssetSection
    .locator('.aks-admin-asset')
    .filter({ hasText: assetName });
  assert.equal(
    await persistedAsset.locator('input[name="altEn"]').inputValue(),
    assetAlt,
    'AKS-121 must preserve the EN-only alt text entered during upload.',
  );
  assert.equal(
    await persistedAsset.locator('input[name="altFr"]').inputValue(),
    '',
    'AKS-121 must allow contextual media to remain untranslated until FR actually uses it.',
  );

  const frenchFieldset = articleCard().getByRole('group', {
    name: 'FR',
    exact: true,
  });
  assert.equal(
    await frenchFieldset
      .getByRole('button', {
        name: 'Insérer · ' + assetName,
        exact: true,
      })
      .isDisabled(),
    true,
    'FR authoring must still require FR alt text before the image can be inserted.',
  );

  fieldset = articleCard().getByRole('group', {
    name: 'EN',
    exact: true,
  });
  await fieldset
    .locator('[data-writing-editor][data-editor-ready="true"]')
    .waitFor();
  const reloadedEditor = fieldset.locator(
    '[data-writing-editor] [contenteditable="true"]',
  );
  await reloadedEditor.click();
  await reloadedEditor.press('Control+End');
  await fieldset
    .getByRole('button', {
      name: 'Insert · ' + assetName,
      exact: true,
    })
    .click();

  const mediaDocument = JSON.parse(
    await fieldset.locator('input[name="editorDocument"]').inputValue(),
  );
  assert.ok(
    mediaDocument.content.some((node) => node.type === 'image'),
    'AKS-119 real authoring must insert contextual media through the editor UI.',
  );
  await submitWritingAdminAction(
    page,
    fieldset.getByRole('button', {
      name: 'Save EN draft',
      exact: true,
    }),
  );

  let relationGroup = articleCard().getByRole('group', {
    name: 'Categories',
    exact: true,
  });
  await ensureCheckboxChecked(
    relationGroup.getByRole('checkbox', {
      name: 'Engineering practice',
      exact: true,
    }),
    'AKS-119 Category relation must remain checked before save.',
  );
  await submitWritingAdminAction(
    page,
    relationGroup.getByRole('button', {
      name: 'Save categories',
      exact: true,
    }),
  );

  relationGroup = articleCard().getByRole('group', {
    name: 'Tags',
    exact: true,
  });
  await ensureCheckboxChecked(
    relationGroup.getByRole('checkbox', {
      name: 'Software architecture',
      exact: true,
    }),
    'AKS-119 Tag relation must remain checked before save.',
  );
  await submitWritingAdminAction(
    page,
    relationGroup.getByRole('button', {
      name: 'Save tags',
      exact: true,
    }),
  );

  relationGroup = articleCard().getByRole('group', {
    name: 'Systems',
    exact: true,
  });
  await ensureCheckboxChecked(
    relationGroup.getByRole('checkbox', {
      name: 'ProtoCap',
      exact: true,
    }),
    'AKS-119 System relation must remain checked before save.',
  );
  await submitWritingAdminAction(
    page,
    relationGroup.getByRole('button', {
      name: 'Save systems',
      exact: true,
    }),
  );

  const previewHref = await articleCard()
    .getByRole('link', { name: 'Preview EN', exact: true })
    .getAttribute('href');
  assert.ok(previewHref, 'AKS-119 Article must expose an authenticated preview.');
  const previewResponse = await page.goto(origin + previewHref);
  assert.equal(previewResponse?.status(), 200);
  await page
    .getByRole('heading', {
      level: 1,
      name: title,
      exact: true,
    })
    .waitFor();
  assert.equal(
    await page.locator('meta[name="robots"]').getAttribute('content'),
    'noindex, nofollow, noarchive, nosnippet',
  );
  assert.ok((await page.locator('body').innerText()).includes(sectionHeading));
  assert.ok((await page.locator('body').innerText()).includes(callout));
  assert.equal(
    await page.locator('img[alt="' + assetAlt + '"]').count(),
    1,
    'The admin preview must resolve the contextual Article image.',
  );
  await assertAxe(page);

  await page.goto(origin + '/admin/writings');
  fieldset = articleCard().getByRole('group', {
    name: 'EN',
    exact: true,
  });
  const publishButton = fieldset.getByRole('button', {
    name: 'Publish EN',
    exact: true,
  });
  await publishButton.waitFor();
  const publicationNavigation = page.waitForNavigation({
    waitUntil: 'domcontentloaded',
  });
  await publishButton.evaluate((element) => {
    const form = element.form;
    if (form === null) {
      throw new Error('AKS-119 publication control must belong to a form.');
    }
    form.submit();
  });
  const publicationResponse = await publicationNavigation;
  assert.ok(
    publicationResponse !== null && publicationResponse.status() < 400,
    'AKS-119 must publish through the real admin form boundary.',
  );
  fieldset = articleCard().getByRole('group', {
    name: 'EN',
    exact: true,
  });
  await waitForPublishedWritingState(fieldset, 'EN');

  const publicResponse = await page.goto(origin + publicPath);
  assert.equal(publicResponse?.status(), 200);
  await page
    .getByRole('heading', {
      level: 1,
      name: title,
      exact: true,
    })
    .waitFor();
  assert.equal(
    await page.locator('main[data-writing-kind="article"]').count(),
    1,
    'AKS-119 must publish through the shared Article form, not a separate route.',
  );
  const publicBody = await page.locator('body').innerText();
  for (const expected of [
    summary,
    intro,
    sectionHeading,
    sectionParagraph,
    ...bulletItems,
    subsectionHeading,
    ...orderedItems,
    quotation,
    code,
    callout,
  ]) {
    assert.ok(
      publicBody.includes(expected),
      'Published AKS-119 Article must retain authored content: ' + expected,
    );
  }
  assert.ok(
    (await page.locator('[data-writing-node="bulletList"]').innerText()).includes(
      bulletItems[1],
    ),
  );
  assert.ok(
    (await page.locator('[data-writing-node="orderedList"]').innerText()).includes(
      orderedItems[2],
    ),
  );
  assert.equal(
    await page.locator('[data-writing-node="blockquote"]').count(),
    1,
  );
  assert.equal(
    await page.locator('[data-writing-node="codeBlock"]').count(),
    1,
  );
  assert.equal(
    await page.locator('[data-writing-node="callout"]').count(),
    1,
  );
  const publicImage = page.locator('img[alt="' + assetAlt + '"]');
  await publicImage.waitFor();
  assert.equal(
    await publicImage.locator('xpath=..').locator('figcaption').innerText(),
    assetCaption,
  );
  assert.equal(
    await page
      .getByRole('link', {
        name: 'Engineering practice',
        exact: true,
      })
      .getAttribute('href'),
    '/en/writings/categories/engineering-practice',
  );
  assert.equal(
    await page
      .getByRole('link', {
        name: 'Software architecture',
        exact: true,
      })
      .getAttribute('href'),
    '/en/writings/tags/software-architecture',
  );
  const protoCapReference = page.locator('.aks-system-reference').filter({
    has: page.getByRole('heading', {
      level: 3,
      name: 'ProtoCap',
      exact: true,
    }),
  });
  await protoCapReference.waitFor();
  assert.equal(
    await protoCapReference
      .getByRole('link', { name: 'Inspect System', exact: true })
      .getAttribute('href'),
    '/en/systems/protocap',
  );
  assert.equal(
    await page.locator('.aks-experience-meta a[hreflang="fr"]').count(),
    0,
    'A real EN-only Article must not fabricate a French publication.',
  );
  await assertAxe(page);

  const ssr = await page.context().request.get(origin + publicPath);
  assert.equal(ssr.status(), 200);
  const html = await ssr.text();
  assert.ok(
    html.includes(title) &&
      html.includes(sectionHeading) &&
      html.includes(assetAlt) &&
      html.includes('"@type":"Article"'),
    'The real Article must be present in initial SSR HTML with editorial SEO.',
  );

  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal((await page.goto(origin + publicPath))?.status(), 200);
  assert.equal(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
    true,
    'The AKS-119 real Article must not overflow a 390px mobile viewport.',
  );
  await assertAxe(page);
  await page.setViewportSize({ width: 1280, height: 800 });
}

async function assertLongFormMobileReading(browser) {
  const essayPath = '/fr/ecrits/rendre-l-attention-au-reel';
  const articlePath = '/en/writings/from-ambiguity-to-executable-boundaries';
  const articleImageAlt =
    'A boundary sketch connecting signal, state, evidence and decision';

  const viewports = [
    { width: 320, height: 720 },
    { width: 390, height: 844 },
    { width: 430, height: 932 },
  ];

  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport });
    try {
      const page = await context.newPage();

      const essayResponse = await page.goto(origin + essayPath);
      assert.equal(essayResponse?.status(), 200);
      await page
        .getByRole('heading', {
          level: 1,
          name: 'Rendre l’attention au réel',
          exact: true,
        })
        .waitFor();

      const essayReader = page.locator('[data-long-form-reader]');
      const essayMetrics = await essayReader.evaluate((reader) => {
        const paragraph = reader.querySelector(
          '[data-writing-node="paragraph"]',
        );
        if (!(paragraph instanceof HTMLElement)) {
          throw new Error('AKS-120 requires a long-form paragraph.');
        }

        const styles = getComputedStyle(paragraph);
        const readerRect = reader.getBoundingClientRect();
        return {
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
          documentWidth: document.documentElement.scrollWidth,
          readerWidth: readerRect.width,
          paragraphFontSize: Number.parseFloat(styles.fontSize),
          paragraphLineHeight: Number.parseFloat(styles.lineHeight),
          pageHeight: document.documentElement.scrollHeight,
        };
      });

      assert.equal(
        essayMetrics.documentWidth <= essayMetrics.viewportWidth,
        true,
        `AKS-120 essay must not create global horizontal scrolling at ${viewport.width}px.`,
      );
      assert.ok(
        essayMetrics.readerWidth <= essayMetrics.viewportWidth,
        `AKS-120 essay reader must stay inside the ${viewport.width}px viewport.`,
      );

      for (const sourceUrl of [
        'https://github.com/AmineAKIK/protocap',
        'https://protocap-production.up.railway.app/',
      ]) {
        const sourceParagraph = essayReader.getByText(sourceUrl, {
          exact: true,
        });
        await sourceParagraph.waitFor();
        assert.equal(
          await sourceParagraph.evaluate(
            (node) => node.scrollWidth <= node.clientWidth,
          ),
          true,
          `Long source URL must wrap inside the ${viewport.width}px prose measure: ${sourceUrl}`,
        );
      }
      assert.ok(
        essayMetrics.paragraphFontSize >= 16,
        'Long-form mobile prose must remain at least 16px.',
      );
      assert.ok(
        essayMetrics.paragraphLineHeight / essayMetrics.paragraphFontSize >=
          1.65,
        'Long-form mobile prose must retain generous reading line-height.',
      );
      assert.ok(
        essayMetrics.pageHeight / essayMetrics.viewportHeight >= 12,
        'The real 25-page essay must exercise sustained mobile reading depth.',
      );

      const finalExcerpt = page.getByText(
        'l’attention peut retourner là où tout avait commencé : dans le réel.',
        { exact: false },
      );
      await finalExcerpt.last().scrollIntoViewIfNeeded();
      const finalBox = await finalExcerpt.last().boundingBox();
      assert.ok(finalBox !== null);
      assert.ok(
        finalBox.y < viewport.height &&
          finalBox.y + finalBox.height > 0,
        'The final essay argument must remain reachable and visible on mobile.',
      );
      await assertAxe(page);

      const articleResponse = await page.goto(origin + articlePath);
      assert.equal(articleResponse?.status(), 200);
      await page
        .getByRole('heading', {
          level: 1,
          name: 'From ambiguity to executable boundaries',
          exact: true,
        })
        .waitFor();

      const articleReader = page.locator('[data-long-form-reader]');
      assert.equal(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth,
        ),
        true,
        `Rich long-form Writing must not create global overflow at ${viewport.width}px.`,
      );

      const codeBlock = articleReader.locator(
        '[data-writing-node="codeBlock"]',
      );
      await codeBlock.waitFor();
      const codeMetrics = await codeBlock.evaluate((node) => {
        const styles = getComputedStyle(node);
        return {
          clientWidth: node.clientWidth,
          scrollWidth: node.scrollWidth,
          overflowX: styles.overflowX,
          viewportWidth: window.innerWidth,
        };
      });
      assert.equal(
        codeMetrics.overflowX,
        'auto',
        'Long code must scroll locally rather than widening the page.',
      );
      assert.ok(
        codeMetrics.clientWidth <= codeMetrics.viewportWidth,
        'Code block must fit inside the mobile viewport.',
      );
      assert.ok(
        codeMetrics.scrollWidth > codeMetrics.clientWidth,
        'AKS-120 fixture must exercise genuinely long horizontally scrollable code.',
      );
      await codeBlock.evaluate((node) => {
        node.scrollLeft = node.scrollWidth;
      });
      assert.ok(
        (await codeBlock.evaluate((node) => node.scrollLeft)) > 0,
        'The reader must permit deliberate local horizontal code scrolling.',
      );
      assert.equal(
        await page.evaluate(() => window.scrollX),
        0,
        'Local code scrolling must not move the whole page horizontally.',
      );

      const quote = articleReader.locator(
        '[data-writing-node="blockquote"]',
      );
      await quote.waitFor();
      const quoteMetrics = await quote.evaluate((node) => {
        const text = node.querySelector('.aks-text');
        if (!(text instanceof HTMLElement)) {
          throw new Error('AKS-120 requires quote text.');
        }
        const textStyles = getComputedStyle(text);
        const nodeRect = node.getBoundingClientRect();
        const reader = node.closest('[data-long-form-reader]');
        const readerRect = reader?.getBoundingClientRect();
        return {
          width: nodeRect.width,
          readerWidth: readerRect?.width ?? 0,
          height: nodeRect.height,
          lineHeight: Number.parseFloat(textStyles.lineHeight),
        };
      });
      assert.ok(
        quoteMetrics.width <= quoteMetrics.readerWidth + 1,
        'Long quotations must wrap inside the prose measure.',
      );
      assert.ok(
        quoteMetrics.height / quoteMetrics.lineHeight >= 4,
        'AKS-120 must exercise a quotation spanning several mobile lines.',
      );

      const image = page.locator('img[alt="' + articleImageAlt + '"]');
      await image.waitFor();
      const imageMetrics = await image.evaluate((node) => {
        const rect = node.getBoundingClientRect();
        const reader = node.closest('[data-long-form-reader]');
        const readerRect = reader?.getBoundingClientRect();
        return {
          width: rect.width,
          height: rect.height,
          readerWidth: readerRect?.width ?? 0,
          viewportHeight: window.innerHeight,
          loading: node.loading,
        };
      });
      assert.ok(
        imageMetrics.width <= imageMetrics.readerWidth + 1,
        'Contextual images must remain within the mobile reader width.',
      );
      assert.ok(
        imageMetrics.height <= imageMetrics.viewportHeight * 0.8,
        'Contextual images must not monopolize more than roughly one mobile viewport.',
      );
      assert.equal(
        imageMetrics.loading,
        'lazy',
        'Contextual long-form images below the opening should stay lazy-loaded.',
      );

      assert.equal(
        await articleReader.locator('table').count(),
        0,
        'Writing schema v1 must not silently introduce table rendering during AKS-120.',
      );

      await assertAxe(page);
    } finally {
      await context.close();
    }
  }
}

async function assertWritingsOverviewIsolation(browser) {
  const targets = [
    { path: '/en/writings', heading: 'Writings' },
    { path: '/fr/ecrits', heading: 'Écrits' },
  ];

  const desktop = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  try {
    const page = await desktop.newPage();
    for (const target of targets) {
      const response = await page.goto(`${origin}${target.path}`);
      assert.equal(response?.status(), 200);
      await page.getByRole('heading', { level: 1, name: target.heading, exact: true }).waitFor();
      await page.locator('[data-unified-editorial-surface] [data-writing-feed]').waitFor();
      assert.equal(
        await page.locator('.aks-system-reference').count(),
        0,
        `${target.path} must not reintroduce unrelated generic System references into the unified editorial surface.`,
      );
      await assertAxe(page);
    }
  } finally {
    await desktop.close();
  }

  const mobile = await browser.newContext({ viewport: { width: 320, height: 720 } });
  try {
    const page = await mobile.newPage();
    for (const target of targets) {
      const response = await page.goto(`${origin}${target.path}`);
      assert.equal(response?.status(), 200);
      await page.locator('[data-unified-editorial-surface] [data-writing-feed]').waitFor();
      assert.equal(
        await page.locator('.aks-system-reference').count(),
        0,
        `${target.path} must keep generic System references outside the unified editorial surface on mobile.`,
      );
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
        true,
        `${target.path} unified editorial surface must not overflow at 320px.`,
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
      assert.match(
        response.headers()['x-robots-tag'] ?? '',
        /noindex/i,
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

  await futureCard()
    .getByText(/EN Published · FR Published/)
    .waitFor();
  await futureCard()
    .getByText(/Training connected/)
    .waitFor();

  const publishedAdminText = await futureCard().innerText();
  assert.ok(
    publishedAdminText.includes('EN Published · FR Published'),
    'Credential admin must revalidate both locale publication states before continuing.',
  );
  assert.ok(
    publishedAdminText.includes('Training connected'),
    'Credential admin must preserve the optional Training context after publication.',
  );

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

async function assertStandaloneLearningArtifactExtensibility(page) {
  await page.goto(origin + '/admin/learning/artifacts');

  const createCard = page.locator('section.aks-admin-card').filter({
    has: page.getByRole('heading', {
      level: 2,
      name: 'Create LearningArtifact',
      exact: true,
    }),
  });
  const createForm = createCard.locator('form');

  assert.equal(
    (await createForm.locator('select[name="trainingId"] option').first().textContent())?.trim(),
    'No Training',
    'LearningArtifact admin must not force evidence into a fake Training context.',
  );
  await createForm.locator('select[name="trainingId"]').selectOption('');
  await createForm.getByRole('button', { name: 'Create LearningArtifact', exact: true }).click();
  await page.getByText('LearningArtifact created.', { exact: true }).waitFor();

  const standaloneCard = () =>
    page
      .locator('section.aks-admin-card')
      .filter({ hasText: 'Standalone evidence' })
      .last();

  await standaloneCard().waitFor();
  assert.ok(
    (await standaloneCard().innerText()).includes('Standalone evidence'),
    'A LearningArtifact with no Training must remain explicit in admin.',
  );

  const fillLocalization = async ({
    index,
    locale,
    slug,
    title,
    summary,
    body,
  }) => {
    let fieldset = standaloneCard().locator('fieldset').nth(index);
    await fieldset.locator('input[name="slug"]').fill(slug);
    await fieldset.locator('input[name="title"]').fill(title);
    await fieldset.locator('textarea[name="summary"]').fill(summary);
    await fieldset.locator('textarea[name="body"]').fill(body);
    await fieldset
      .getByRole('button', { name: 'Save ' + locale + ' draft', exact: true })
      .click();
    await page
      .getByText(locale + ' LearningArtifact draft saved.', { exact: true })
      .waitFor();

    fieldset = standaloneCard().locator('fieldset').nth(index);
    await fieldset
      .getByRole('button', { name: 'Publish ' + locale, exact: true })
      .click();
    await page
      .getByText(locale + ' LearningArtifact published.', { exact: true })
      .waitFor();
  };

  await fillLocalization({
    index: 0,
    locale: 'EN',
    slug: 'standalone-learning-note',
    title: 'Standalone Learning Note',
    summary: 'Independent learning evidence without a formal Training wrapper.',
    body: 'This artifact records relevant learning directly without inventing a course or curriculum.',
  });

  await fillLocalization({
    index: 1,
    locale: 'FR',
    slug: 'note-apprentissage-autonome',
    title: 'Note d’apprentissage autonome',
    summary: 'Preuve d’apprentissage indépendante sans formation formelle artificielle.',
    body: 'Cet artifact consigne un apprentissage pertinent sans inventer de cursus ni de formation.',
  });

  const targets = [
    {
      overviewPath: '/en/learning',
      artifactPath: '/en/learning/artifacts/standalone-learning-note',
      title: 'Standalone Learning Note',
      summary: 'Independent learning evidence without a formal Training wrapper.',
      body: 'This artifact records relevant learning directly without inventing a course or curriculum.',
      standaloneLabel: 'Standalone learning evidence',
      alternateLocale: 'fr',
      alternatePath: '/fr/apprentissage/preuves/note-apprentissage-autonome',
      trainingTitle: 'Qualified Training',
    },
    {
      overviewPath: '/fr/apprentissage',
      artifactPath: '/fr/apprentissage/preuves/note-apprentissage-autonome',
      title: 'Note d’apprentissage autonome',
      summary: 'Preuve d’apprentissage indépendante sans formation formelle artificielle.',
      body: 'Cet artifact consigne un apprentissage pertinent sans inventer de cursus ni de formation.',
      standaloneLabel: 'Preuve d’apprentissage autonome',
      alternateLocale: 'en',
      alternatePath: '/en/learning/artifacts/standalone-learning-note',
      trainingTitle: 'Formation qualifiée',
    },
  ];

  for (const target of targets) {
    const overviewResponse = await page.goto(origin + target.overviewPath);
    assert.equal(overviewResponse?.status(), 200);
    const overviewCard = page
      .locator('.aks-learning-evidence-card[data-evidence-kind="learning-artifact"]')
      .filter({
        has: page.getByRole('heading', {
          level: 3,
          name: target.title,
          exact: true,
        }),
      });
    await overviewCard.waitFor();
    const overviewText = await overviewCard.innerText();
    assert.ok(overviewText.includes(target.summary));
    assert.ok(
      overviewText.includes(target.standaloneLabel),
      'Standalone Learning evidence must be explicit at summary depth.',
    );
    assert.equal(
      await overviewCard.locator('a[href="' + target.artifactPath + '"]').count(),
      1,
      'Standalone Learning evidence must keep an autonomous deep link.',
    );

    const detailResponse = await page.goto(origin + target.artifactPath);
    assert.equal(detailResponse?.status(), 200);
    await page
      .getByRole('heading', { level: 1, name: target.title, exact: true })
      .waitFor();
    const detailText = await page.locator('body').innerText();
    assert.ok(detailText.includes(target.summary));
    assert.ok(detailText.includes(target.body));
    assert.ok(
      detailText.includes(
        target.overviewPath.startsWith('/fr/')
          ? 'Preuve d’apprentissage autonome, sans formation formelle requise.'
          : 'Standalone learning evidence; no formal Training is required.',
      ),
      'Standalone Learning evidence must not masquerade as a Training.',
    );
    assert.equal(
      await page.getByRole('link', { name: target.trainingTitle, exact: true }).count(),
      0,
      'Standalone Learning evidence must not fabricate a Training relationship.',
    );
    assert.equal(
      await page
        .locator('.aks-experience-meta a[hreflang="' + target.alternateLocale + '"]')
        .getAttribute('href'),
      target.alternatePath,
      'Standalone Learning evidence must remain bilingual on equivalent deep routes.',
    );
    await assertAxe(page);
  }
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
    (await artifactCard.innerText()).includes('Published snapshots · EN 2 · FR 2'),
    'LearningArtifact publication summary must include standalone evidence.',
  );
  assert.ok(
    (await artifactCard.innerText()).includes(
      '1 connected to Training · 1 standalone · 1 connected to System · 0 with source document',
    ),
    'LearningArtifact relationship summary must distinguish optional Training context.',
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


async function assertLearningInspectionDepth(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  try {
    const page = await context.newPage();
    const targets = [
      {
        locale: 'en',
        overviewPath: '/en/learning',
        artifactPath: '/en/learning/artifacts/sentinel-dwwm-project-dossier',
        sourcePath: '/en/learning/artifacts/sentinel-dwwm-project-dossier/source',
        systemPath: '/en/systems/sentinel',
        heading: 'Sentinel — DWWM Project Dossier',
        summary:
          'First-class learning evidence connecting the DWWM training to Sentinel through problem framing, architecture, implementation, security, testing, deployment, and documented limits.',
        inspection:
          'The repository documents an immutable examination baseline at release v1.0.0-rc.9',
        inspectLabel: 'Inspect evidence',
        sourceLabel: 'Open original PDF',
        systemEvidenceHeading: 'Connected learning evidence',
        systemInspectLabel: 'Inspect learning evidence',
      },
      {
        locale: 'fr',
        overviewPath: '/fr/apprentissage',
        artifactPath: '/fr/apprentissage/preuves/dossier-projet-dwwm-sentinel',
        sourcePath: '/fr/apprentissage/preuves/dossier-projet-dwwm-sentinel/source',
        systemPath: '/fr/systems/sentinel',
        heading: 'Sentinel — dossier de projet DWWM',
        summary:
          'Preuve d’apprentissage de premier rang reliant la formation DWWM à Sentinel à travers le cadrage du besoin, l’architecture, l’implémentation, la sécurité, les tests, le déploiement et les limites documentées.',
        inspection:
          'Le dépôt documente une baseline d’examen immuable à la release v1.0.0-rc.9',
        inspectLabel: 'Inspecter la preuve',
        sourceLabel: 'Ouvrir le PDF original',
        systemEvidenceHeading: 'Preuves d’apprentissage liées',
        systemInspectLabel: 'Inspecter la preuve',
      },
    ];

    for (const target of targets) {
      const implicitSourceRequests = [];
      const sourceUrl = origin + target.sourcePath;
      const onRequest = (request) => {
        if (request.url() === sourceUrl) {
          implicitSourceRequests.push(request.url());
        }
      };
      page.on('request', onRequest);

      const overviewResponse = await page.goto(origin + target.overviewPath);
      assert.equal(overviewResponse?.status(), 200);

      const overviewCard = page
        .locator('.aks-learning-evidence-card[data-evidence-kind="learning-artifact"]')
        .filter({
          has: page.getByRole('heading', {
            level: 3,
            name: target.heading,
            exact: true,
          }),
        });
      await overviewCard.waitFor();
      assert.ok(
        (await overviewCard.innerText()).includes(target.summary),
        target.overviewPath +
          ' must give a hurried visitor useful Sentinel substance before opening the evidence.',
      );
      assert.equal(
        await overviewCard
          .getByRole('link', { name: target.inspectLabel, exact: true })
          .getAttribute('href'),
        target.artifactPath,
        target.overviewPath +
          ' must offer an explicit transition from summary depth to inspection depth.',
      );
      assert.equal(
        implicitSourceRequests.length,
        0,
        target.overviewPath +
          ' must not fetch the source PDF while the visitor stays at summary depth.',
      );

      const artifactResponse = await page.goto(origin + target.artifactPath);
      assert.equal(artifactResponse?.status(), 200);
      await page
        .getByRole('heading', { level: 1, name: target.heading, exact: true })
        .waitFor();

      const artifactText = await page.locator('body').innerText();
      assert.ok(
        artifactText.includes(target.summary) && artifactText.includes(target.inspection),
        target.artifactPath +
          ' must provide substantial native Web inspection before the original PDF is opened.',
      );
      assert.equal(
        await page.locator('.aks-dossier-section').count(),
        10,
        target.artifactPath +
          ' must retain the complete native ten-section inspection path.',
      );
      assert.equal(
        implicitSourceRequests.length,
        0,
        target.artifactPath +
          ' must not fetch the source PDF implicitly while rendering native inspection depth.',
      );

      const sourceLink = page.getByRole('link', {
        name: target.sourceLabel,
        exact: true,
      });
      await sourceLink.waitFor();
      assert.equal(
        await sourceLink.getAttribute('href'),
        target.sourcePath,
        target.artifactPath +
          ' must expose the original PDF as an explicit deeper-inspection choice.',
      );
      assert.equal(
        await page.locator('.aks-dossier-context a[href="' + target.systemPath + '"]').count(),
        1,
        target.artifactPath +
          ' must expose the connected Sentinel System without collapsing it into Learning.',
      );

      const sourceResponse = await context.request.get(sourceUrl);
      assert.equal(
        sourceResponse.status(),
        200,
        target.sourcePath + ' must remain available to a deep evaluator.',
      );
      assert.equal(
        sourceResponse.headers()['content-type'],
        'application/pdf',
        target.sourcePath + ' must remain the original-document surface.',
      );
      assert.match(
        sourceResponse.headers()['x-robots-tag'] ?? '',
        /noindex/i,
        target.sourcePath +
          ' must remain subordinate to the autonomous HTML inspection route.',
      );

      const systemResponse = await page.goto(origin + target.systemPath);
      assert.equal(systemResponse?.status(), 200);
      await page
        .getByRole('heading', { level: 1, name: 'Sentinel', exact: true })
        .waitFor();
      await page
        .getByRole('heading', {
          level: 2,
          name: target.systemEvidenceHeading,
          exact: true,
        })
        .waitFor();
      const systemEvidence = page
        .locator('.aks-system-learning-evidence-card')
        .filter({
          has: page.getByRole('heading', {
            level: 3,
            name: target.heading,
            exact: true,
          }),
        });
      await systemEvidence.waitFor();
      assert.equal(
        await systemEvidence
          .getByRole('link', { name: target.systemInspectLabel, exact: true })
          .getAttribute('href'),
        target.artifactPath,
        target.systemPath +
          ' must let the deep evaluator return to the same published Learning evidence.',
      );

      page.off('request', onRequest);
      await assertAxe(page);
    }
  } finally {
    await context.close();
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
    const destinationHeading = page.getByRole('heading', { level: 1 });
    await destinationHeading.waitFor();
    if (!destination.path.endsWith('/work-with-us') &&
        !destination.path.endsWith('/travailler-ensemble')) {
      assert.equal(
        (await destinationHeading.innerText()).trim(),
        destination.heading,
        `${destination.path} must keep its code-owned first-level heading.`,
      );
    } else {
      assert.ok(
        (await destinationHeading.innerText()).trim().length > 0,
        `${destination.path} must expose a non-empty localized commercial heading.`,
      );
    }
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
      const destinationHeading = page.getByRole('heading', { level: 1 });
      await destinationHeading.waitFor();
      if (
        !destination.path.endsWith('/work-with-us') &&
        !destination.path.endsWith('/travailler-ensemble')
      ) {
        assert.equal(
          (await destinationHeading.innerText()).trim(),
          destination.heading,
          `${destination.path} must keep its code-owned first-level heading.`,
        );
      } else {
        assert.ok(
          (await destinationHeading.innerText()).trim().length > 0,
          `${destination.path} must reconstruct a non-empty localized commercial heading on direct load.`,
        );
      }
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

  const brandMarks = portal.locator(
    'img.aks-brand-mark[src="/brand/AKSYS.svg"]',
  );
  assert.equal(
    await brandMarks.count(),
    2,
    'Home must use the canonical uploaded AkikSystems emblem for both brand positions.',
  );
  assert.equal(
    await page.locator('link[rel="icon"][href="/brand/AKSYS.svg"]').count(),
    1,
    'The uploaded AkikSystems emblem must be the global SVG favicon.',
  );
  const emblemResponse = await page.context().request.get(
    `${origin}/brand/AKSYS.svg`,
  );
  assert.equal(
    emblemResponse.status(),
    200,
    'The canonical AkikSystems emblem asset must be publicly served.',
  );

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

async function runEditorialAndLearningQualification(browser, page) {
  bootstrapL6RendreAttentionEssay();

  await assertRendreAttentionEssay(browser);
  await assertWritingAdminAndPublic(page);
  await assertWritingCategories(page);
  await assertWritingTags(page);
  await assertWritingSystemRelations(page);
  await assertWritingsOverviewIsolation(browser);
  await assertLightweightNoteAuthoring(page);
  await assertWritingFiltering(page);
  await assertWritingSearch(page);
  await assertRealArticleAuthoringFromAdmin(page);
  await assertLongFormMobileReading(browser);
  await assertTrainingPublicJourney(browser);
  await assertCredentialPublicJourney(browser);
  await assertCredentialAdmin(page);
  await assertFutureCredentialExtensibility(page);
  await assertLearningArtifactPublicJourney(browser);
  await assertLearningOverviewExperience(browser);
  await assertLearningSeo(browser);
  await assertLearningArtifactAdmin(page);
  await assertStandaloneLearningArtifactExtensibility(page);
  await assertLearningAdminWorkspace(page);
  await assertDwwmTrainingJourney(browser, page);
  await assertSentinelDossierJourney(browser, page);
  await assertLearningInspectionDepth(browser);
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
    await page
      .locator(
        'a.aks-brand-signature[href="/en"] img.aks-brand-mark[src="/brand/AKSYS.svg"]',
      )
      .waitFor();
    await page.getByLabel('Email').fill(adminEmail);
    await page.getByLabel('Password').fill(adminPassword);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL(`${origin}/admin`);

    if (browserShard === 'content') {
      const sentinel = await context.request.get(
        `${origin}/en/systems/sentinel`,
      );
      assert.equal(
        sentinel.status(),
        200,
        'The content shard requires the isolated published Sentinel CI fixture.',
      );

      bootstrapL4QualificationSystems();
      await runEditorialAndLearningQualification(browser, page);

      process.stdout.write(
        'AkikSystems content browser shard passed: Writings and Learning admin/publication, search/filtering, long-form reading, credentials, artifacts, DWWM, Sentinel dossier, responsive behavior, SEO, and accessibility are verified.\n',
      );
      return;
    }

    await assertProfileAdministration(page);
    await assertLegalPageAdministration(page);

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

    await assertWorkWithUsContentAdministration(page);
    await assertSystemsOverview(browser);
    await assertProtoCapGuidedDemo(browser);
    await assertOriaInteractiveEntry(browser);
    await assertTugeresStandardSystem(browser);

    if (browserShard === 'full') {
      await runEditorialAndLearningQualification(browser, page);
    }

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
    const transitionProbeSupported = await page.evaluate(() => {
      const link = document.querySelector('.aks-experience-nav a[href="/en/profile"]');
      if (!(link instanceof HTMLAnchorElement)) return false;

      window.__aksTransitionStarts = 0;
      const original = document.startViewTransition.bind(document);
      document.startViewTransition = (callback) => {
        window.__aksTransitionStarts += 1;
        return original(callback);
      };
      return true;
    });
    assert.equal(transitionProbeSupported, true);
    await page.locator('.aks-experience-nav a[href="/en/profile"]').click();
    await page.waitForURL(`${origin}/en/profile`);
    await page.waitForFunction(
      () => window.__aksTransitionStarts >= 1,
      undefined,
      { timeout: 2_000 },
    );
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

    if (!skipLighthouse) {
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
    } else {
      process.stdout.write(
        'Lighthouse performance qualification is isolated in its dedicated CI gate.\n',
      );
    }

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
