import type { PlatformLocale } from '@akiksystems/core';
import type { Kysely } from 'kysely';

import type { Database } from './schema.js';
import {
  listPublishedSystemReferences,
  type PublicSystemReference,
} from './system-reference.js';

export const workWithUsProofSystemSlugs = ['protocap', 'tugeres'] as const;

export async function listWorkWithUsProofReferences(
  db: Kysely<Database>,
  locale: PlatformLocale,
): Promise<PublicSystemReference[]> {
  const published = await listPublishedSystemReferences(db, { locale });
  const bySlug = new Map(
    published.map((reference) => [reference.slug, reference] as const),
  );

  return workWithUsProofSystemSlugs.flatMap((slug) => {
    const reference = bySlug.get(slug);
    return reference === undefined ? [] : [reference];
  });
}
