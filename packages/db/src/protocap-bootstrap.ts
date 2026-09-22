import { randomUUID } from 'node:crypto';

import type { Kysely, Transaction } from 'kysely';

import { publishSystemLocalization } from './system-publication.js';
import type { Database } from './schema.js';

export interface ProtoCapMediaInput {
  id: string;
  storageKey: string;
  originalFilename: string;
  mimeType: 'image/png';
  byteSize: number;
  width?: number;
  height?: number;
}

export interface BootstrapProtoCapInput {
  media: ProtoCapMediaInput;
}

export interface BootstrapProtoCapResult {
  created: boolean;
  systemId: string;
}

const technologyNames = [
  ['typescript', 'TypeScript'],
  ['react', 'React'],
  ['vite', 'Vite'],
  ['express', 'Express'],
  ['node-js', 'Node.js'],
  ['playwright', 'Playwright'],
  ['vitest', 'Vitest'],
  ['tailwind-css', 'Tailwind CSS'],
] as const;

const englishPresentation = {
  version: 1 as const,
  blocks: [
    {
      type: 'paragraph' as const,
      text: 'ProtoCap is an engineering portfolio and interactive demonstrator for industrial operations. It explores guided work, local traceability, logistics workflows, packaging calculations and bounded AI-assisted decision support.',
    },
    {
      type: 'image' as const,
      assetId: '__MEDIA_ASSET_ID__',
    },
    {
      type: 'heading' as const,
      level: 2 as const,
      text: 'What is implemented',
      evidenceStatus: 'implemented' as const,
    },
    {
      type: 'list' as const,
      style: 'unordered' as const,
      items: [
        'ShiftGuide: protected operator guidance with an isolated synthetic public-demo profile.',
        'Celine: authenticated server-mediated AI guidance where server-owned contracts remain authoritative.',
        'Expiry Check, Logistics Call and Packing Calculator: browser-local interactive demonstrations.',
        'LinePulse: operational-visibility concept driven by static mock data.',
      ],
    },
    {
      type: 'heading' as const,
      level: 2 as const,
      text: 'Evidence boundaries',
      evidenceStatus: 'boundary' as const,
    },
    {
      type: 'list' as const,
      style: 'unordered' as const,
      items: [
        'Public demonstration data is fictitious.',
        'The project is not evidence of an industrial deployment or measured business impact.',
        'Browser-local demonstrations are not shared multi-user systems or transactional backends.',
        'ShiftGuide sessions, rate limits and provider context are process-local in the current single-replica demonstrator.',
        'Server-dependent ShiftGuide and Celine behavior requires network access; the application is not fully offline.',
      ],
    },
    {
      type: 'heading' as const,
      level: 2 as const,
      text: 'Hypotheses',
      evidenceStatus: 'hypothesis' as const,
    },
    {
      type: 'paragraph' as const,
      text: 'Operational value, time savings, productivity gains and adoption outcomes remain evaluation hypotheses unless a measured result is explicitly identified.',
    },
    {
      type: 'heading' as const,
      level: 2 as const,
      text: 'Future integrations',
      evidenceStatus: 'future_integration' as const,
    },
    {
      type: 'paragraph' as const,
      text: 'Live plant feeds, shared transactional backends, enterprise document systems, durable distributed sessions and other production integrations are future work rather than current ProtoCap behavior.',
    },
    {
      type: 'quote' as const,
      text: 'The repository distinguishes implemented behavior, synthetic demonstration, browser-local state, protected runtime configuration and future operational integrations.',
      attribution: 'ProtoCap repository',
    },
  ],
};

