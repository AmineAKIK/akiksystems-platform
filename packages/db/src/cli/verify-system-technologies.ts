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

  const error = postgresError(caught);
  assert.equal(error.code, expectedCode);
  assert.equal(error.constraint, expectedConstraint);
}

const db = createDatabase(databaseUrlFromEnv());
const firstSystemId = randomUUID();
const secondSystemId = randomUUID();
const reactId = randomUUID();
const typescriptId = randomUUID();
const nodeId = randomUUID();
const duplicateSlugId = randomUUID();

try {
  const migrationResult = await createMigrator(db).migrateToLatest();
  reportMigrationResults(migrationResult.results);

  if (migrationResult.error !== undefined) {
    throw migrationResult.error;
  }

  await db
    .insertInto('systems')
    .values([
      { id: firstSystemId, editorial_position: 0 },
      { id: secondSystemId, editorial_position: 1 },
    ])
    .execute();

  await db
    .insertInto('technologies')
    .values([
      { id: reactId, slug: 'react', name: 'React' },
      { id: typescriptId, slug: 'typescript', name: 'TypeScript' },
      { id: nodeId, slug: 'nodejs', name: 'Node.js' },
    ])
    .execute();

  await db
    .insertInto('system_technologies')
    .values([
      {
        system_id: firstSystemId,
        technology_id: typescriptId,
        position: 1,
      },
      {
        system_id: firstSystemId,
        technology_id: reactId,
        position: 0,
      },
      {
        system_id: secondSystemId,
        technology_id: reactId,
        position: 0,
      },
    ])
    .execute();

  const ordered = await db
    .selectFrom('system_technologies')
    .innerJoin(
      'technologies',
      'technologies.id',
      'system_technologies.technology_id',
    )
    .select(['technologies.slug', 'system_technologies.position'])
    .where('system_technologies.system_id', '=', firstSystemId)
    .orderBy('system_technologies.position')
    .execute();

  assert.deepEqual(
    ordered.map(({ slug, position }) => ({ slug, position })),
    [
      { slug: 'react', position: 0 },
      { slug: 'typescript', position: 1 },
    ],
  );

  await expectPostgresError(
    '23505',
    'technologies_slug_key',
    () =>
      db
        .insertInto('technologies')
        .values({
          id: duplicateSlugId,
          slug: 'react',
          name: 'React duplicate',
        })
        .execute(),
  );

  await expectPostgresError(
    '23505',
    'system_technologies_pkey',
    () =>
      db
        .insertInto('system_technologies')
        .values({
          system_id: firstSystemId,
          technology_id: reactId,
          position: 2,
        })
        .execute(),
  );

  await expectPostgresError(
    '23505',
    'system_technologies_system_position_key',
    () =>
      db
        .insertInto('system_technologies')
        .values({
          system_id: firstSystemId,
          technology_id: nodeId,
          position: 1,
        })
        .execute(),
  );

  await expectPostgresError(
    '23514',
    'system_technologies_position_check',
    () =>
      sql`
        insert into system_technologies (
          system_id,
          technology_id,
          position
        ) values (
          ${secondSystemId}::uuid,
          ${typescriptId}::uuid,
          -1
        )
      `.execute(db),
  );

  await db.deleteFrom('technologies').where('id', '=', reactId).execute();

  const relationsAfterTechnologyDelete = await db
    .selectFrom('system_technologies')
    .select(({ fn }) => fn.countAll<number>().as('count'))
    .where('technology_id', '=', reactId)
    .executeTakeFirstOrThrow();

  assert.equal(Number(relationsAfterTechnologyDelete.count), 0);

  await db.deleteFrom('systems').where('id', '=', firstSystemId).execute();

  const relationsAfterSystemDelete = await db
    .selectFrom('system_technologies')
    .select(({ fn }) => fn.countAll<number>().as('count'))
    .where('system_id', '=', firstSystemId)
    .executeTakeFirstOrThrow();

  assert.equal(Number(relationsAfterSystemDelete.count), 0);

  process.stdout.write(
    'Technology relation verification passed: typed entities, reusable N-N relations, explicit ordering, uniqueness, validation, and cascades are enforced.\n',
  );
} finally {
  await db
    .deleteFrom('system_technologies')
    .where('system_id', 'in', [firstSystemId, secondSystemId])
    .execute();
  await db
    .deleteFrom('systems')
    .where('id', 'in', [firstSystemId, secondSystemId])
    .execute();
  await db
    .deleteFrom('technologies')
    .where('id', 'in', [reactId, typescriptId, nodeId, duplicateSlugId])
    .execute();
  await db.destroy();
}
