import type { PlatformLocale } from '@akiksystems/core';
import type { Kysely } from 'kysely';

import type { Database } from './schema.js';
import {
  listPublishedSystemReferences,
  type PublicSystemReference,
} from './system-reference.js';

export async function listWorkWithUsProofReferences(
  db: Kysely<Database>,
  locale: PlatformLocale,
): Promise<PublicSystemReference[]> {
  const selected = await db
    .selectFrom('work_with_us_systems')
    .innerJoin(
      'work_with_us_pages',
      'work_with_us_pages.id',
      'work_with_us_systems.page_id',
    )
    .select(['work_with_us_systems.system_id', 'work_with_us_systems.position'])
    .where('work_with_us_pages.singleton_key', '=', 'public')
    .orderBy('work_with_us_systems.position')
    .execute();

  if (selected.length === 0) return [];

  const published = await listPublishedSystemReferences(db, {
    locale,
    ids: selected.map(({ system_id }) => system_id),
  });
  const publishedById = new Map(
    published.map((reference) => [reference.id, reference] as const),
  );

  return selected.flatMap(({ system_id }) => {
    const reference = publishedById.get(system_id);
    return reference === undefined ? [] : [reference];
  });
}
