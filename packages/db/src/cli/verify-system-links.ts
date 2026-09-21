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

try {
  const migrationResult = await createMigrator(db).migrateToLatest();
  reportMigrationResults(migrationResult.results);

  if (migrationResult.error !== undefined) {
    throw migrationResult.error;
  }

  await db.insertInto('systems').values({ id: systemId }).execute();

  await db
    .insertInto('system_links')
    .values([
      {
        id: randomUUID(),
        system_id: systemId,
        kind: 'live',
        url: 'https://sentinel.example.com',
        position: 0,
      },
      {
        id: randomUUID(),
        system_id: systemId,
        kind: 'repository',
        url: 'https://github.com/example/sentinel',
        position: 1,
      },
      {
        id: randomUUID(),
        system_id: systemId,
        kind: 'documentation',
        url: 'https://docs.example.com/sentinel',
        position: 2,
      },
    ])
    .execute();

  const links = await db
    .selectFrom('system_links')
    .select(['kind', 'url', 'position'])
    .where('system_id', '=', systemId)
    .orderBy('position')
    .execute();

  assert.deepEqual(
    links.map(({ kind, position }) => ({ kind, position })),
    [
      { kind: 'live', position: 0 },
      { kind: 'repository', position: 1 },
      { kind: 'documentation', position: 2 },
    ],
  );

  await expectPostgresError(
    '23514',
    'system_links_kind_check',
    () =>
      sql`
        insert into system_links (id, system_id, kind, url, position)
        values (
          ${randomUUID()}::uuid,
          ${systemId}::uuid,
          'social',
          'https://example.com',
          3
        )
      `.execute(db),
  );

  await expectPostgresError(
    '23514',
    'system_links_url_check',
    () =>
      sql`
        insert into system_links (id, system_id, kind, url, position)
        values (
          ${randomUUID()}::uuid,
          ${systemId}::uuid,
          'demo',
          'javascript:alert(1)',
          3
        )
      `.execute(db),
  );

  await expectPostgresError(
    '23514',
    'system_links_position_check',
    () =>
      sql`
        insert into system_links (id, system_id, kind, url, position)
        values (
          ${randomUUID()}::uuid,
          ${systemId}::uuid,
          'demo',
          'https://demo.example.com',
          -1
        )
      `.execute(db),
  );

  await expectPostgresError(
    '23505',
    'system_links_system_position_key',
    () =>
      db
        .insertInto('system_links')
        .values({
          id: randomUUID(),
          system_id: systemId,
          kind: 'demo',
          url: 'https://demo.example.com',
          position: 1,
        })
        .execute(),
  );

  await expectPostgresError(
    '23505',
    'system_links_system_kind_url_key',
    () =>
      db
        .insertInto('system_links')
        .values({
          id: randomUUID(),
          system_id: systemId,
          kind: 'live',
          url: 'https://sentinel.example.com',
          position: 3,
        })
        .execute(),
  );

  await db.deleteFrom('systems').where('id', '=', systemId).execute();

  const remaining = await db
    .selectFrom('system_links')
    .select(({ fn }) => fn.countAll<number>().as('count'))
    .where('system_id', '=', systemId)
    .executeTakeFirstOrThrow();

  assert.equal(Number(remaining.count), 0);

  process.stdout.write(
    'System link verification passed: typed kinds, HTTP(S) URL validation, stable order, duplicate protection, and cascade deletion are enforced.\n',
  );
} finally {
  await db.deleteFrom('systems').where('id', '=', systemId).execute();
  await db.destroy();
}
