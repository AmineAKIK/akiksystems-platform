/* eslint-disable @typescript-eslint/no-require-imports, no-undef */
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { setTimeout: sleep } = require('node:timers/promises');
const { chromium } = require('playwright');
const { Pool } = require('pg');

const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;
const databaseUrl = process.env.DATABASE_URL;

if (!adminEmail || !adminPassword || !databaseUrl) {
  throw new Error(
    'ADMIN_EMAIL, ADMIN_PASSWORD and DATABASE_URL are required for the Profile admin browser smoke.',
  );
}

const port = '4181';
const origin = 'http://127.0.0.1:' + port;
const marker = randomUUID();
const storageRoot = path.join('/tmp', 'akiksystems-profile-admin-' + marker);
const db = new Pool({ connectionString: databaseUrl });

const technologyId = randomUUID();
const systemId = randomUUID();
const writingId = randomUUID();
const technologySlug = 'profile-admin-react-' + marker.slice(0, 8);
const systemSlug = 'profile-admin-system-' + marker.slice(0, 8);
const writingSlug = 'profile-admin-writing-' + marker.slice(0, 8);

const systemSnapshot = {
  version: 2,
  systemId,
  locale: 'en',
  presentationKind: 'standard',
  evidencePolicy: 'all_supported',
  slug: systemSlug,
  title: 'Profile Admin System',
  summary: 'Canonical System selected from the Profile admin.',
  proofTransparency: {
    role: 'Qualification',
    maturity: 'Published',
    demoNature: 'Synthetic',
    dataNature: 'Synthetic',
    limits: 'Browser qualification fixture.',
  },
  presentationDocument: {
    version: 1,
    blocks: [{ type: 'paragraph', text: 'Profile admin qualification.' }],
  },
  technologies: [
    {
      id: technologyId,
      slug: technologySlug,
      name: 'React',
      position: 0,
      evidence: 'Published System ↔ Technology proof from the admin smoke.',
    },
  ],
  origin: null,
  links: [],
  media: [],
};

const writingSnapshot = {
  version: 5,
  writingId,
  locale: 'en',
  slug: writingSlug,
  title: 'Profile Admin Writing',
  summary: 'Published reasoning selected from the Profile admin.',
  body: 'Published reasoning body.',
  document: {
    version: 1,
    blocks: [{ type: 'paragraph', text: 'Published reasoning body.' }],
  },
  kind: 'article',
  editorialWeight: 'normal',
  editorialPosition: 50,
  categoryIds: [],
  tagIds: [],
  systemIds: [],
  assets: [],
};

async function profileId() {
  const result = await db.query(
    "select id from profiles where singleton_key = 'public'",
  );
  const id = result.rows[0]?.id;
  assert.ok(id, 'Profile singleton must exist.');
  return id;
}

async function resetProfile(id) {
  await db.query('delete from profile_publications where profile_id = $1', [id]);
  await db.query('delete from profile_stack_groups where profile_id = $1', [id]);
  await db.query('delete from profile_contacts where profile_id = $1', [id]);
  await db.query('delete from profile_languages where profile_id = $1', [id]);
  await db.query(
    'update profile_mobility set worldwide = false, remote = false, relocation = false, updated_at = now() where profile_id = $1',
    [id],
  );
  await db.query(
    'update profiles set display_name = null, portrait_asset_id = null, source_cv_asset_id = null, current_system_id = null, systemic_scale_writing_id = null, updated_at = now() where id = $1',
    [id],
  );
  await db.query(
    "update profile_localizations set content = '{}'::jsonb, editorial_state = 'draft', published_at = null, updated_at = now() where profile_id = $1",
    [id],
  );
}

async function seedCanonicalReferences() {
  await db.query(
    'insert into technologies (id, slug, name) values ($1, $2, $3)',
    [technologyId, technologySlug, 'React'],
  );

  await db.query(
    "insert into systems (id, lifecycle, editorial_position) values ($1, 'active', 10)",
    [systemId],
  );
  await db.query(
    "insert into system_publications (system_id, locale, slug, snapshot, published_at, updated_at) values ($1, 'en', $2, $3::jsonb, now(), now())",
    [systemId, systemSlug, JSON.stringify(systemSnapshot)],
  );

  await db.query(
    "insert into writings (id, kind, lifecycle, editorial_weight, editorial_position) values ($1, 'article', 'active', 'normal', 50)",
    [writingId],
  );
  await db.query(
    "insert into writing_publications (writing_id, locale, slug, snapshot, published_at, updated_at) values ($1, 'en', $2, $3::jsonb, now(), now())",
    [writingId, writingSlug, JSON.stringify(writingSnapshot)],
  );
}

async function cleanup(id) {
  await resetProfile(id);

  const ownedAssets = await db.query(
    'select id from assets where storage_key like $1',
    ['profiles/' + id + '/%'],
  );
  if (ownedAssets.rowCount > 0) {
    await db.query('delete from assets where id = any($1::uuid[])', [
      ownedAssets.rows.map((row) => row.id),
    ]);
  }

  await db.query('delete from writings where id = $1', [writingId]);
  await db.query('delete from systems where id = $1', [systemId]);
  await db.query('delete from technologies where id = $1', [technologyId]);
  await fs.rm(storageRoot, { recursive: true, force: true });
}

