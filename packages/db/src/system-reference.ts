import type { PlatformLocale } from '@akiksystems/core';
import type { Kysely } from 'kysely';

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
    .selectFrom('systems')
    .innerJoin(
      'system_localizations',
      'system_localizations.system_id',
      'systems.id',
    )
    .select([
      'systems.id',
      'systems.editorial_position',
      'system_localizations.slug',
      'system_localizations.title',
      'system_localizations.summary',
      'system_localizations.proof_role',
      'system_localizations.proof_maturity',
      'system_localizations.proof_demo_nature',
      'system_localizations.proof_data_nature',
      'system_localizations.proof_limits',
    ])
    .where('systems.lifecycle', '=', 'active')
    .where('system_localizations.locale', '=', input.locale)
    .where('system_localizations.editorial_state', '=', 'published')
    .where('system_localizations.published_at', 'is not', null)
    .where('system_localizations.presentation_document', 'is not', null)
    .where('system_localizations.slug', 'is not', null)
    .where('system_localizations.title', 'is not', null)
    .where('system_localizations.summary', 'is not', null)
    .where('system_localizations.proof_role', 'is not', null)
    .where('system_localizations.proof_maturity', 'is not', null)
    .where('system_localizations.proof_demo_nature', 'is not', null)
    .where('system_localizations.proof_data_nature', 'is not', null)
    .where('system_localizations.proof_limits', 'is not', null);

  if (input.ids !== undefined) {
    if (input.ids.length === 0) {
      return [];
    }
    query = query.where('systems.id', 'in', input.ids);
  }

  query = query
    .orderBy('systems.editorial_position')
    .orderBy('systems.created_at')
    .orderBy('systems.id');

  if (input.limit !== undefined) {
    query = query.limit(input.limit);
  }

  const rows = await query.execute();

  return rows.flatMap((row) => {
    if (
      row.slug === null ||
      row.title === null ||
      row.summary === null ||
      row.proof_role === null ||
      row.proof_maturity === null ||
      row.proof_demo_nature === null ||
      row.proof_data_nature === null ||
      row.proof_limits === null
    ) {
      return [];
    }

    return [
      {
        id: row.id,
        locale: input.locale,
        slug: row.slug,
        title: row.title,
        summary: row.summary,
        href: systemReferenceHref(input.locale, row.slug),
        proofTransparency: {
          role: row.proof_role,
          maturity: row.proof_maturity,
          demoNature: row.proof_demo_nature,
          dataNature: row.proof_data_nature,
          limits: row.proof_limits,
        },
      },
    ];
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
