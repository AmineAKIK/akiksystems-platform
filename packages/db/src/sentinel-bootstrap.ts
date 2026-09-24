import { randomUUID } from 'node:crypto';

import type { Kysely } from 'kysely';

import type { Database } from './schema.js';

export interface BootstrapSentinelSystemDraftResult {
  created: boolean;
  systemId: string;
  editorialPosition: number;
}

export async function bootstrapSentinelSystemDraft(
  db: Kysely<Database>,
): Promise<BootstrapSentinelSystemDraftResult> {
  const existing = await db
    .selectFrom('system_localizations')
    .innerJoin('systems', 'systems.id', 'system_localizations.system_id')
    .select([
      'system_localizations.system_id',
      'systems.editorial_position',
    ])
    .where('system_localizations.locale', '=', 'en')
    .where('system_localizations.slug', '=', 'sentinel')
    .executeTakeFirst();

  if (existing !== undefined) {
    return {
      created: false,
      systemId: existing.system_id,
      editorialPosition: existing.editorial_position,
    };
  }

  const systemId = randomUUID();

  return db.transaction().execute(async (transaction) => {
    const maxPosition = await transaction
      .selectFrom('systems')
      .select(({ fn }) =>
        fn.max<number>('editorial_position').as('max_position'),
      )
      .executeTakeFirst();

    const editorialPosition = (maxPosition?.max_position ?? -1) + 1;

    await transaction
      .insertInto('systems')
      .values({ id: systemId, editorial_position: editorialPosition })
      .execute();

    await transaction
      .insertInto('system_localizations')
      .values([
        {
          system_id: systemId,
          locale: 'en',
          slug: 'sentinel',
          title: 'Sentinel',
          summary: null,
          proof_role: 'Industrial-context software system',
          proof_maturity: 'Inspectable implementation',
          proof_demo_nature: 'No separate public demo',
          proof_data_nature: 'Real-world context; no customer data exposed',
          proof_limits:
            'Origin context alone is not evidence of current deployment or publicly exposed operational data.',
        },
        {
          system_id: systemId,
          locale: 'fr',
          slug: 'sentinel',
          title: 'Sentinel',
          summary: null,
          proof_role: 'Système logiciel issu d’un contexte industriel',
          proof_maturity: 'Implémentation inspectable',
          proof_demo_nature: 'Aucune démo publique séparée',
          proof_data_nature: 'Contexte réel ; aucune donnée client exposée',
          proof_limits:
            'Le contexte d’origine ne constitue pas à lui seul une preuve de déploiement actuel ou de données opérationnelles publiques.',
        },
      ])
      .execute();

    return {
      created: true,
      systemId,
      editorialPosition,
    };
  });
}