const frenchPresentation = {
  version: 1 as const,
  blocks: [
    {
      type: 'paragraph' as const,
      text: 'ProtoCap est un portfolio d ingenierie et un demonstrateur interactif pour les operations industrielles. Il explore le guidage terrain, la tracabilite locale, les flux logistiques, les calculs de conditionnement et une aide a la decision assistee par IA dans un cadre borne.',
    },
    {
      type: 'image' as const,
      assetId: '__MEDIA_ASSET_ID__',
    },
    {
      type: 'heading' as const,
      level: 2 as const,
      text: 'Ce qui est implemente',
      evidenceStatus: 'implemented' as const,
    },
    {
      type: 'list' as const,
      style: 'unordered' as const,
      items: [
        'ShiftGuide : guidage operateur protege avec un profil de demonstration publique synthetique et isole.',
        'Celine : assistance IA mediee par le serveur, avec des contrats detenus par le serveur comme autorite.',
        'Expiry Check, Logistics Call et Packing Calculator : demonstrations interactives a etat local navigateur.',
        'LinePulse : concept de visibilite operationnelle alimente par des donnees fictives statiques.',
      ],
    },
    {
      type: 'heading' as const,
      level: 2 as const,
      text: 'Limites et preuves',
      evidenceStatus: 'boundary' as const,
    },
    {
      type: 'list' as const,
      style: 'unordered' as const,
      items: [
        'Les donnees publiques de demonstration sont fictives.',
        'Le projet ne constitue pas la preuve d un deploiement industriel ni d un impact metier mesure.',
        'Les demonstrations locales au navigateur ne sont ni multi-utilisateurs ni des backends transactionnels.',
        'Les sessions ShiftGuide, limites de debit et contextes fournisseur sont locaux au processus dans le demonstrateur actuel a une seule replique.',
        'Les fonctions ShiftGuide et Celine dependantes du serveur necessitent le reseau ; l application n est pas entierement hors ligne.',
      ],
    },
    {
      type: 'heading' as const,
      level: 2 as const,
      text: 'Hypothèses',
      evidenceStatus: 'hypothesis' as const,
    },
    {
      type: 'paragraph' as const,
      text: 'La valeur operationnelle, les gains de temps, de productivite et d adoption restent des hypotheses d evaluation sauf lorsqu un resultat mesure est explicitement identifie.',
    },
    {
      type: 'heading' as const,
      level: 2 as const,
      text: 'Intégrations futures',
      evidenceStatus: 'future_integration' as const,
    },
    {
      type: 'paragraph' as const,
      text: 'Les flux usine en direct, les backends transactionnels partages, les systemes documentaires d entreprise, les sessions distribuees durables et les autres integrations de production relevent de travaux futurs.',
    },
    {
      type: 'quote' as const,
      text: 'Le depot distingue le comportement implemente, la demonstration synthetique, l etat local navigateur, la configuration protegee et les integrations operationnelles futures.',
      attribution: 'Depot ProtoCap',
    },
  ],
};

async function ensureTechnology(
  db: Transaction<Database>,
  slug: string,
  name: string,
): Promise<string> {
  const existing = await db
    .selectFrom('technologies')
    .select('id')
    .where('slug', '=', slug)
    .executeTakeFirst();

  if (existing !== undefined) {
    return existing.id;
  }

  const id = randomUUID();
  await db
    .insertInto('technologies')
    .values({ id, slug, name })
    .execute();

  return id;
}