const server = spawn(process.execPath, ['server.js'], {
  cwd: path.resolve(__dirname, '..'),
  env: {
    ...process.env,
    NODE_ENV: 'test',
    PORT: port,
    BETTER_AUTH_URL: origin,
    ASSET_STORAGE_TEST_ROOT: storageRoot,
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let stderr = '';
server.stderr.on('data', (chunk) => {
  stderr += chunk.toString();
});

async function waitForServer() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const response = await fetch(origin + '/en');
      if (response.ok) return;
    } catch {
      // Server is still starting.
    }
    await sleep(100);
  }

  throw new Error(
    'Profile admin browser smoke server did not become ready. stderr=' + stderr,
  );
}

async function signIn(page) {
  await page.goto(origin + '/admin/login');
  await page.getByLabel('Email').fill(adminEmail);
  await page.getByLabel('Password').fill(adminPassword);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(origin + '/admin');
}

async function clickAndWaitForMessage(page, button, message) {
  await button.click();
  await page.getByText(message, { exact: true }).waitFor();
}

async function assertNoHorizontalOverflow(page, label) {
  const geometry = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    page: document.documentElement.scrollWidth,
  }));

  assert.ok(
    geometry.page <= geometry.viewport + 1,
    label + ' must not overflow horizontally.',
  );
}

