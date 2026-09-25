/* eslint-disable @typescript-eslint/no-require-imports, no-undef */
const { strict: assert } = require('node:assert');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { setTimeout: sleep } = require('node:timers/promises');
const { chromium } = require('playwright');

const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;

if (!adminEmail || !adminPassword) {
  throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required.');
}

const port = '4179';
const origin = `http://127.0.0.1:${port}`;
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
      // Server is still starting.
    }
    await sleep(100);
  }

  throw new Error(`Commercial admin smoke server did not become ready. stderr=${stderr}`);
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
    (pathname === '/admin' || pathname === '/admin.data') &&
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
  await card.locator('input[name="title"]').fill(copy.title);
  await card.locator('textarea[name="introduction"]').fill(copy.introduction);
  await card.locator('input[name="situationsTitle"]').fill(copy.situationsTitle);
  await card.locator('textarea[name="situationsBody"]').fill(copy.situationsBody);
  await card.locator('input[name="capabilitiesTitle"]').fill(copy.capabilitiesTitle);
  await card.locator('textarea[name="capabilitiesBody"]').fill(copy.capabilitiesBody);
  await card.locator('input[name="collaborationTitle"]').fill(copy.collaborationTitle);
  await card.locator('textarea[name="collaborationBody"]').fill(copy.collaborationBody);
}

async function assertPersisted(card, copy) {
  await assert.rejects(
    async () => {
      const value = await card.locator('input[name="title"]').inputValue();
      assert.notEqual(value, copy.title);
    },
    undefined,
  ).catch(() => {});

  assert.equal(await card.locator('input[name="title"]').inputValue(), copy.title);
  assert.equal(
    await card.locator('textarea[name="introduction"]').inputValue(),
    copy.introduction,
  );
  assert.equal(
    await card.locator('input[name="situationsTitle"]').inputValue(),
    copy.situationsTitle,
  );
  assert.equal(
    await card.locator('textarea[name="situationsBody"]').inputValue(),
    copy.situationsBody,
  );
  assert.equal(
    await card.locator('input[name="capabilitiesTitle"]').inputValue(),
    copy.capabilitiesTitle,
  );
  assert.equal(
    await card.locator('textarea[name="capabilitiesBody"]').inputValue(),
    copy.capabilitiesBody,
  );
  assert.equal(
    await card.locator('input[name="collaborationTitle"]').inputValue(),
    copy.collaborationTitle,
  );
  assert.equal(
    await card.locator('textarea[name="collaborationBody"]').inputValue(),
    copy.collaborationBody,
  );
}

async function assertPublicCopy(page, pathName, copy) {
  const response = await page.goto(origin + pathName);
  assert.equal(response?.status(), 200);
  await page
    .getByRole('heading', { level: 1, name: copy.title, exact: true })
    .waitFor();
  await page.getByText(copy.introduction, { exact: true }).waitFor();
  await page.getByText(copy.situationsTitle, { exact: true }).waitFor();
  await page.getByText(copy.capabilitiesTitle, { exact: true }).waitFor();
  await page.getByText(copy.collaborationTitle, { exact: true }).waitFor();
}

(async () => {
  await waitForServer();
  const browser = await chromium.launch({ headless: true });

  const english = {
    title: 'Work with AkikSystems',
    introduction:
      'AkikSystems works with people and organizations on software and systems that need clear framing and reliable execution.',
    situationsTitle: 'Start with the situation',
    situationsBody:
      'Bring a problem, an idea, an existing system, or a result you are trying to reach. The first exchange is about understanding the context before defining the work.',
    capabilitiesTitle: 'What AkikSystems can help with',
    capabilitiesBody:
      'The work can combine product framing, software architecture, web applications, internal tools, integrations, automation, testing, documentation, and observability.',
    collaborationTitle: 'How collaboration begins',
    collaborationBody:
      'Collaboration starts with a direct conversation, then the scope, responsibilities, technical decisions, and expected outcomes are made explicit.',
  };

  const french = {
    title: 'Travailler avec AkikSystems',
    introduction:
      'AkikSystems accompagne des personnes et des organisations sur des sujets logiciels et systèmes qui demandent un cadrage clair et une exécution fiable.',
    situationsTitle: 'Partir de la situation',
    situationsBody:
      'Vous pouvez venir avec un problème, une idée, un système existant ou un résultat à atteindre. Le premier échange sert à comprendre le contexte avant de définir le travail.',
    capabilitiesTitle: 'Ce qu’AkikSystems peut prendre en charge',
    capabilitiesBody:
      'Le travail peut combiner cadrage produit, architecture logicielle, applications web, outils internes, intégrations, automatisation, tests, documentation et observabilité.',
    collaborationTitle: 'Comment commence une collaboration',
    collaborationBody:
      'La collaboration commence par un échange direct, puis le périmètre, les responsabilités, les décisions techniques et les résultats attendus sont explicités.',
  };

  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`${origin}/admin/login`);
    await page.getByLabel('Email').fill(adminEmail);
    await page.getByLabel('Password').fill(adminPassword);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.waitForURL(`${origin}/admin`);

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
      'save-commercial-localization:en',
      'EN Work with us draft saved.',
    );

    await page.goto(`${origin}/admin`);
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
      'publish-commercial-localization:en',
      'EN Work with us content published.',
    );
    await assertPublicCopy(page, '/en/work-with-us', english);

    await page.goto(`${origin}/admin`);
    let frenchCard = localeCard(page, 'fr');
    await fillCommercialDraft(frenchCard, french);
    await submitCommand(
      page,
      frenchCard.getByRole('button', { name: 'Save FR draft', exact: true }),
      'save-commercial-localization:fr',
      'FR Work with us draft saved.',
    );

    await page.goto(`${origin}/admin`);
    frenchCard = localeCard(page, 'fr');
    await assertPersisted(frenchCard, french);
    await submitCommand(
      page,
      frenchCard.getByRole('button', { name: 'Publish FR', exact: true }),
      'publish-commercial-localization:fr',
      'FR Work with us content published.',
    );
    await assertPublicCopy(page, '/fr/travailler-ensemble', french);

    await page.goto(`${origin}/admin`);
    englishCard = localeCard(page, 'en');
    await englishCard
      .locator('input[name="title"]')
      .fill('Private draft must remain private');
    await submitCommand(
      page,
      englishCard.getByRole('button', { name: 'Save EN draft', exact: true }),
      'save-commercial-localization:en',
      'EN Work with us draft saved.',
    );

    publicResponse = await page.context().request.get(`${origin}/en/work-with-us`);
    publicHtml = await publicResponse.text();
    assert.match(publicHtml, /Work with AkikSystems/);
    assert.doesNotMatch(publicHtml, /Private draft must remain private/);

    process.stdout.write(
      'Commercial admin smoke passed: atomic locale commands serialize correctly, EN/FR drafts persist across reload, publication succeeds, and later drafts preserve the public snapshot.\n',
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