export async function bootstrapProtoCapDomain(
  db: Kysely<Database>,
  input: BootstrapProtoCapInput,
): Promise<BootstrapProtoCapResult> {
  const existing = await db
    .selectFrom('system_localizations')
    .select('system_id')
    .where('locale', '=', 'en')
    .where('slug', '=', 'protocap')
    .executeTakeFirst();

  if (existing !== undefined) {
    return { created: false, systemId: existing.system_id };
  }

  const systemId = randomUUID();
  const experienceId = randomUUID();
  const publishedAt = new Date();

  await db.transaction().execute(async (transaction) => {
    const maxPosition = await transaction
      .selectFrom('systems')
      .select(({ fn }) => fn.max<number>('editorial_position').as('max_position'))
      .executeTakeFirst();

    await transaction
      .insertInto('systems')
      .values({
        id: systemId,
        presentation_kind: 'guided_demo',
        editorial_position: (maxPosition?.max_position ?? -1) + 1,
        featured: false,
      })
      .execute();

    await transaction
      .insertInto('system_localizations')
      .values([
        {
          system_id: systemId,
          locale: 'en',
          slug: 'protocap',
          title: 'ProtoCap',
          summary:
            'Interactive engineering demonstrator for industrial operations, combining browser-local prototypes with a protected guided-work boundary.',
          proof_role: "Engineering portfolio and industrial-operations demonstrator",
          proof_maturity: "Inspectable demonstrator with implemented browser and protected server paths",
          proof_demo_nature: "Isolated public demo plus protected guided-work surfaces",
          proof_data_nature: "Synthetic demonstration data; no claim of live plant data",
          proof_limits: "No industrial deployment, measured business impact, shared transactional backend, or fully offline operation is claimed.",
          presentation_document: {
            ...englishPresentation,
            blocks: englishPresentation.blocks.map((block) =>
              block.type === 'image'
                ? { ...block, assetId: input.media.id }
                : block,
            ),
          },
          editorial_state: 'published',
          published_at: publishedAt,
        },
        {
          system_id: systemId,
          locale: 'fr',
          slug: 'protocap',
          title: 'ProtoCap',
          summary:
            'Demonstrateur d ingenierie interactif pour les operations industrielles, combinant des prototypes locaux au navigateur et un espace de guidage protege.',
          proof_role: "Portfolio d ingénierie et démonstrateur pour opérations industrielles",
          proof_maturity: "Démonstrateur inspectable avec parcours navigateur et serveur protégés implémentés",
          proof_demo_nature: "Démo publique isolée et surfaces de guidage protégées",
          proof_data_nature: "Données de démonstration synthétiques ; aucune donnée usine temps réel revendiquée",
          proof_limits: "Aucun déploiement industriel, impact métier mesuré, backend transactionnel partagé ou fonctionnement entièrement hors ligne n est revendiqué.",
          presentation_document: {
            ...frenchPresentation,
            blocks: frenchPresentation.blocks.map((block) =>
              block.type === 'image'
                ? { ...block, assetId: input.media.id }
                : block,
            ),
          },
          editorial_state: 'published',
          published_at: publishedAt,
        },
      ])
      .execute();

    const technologyIds = [];
    for (const [slug, name] of technologyNames) {
      technologyIds.push(await ensureTechnology(transaction, slug, name));
    }

    await transaction
      .insertInto('system_technologies')
      .values(
        technologyIds.map((technologyId, position) => ({
          system_id: systemId,
          technology_id: technologyId,
          position,
        })),
      )
      .execute();

    await transaction
      .insertInto('experiences')
      .values({ id: experienceId })
      .execute();

    await transaction
      .insertInto('experience_localizations')
      .values([
        {
          experience_id: experienceId,
          locale: 'en',
          title: "L'Oreal / La Roche-Posay",
          summary:
            'Industrial operations context that informed the problems explored through ProtoCap.',
        },
        {
          experience_id: experienceId,
          locale: 'fr',
          title: "L'Oreal / La Roche-Posay",
          summary:
            'Contexte d operations industrielles ayant nourri les problemes explores avec ProtoCap.',
        },
      ])
      .execute();

    await transaction
      .insertInto('system_experiences')
      .values({
        system_id: systemId,
        experience_id: experienceId,
        relation_kind: 'origin_context',
      })
      .execute();

    await transaction
      .insertInto('system_links')
      .values([
        {
          id: randomUUID(),
          system_id: systemId,
          kind: 'live',
          url: 'https://protocap-production.up.railway.app/',
          position: 0,
        },
        {
          id: randomUUID(),
          system_id: systemId,
          kind: 'demo',
          url: 'https://protocap-demo-production.up.railway.app/demo',
          position: 1,
        },
        {
          id: randomUUID(),
          system_id: systemId,
          kind: 'repository',
          url: 'https://github.com/AmineAKIK/protocap',
          position: 2,
        },
        {
          id: randomUUID(),
          system_id: systemId,
          kind: 'documentation',
          url: 'https://github.com/AmineAKIK/protocap/blob/main/docs/product-boundaries.md',
          position: 3,
        },
      ])
      .execute();

    await transaction
      .insertInto('assets')
      .values({
        id: input.media.id,
        storage_key: input.media.storageKey,
        original_filename: input.media.originalFilename,
        mime_type: input.media.mimeType,
        byte_size: input.media.byteSize,
        width: input.media.width ?? null,
        height: input.media.height ?? null,
      })
      .execute();

    await transaction
      .insertInto('asset_localizations')
      .values([
        {
          asset_id: input.media.id,
          locale: 'en',
          alt_text: 'ProtoCap essay cover used as reference media',
          caption:
            'Reference media from the ProtoCap repository; the public demonstrator remains the primary inspectable artifact.',
        },
        {
          asset_id: input.media.id,
          locale: 'fr',
          alt_text: 'Couverture d essai ProtoCap utilisee comme media de reference',
          caption:
            'Media de reference issu du depot ProtoCap ; le demonstrateur public reste l artefact principal a inspecter.',
        },
      ])
      .execute();

    await transaction
      .insertInto('system_assets')
      .values({
        system_id: systemId,
        asset_id: input.media.id,
        position: 0,
      })
      .execute();
  });

  await publishSystemLocalization(db, { systemId, locale: 'en', now: publishedAt });
  await publishSystemLocalization(db, { systemId, locale: 'fr', now: publishedAt });

  return { created: true, systemId };
}