(async () => {
  let id;
  let browser;

  try {
    id = await profileId();
    await resetProfile(id);
    await seedCanonicalReferences();
    await waitForServer();

    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    });
    const page = await context.newPage();

    await signIn(page);
    await page.goto(origin + '/admin/profile?locale=en');
    await page.locator('.aks-admin-profile-page').waitFor();
    await page.locator('.aks-admin-profile-canvas').waitFor();

    assert.equal(await page.locator('.aks-profile-hero').count(), 1);
    assert.equal(await page.locator('.aks-profile-guidance').count(), 1);
    assert.equal(await page.locator('.aks-admin-profile-management').count(), 1);
    await assertNoHorizontalOverflow(page, 'Desktop Profile admin');

    const globalForm = page.locator('.aks-admin-profile-global-form');
    await globalForm
      .locator('input[name="displayName"]')
      .fill('Admin Smoke Profile');
    await globalForm
      .locator('select[name="currentSystemId"]')
      .selectOption(systemId);
    await globalForm
      .locator('select[name="systemicScaleWritingId"]')
      .selectOption(writingId);
    await globalForm
      .locator('input[name="contact:email"]')
      .fill('profile-admin@example.invalid');
    await globalForm.locator('input[name="languages"][value="en"]').check();
    await globalForm.locator('input[name="languages"][value="fr"]').check();
    await globalForm.locator('input[name="mobilityWorldwide"]').check();
    await globalForm.locator('input[name="mobilityRemote"]').check();

    await clickAndWaitForMessage(
      page,
      globalForm.getByRole('button', { name: 'Save global Profile facts' }),
      'Profile global structure saved; EN and FR are now draft.',
    );

    const globalState = await db.query(
      'select display_name, current_system_id, systemic_scale_writing_id from profiles where id = $1',
      [id],
    );
    assert.equal(globalState.rows[0].display_name, 'Admin Smoke Profile');
    assert.equal(globalState.rows[0].current_system_id, systemId);
    assert.equal(globalState.rows[0].systemic_scale_writing_id, writingId);

    const addGroup = page.locator('.aks-admin-profile-add-group');
    await addGroup.locator('input[name="groupTitle"]').fill('Front-end');
    await clickAndWaitForMessage(
      page,
      addGroup.getByRole('button', { name: 'Add Stack group' }),
      'Stack group added; EN and FR are now draft.',
    );

    const groupResult = await db.query(
      'select id from profile_stack_groups where profile_id = $1 order by position limit 1',
      [id],
    );
    const groupId = groupResult.rows[0]?.id;
    assert.ok(groupId);

    const groupCard = page
      .locator('.aks-admin-profile-stack-management-card')
      .filter({ hasText: 'Front-end' });
    await groupCard
      .locator('select[name="technologyId"]')
      .selectOption(technologyId);
    await clickAndWaitForMessage(
      page,
      groupCard.getByRole('button', { name: 'Add', exact: true }),
      'Technology added; EN and FR are now draft.',
    );

    await page
      .locator('input[name="heroProfessionalTitle"]')
      .fill('Qualified systems builder');
    await page
      .locator('textarea[name="heroIntroduction"]')
      .fill('Published through the visual Profile administration workspace.');
    await page
      .locator('textarea[name="stackTitle"]')
      .fill('What I master, and where to verify it.');
    const stackTrigger = page.locator('.aks-profile-stack-trigger').first();
    if ((await stackTrigger.getAttribute('aria-expanded')) !== 'true') {
      await stackTrigger.click();
    }
    await page
      .locator('input[name="stackGroupTitle:' + groupId + '"]')
      .fill('Front-end');
    await page
      .locator('textarea[name="guidanceTitle"]')
      .fill('One problem, four perspectives.');
    await page
      .locator('textarea[name="capabilitiesTitle"]')
      .fill('From framing to evolution.');
    await page.locator('input[name="systemicTitle"]').fill('Systemic Scale');
    await page
      .locator('textarea[name="ctaTitle"]')
      .fill('Build something useful.');

    await clickAndWaitForMessage(
      page,
      page.getByRole('button', { name: 'Save EN draft' }),
      'EN Profile draft saved.',
    );

    const draft = await db.query(
      "select content, editorial_state from profile_localizations where profile_id = $1 and locale = 'en'",
      [id],
    );
    assert.equal(
      draft.rows[0].content.hero.professionalTitle,
      'Qualified systems builder',
    );
    assert.equal(draft.rows[0].editorial_state, 'draft');

    const portraitCard = page
      .locator('.aks-admin-profile-asset-card')
      .filter({ hasText: 'Portrait' });
    const pngBytes = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z6kAAAAASUVORK5CYII=',
      'base64',
    );
    await portraitCard.locator('input[name="file"]').setInputFiles({
      name: 'profile.png',
      mimeType: 'image/png',
      buffer: pngBytes,
    });
    await portraitCard.locator('input[name="altEn"]').fill('Admin smoke portrait');
    await portraitCard
      .locator('input[name="altFr"]')
      .fill('Portrait de qualification');
    await clickAndWaitForMessage(
      page,
      portraitCard.getByRole('button', { name: 'Upload portrait' }),
      'Portrait uploaded; EN and FR are now draft.',
    );

    const cvCard = page
      .locator('.aks-admin-profile-asset-card')
      .filter({ hasText: 'CV' });
    await cvCard.locator('input[name="file"]').setInputFiles({
      name: 'profile.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n'),
    });
    await clickAndWaitForMessage(
      page,
      cvCard.getByRole('button', { name: 'Upload CV' }),
      'CV uploaded; EN and FR are now draft.',
    );

    await page
      .locator('input[name="heroProfessionalTitle"]')
      .fill('Qualified systems builder');
    await page
      .locator('textarea[name="heroIntroduction"]')
      .fill('Published through the visual Profile administration workspace.');
    await page
      .locator('textarea[name="stackTitle"]')
      .fill('What I master, and where to verify it.');
    await page
      .locator('input[name="stackGroupTitle:' + groupId + '"]')
      .fill('Front-end');

    await clickAndWaitForMessage(
      page,
      page.getByRole('button', { name: 'Publish EN' }),
      'EN Profile published.',
    );

    const publication = await db.query(
      "select snapshot from profile_publications where profile_id = $1 and locale = 'en'",
      [id],
    );
    assert.equal(publication.rowCount, 1);
    assert.equal(publication.rows[0].snapshot.version, 1);
    assert.equal(
      publication.rows[0].snapshot.content.hero.professionalTitle,
      'Qualified systems builder',
    );
    assert.equal(publication.rows[0].snapshot.currentSystemId, systemId);
    assert.equal(publication.rows[0].snapshot.systemicScaleWritingId, writingId);
    assert.ok(publication.rows[0].snapshot.portraitAssetId);
    assert.ok(publication.rows[0].snapshot.sourceCvAssetId);

    const publicResponse = await page.goto(origin + '/en/profile');
    assert.equal(publicResponse?.status(), 200);
    await page
      .getByRole('heading', { level: 1, name: 'Admin Smoke Profile' })
      .waitFor();
    await page
      .getByText('Qualified systems builder', { exact: false })
      .waitFor();
    await page.getByText('Profile Admin System', { exact: true }).waitFor();
    await page
      .getByText(
        'Published System ↔ Technology proof from the admin smoke.',
        { exact: true },
      )
      .waitFor();

    assert.equal(await page.locator('.aks-admin-profile-inline').count(), 0);

    const portraitResponse = await page.request.get(
      origin + '/en/profile/portrait',
    );
    assert.equal(portraitResponse.status(), 200);

    const cvResponse = await page.request.get(origin + '/en/profile/cv');
    assert.equal(cvResponse.status(), 200);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(origin + '/admin/profile?locale=en');
    await page.locator('.aks-admin-profile-page').waitFor();
    await assertNoHorizontalOverflow(page, '390px Profile admin');

    await context.close();

    console.log(
      'Profile admin browser smoke passed: login, global facts, Stack, inline draft, assets, publication and public rendering are qualified.',
    );
  } finally {
    if (browser) await browser.close();
    server.kill('SIGTERM');
    await Promise.race([
      new Promise((resolve) => server.once('exit', resolve)),
      sleep(2000),
    ]);

    if (id) {
      await cleanup(id).catch((error) => {
        console.error('Profile admin cleanup failed:', error);
      });
    }

    await db.end();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
