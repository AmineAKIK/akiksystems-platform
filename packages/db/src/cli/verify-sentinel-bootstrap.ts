import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { bootstrapSentinelSystemDraft } from '../sentinel-bootstrap.js';
import { createDatabase } from '../database.js';
import { databaseUrlFromEnv } from './env.js';

const db = createDatabase(databaseUrlFromEnv());
const referenceId = randomUUID();
let createdSentinelId: string | null = null;

try {
  const existingSentinel = await db
    .selectFrom('system_localizations')
    .select('system_id')
    .where('locale', '=', 'en')
    .where('slug', '=', 'sentinel')
    .executeTakeFirst();

  assert.equal(
    existingSentinel,
    undefined,
    'Sentinel bootstrap qualification requires no pre-existing Sentinel.',
  );

  const maxPosition = await db
    .selectFrom('systems')
    .select(({ fn }) => fn.max<number>('editorial_position').as('max_position'))
    .executeTakeFirst();
  const referencePosition = (maxPosition?.max_position ?? -1) + 1;

  await db.transaction().execute(async (transaction) => {
    await transaction
      .insertInto('systems')
      .values({ id: referenceId, editorial_position: referencePosition })
      .execute();

    await transaction
      .insertInto('system_localizations')
      .values({
        system_id: referenceId,
        locale: 'en',
        slug: 'qualification-system-before-sentinel',
        title: 'Qualification System',
      })
      .execute();
  });

  const first = await bootstrapSentinelSystemDraft(db);
  createdSentinelId = first.systemId;
  assert.equal(first.created, true);
  assert.equal(first.editorialPosition, referencePosition + 1);

  const second = await bootstrapSentinelSystemDraft(db);
  assert.equal(second.created, false);
  assert.equal(second.systemId, first.systemId);
  assert.equal(second.editorialPosition, first.editorialPosition);

  const localizations = await db
    .selectFrom('system_localizations')
    .select(['locale', 'slug', 'title'])
    .where('system_id', '=', first.systemId)
    .orderBy('locale')
    .execute();

  assert.deepEqual(
    localizations.map(({ locale, slug, title }) => ({ locale, slug, title })),
    [
      { locale: 'en', slug: 'sentinel', title: 'Sentinel' },
      { locale: 'fr', slug: 'sentinel', title: 'Sentinel' },
    ],
  );

  process.stdout.write(
    'Sentinel bootstrap qualification passed: Sentinel remains creatable after existing Systems and the operation is idempotent.\n',
  );
} finally {
  if (createdSentinelId !== null) {
    await db.deleteFrom('systems').where('id', '=', createdSentinelId).execute();
  }
  await db.deleteFrom('systems').where('id', '=', referenceId).execute();
  await db.destroy();
}
