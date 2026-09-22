import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';

import { sql } from 'kysely';

import { createDatabase } from '../database.js';
import { databaseUrlFromEnv } from './env.js';
import { createMigrator, reportMigrationResults } from './migrator.js';

interface PostgreSqlError {
  code?: string;
  constraint?: string;
}

function postgresError(error: unknown): PostgreSqlError {
  assert.ok(error !== null && typeof error === 'object');
  return error as PostgreSqlError;
}

async function expectPostgresError(
  expectedCode: string,
  expectedConstraint: string,
  operation: () => Promise<unknown>,
): Promise<void> {
  let caught: unknown;

  try {
    await operation();
  } catch (error) {
    caught = error;
  }

  assert.ok(caught !== undefined, `Expected PostgreSQL error ${expectedCode}.`);

  const postgres = postgresError(caught);
  assert.equal(postgres.code, expectedCode);
  assert.equal(postgres.constraint, expectedConstraint);
}

const db = createDatabase(databaseUrlFromEnv());
const systemId = randomUUID();
const assetId = randomUUID();
const secondAssetId = randomUUID();

try {
  const migrationResult = await createMigrator(db).migrateToLatest();
  reportMigrationResults(migrationResult.results);

  if (migrationResult.error !== undefined) {
    throw migrationResult.error;
  }

  await db.insertInto('systems').values({ id: systemId }).execute();

  await db
    .insertInto('assets')
    .values({
      id: assetId,
      storage_key: `systems/${systemId}/${assetId}.webp`,
      original_filename: 'sentinel-dashboard.webp',
      mime_type: 'image/webp',
      byte_size: 4096,
      width: 1280,
      height: 720,
    })
    .execute();

  await db
    .insertInto('asset_localizations')
    .values([
      {
        asset_id: assetId,
        locale: 'en',
        alt_text: 'Sentinel dashboard',
        caption: 'Sentinel operational dashboard.',
      },
      {
        asset_id: assetId,
        locale: 'fr',
        alt_text: 'Tableau de bord Sentinel',
        caption: 'Tableau de bord opérationnel Sentinel.',
      },
    ])
    .execute();

  await db
    .insertInto('system_assets')
    .values({
      system_id: systemId,
      asset_id: assetId,
      position: 0,
    })
    .execute();

  const localized = await db
    .selectFrom('system_assets')
    .innerJoin('assets', 'assets.id', 'system_assets.asset_id')
    .innerJoin(
      'asset_localizations',
      (join) =>
        join
          .onRef('asset_localizations.asset_id', '=', 'assets.id')
          .on('asset_localizations.locale', '=', 'fr'),
    )
    .select([
      'assets.storage_key',
      'assets.mime_type',
      'assets.byte_size',
      'assets.width',
      'assets.height',
      'asset_localizations.alt_text',
      'asset_localizations.caption',
      'system_assets.position',
    ])
    .where('system_assets.system_id', '=', systemId)
    .executeTakeFirstOrThrow();

  assert.equal(localized.mime_type, 'image/webp');
  assert.equal(localized.byte_size, 4096);
  assert.equal(localized.width, 1280);
  assert.equal(localized.height, 720);
  assert.equal(localized.position, 0);
  assert.equal(localized.alt_text, 'Tableau de bord Sentinel');
  assert.match(localized.storage_key, /^systems\//);

  await expectPostgresError(
    '23001',
    'system_assets_asset_id_fkey',
    () => db.deleteFrom('assets').where('id', '=', assetId).execute(),
  );

  await expectPostgresError(
    '23514',
    'assets_mime_type_check',
    () =>
      sql`
        insert into assets (
          id,
          storage_key,
          original_filename,
          mime_type,
          byte_size
        ) values (
          ${secondAssetId}::uuid,
          ${`systems/${systemId}/invalid.exe`},
          'invalid.exe',
          'application/x-msdownload',
          1024
        )
      `.execute(db),
  );

  await expectPostgresError(
    '23514',
    'assets_byte_size_check',
    () =>
      sql`
        insert into assets (
          id,
          storage_key,
          original_filename,
          mime_type,
          byte_size
        ) values (
          ${secondAssetId}::uuid,
          ${`systems/${systemId}/too-large.pdf`},
          'too-large.pdf',
          'application/pdf',
          10485761
        )
      `.execute(db),
  );


  await expectPostgresError(
    '23514',
    'assets_dimensions_check',
    () =>
      sql`
        insert into assets (
          id,
          storage_key,
          original_filename,
          mime_type,
          byte_size,
          width,
          height
        ) values (
          ${secondAssetId}::uuid,
          ${`systems/${systemId}/invalid-dimensions.webp`},
          'invalid-dimensions.webp',
          'image/webp',
          1024,
          1280,
          null
        )
      `.execute(db),
  );

  await expectPostgresError(
    '23514',
    'asset_localizations_locale_check',
    () =>
      sql`
        insert into asset_localizations (
          asset_id,
          locale,
          alt_text
        ) values (
          ${assetId}::uuid,
          'de',
          'Nicht erlaubt'
        )
      `.execute(db),
  );

  await db
    .deleteFrom('system_assets')
    .where('system_id', '=', systemId)
    .where('asset_id', '=', assetId)
    .execute();

  await db.deleteFrom('assets').where('id', '=', assetId).execute();

  const remainingLocalizations = await db
    .selectFrom('asset_localizations')
    .select(({ fn }) => fn.countAll<number>().as('count'))
    .where('asset_id', '=', assetId)
    .executeTakeFirstOrThrow();

  assert.equal(Number(remainingLocalizations.count), 0);

  process.stdout.write(
    'Contextual asset verification passed: metadata, localization, MIME/size/dimension constraints, context linking, and protected deletion are enforced.\n',
  );
} finally {
  await db.deleteFrom('system_assets').where('system_id', '=', systemId).execute();
  await db.deleteFrom('assets').where('id', 'in', [assetId, secondAssetId]).execute();
  await db.deleteFrom('systems').where('id', '=', systemId).execute();
  await db.destroy();
}
