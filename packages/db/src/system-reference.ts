import type { PlatformLocale } from '@akiksystems/core';
import type { Kysely } from 'kysely';

import { parseSystemPublicationSnapshot } from './system-publication.js';
import type { Database } from './schema.js';

export interface PublicSystemReference {
  id: string;
  locale: PlatformLocale;
  slug: string;
  title: string;
  summary: string;
  href: string;
  proofTransparency: {
    role: string;
    maturity: string;
    demoNature: string;
    dataNature: string;
    limits: string;
  };
}

export interface ListPublishedSystemReferencesInput {
  locale: PlatformLocale;
  ids?: string[];
  limit?: number;
}

export function systemReferenceHref(
  locale: PlatformLocale,
  slug: string,
): string {
  return `/${locale}/systems/${slug}`;
}

export async function listPublishedSystemReferences(
  db: Kysely<Database>,
  input: ListPublishedSystemReferencesInput,
): Promise<PublicSystemReference[]> {
  let query = db
    .selectFrom('system_publications')
    .innerJoin('systems', 'systems.id', 'system_publications.system_id')
    .select([
      'systems.id',
      'systems.editorial_position',
      'system_publications.snapshot',
    ])
    .where('systems.lifecycle', '=', 'active')
    .where('system_publications.locale', '=', input.locale);

  if (input.ids !== undefined) {
    if (input.ids.length === 0) return [];
    query = query.where('systems.id', 'in', input.ids);
  }

  query = query
    .orderBy('systems.editorial_position')
    .orderBy('systems.created_at')
    .orderBy('systems.id');

  if (input.limit !== undefined) query = query.limit(input.limit);

  const rows = await query.execute();

  return rows.flatMap((row) => {
    const snapshot = parseSystemPublicationSnapshot(row.snapshot);
    if (snapshot === null) return [];

    return [{
      id: row.id,
      locale: input.locale,
      slug: snapshot.slug,
      title: snapshot.title,
      summary: snapshot.summary,
      href: systemReferenceHref(input.locale, snapshot.slug),
      proofTransparency: snapshot.proofTransparency,
    }];
  });
}

export async function getPublishedSystemReferenceById(
  db: Kysely<Database>,
  input: { locale: PlatformLocale; id: string },
): Promise<PublicSystemReference | null> {
  const [reference] = await listPublishedSystemReferences(db, {
    locale: input.locale,
    ids: [input.id],
    limit: 1,
  });
  return reference ?? null;
}
