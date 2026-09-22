import { randomUUID } from 'node:crypto';

import type { Kysely, Transaction } from 'kysely';

import type { Database } from './schema.js';

export interface TugeresMediaInput {
  id: string;
  storageKey: string;
  originalFilename: string;
  mimeType: 'image/webp';
  byteSize: number;
}

export interface BootstrapTugeresInput {
  media: TugeresMediaInput;
}

export interface BootstrapTugeresResult {
  created: boolean;
  systemId: string;
}

const technologyNames = [
  ['php', 'PHP'],
  ['mysql', 'MySQL'],
  ['docker', 'Docker'],
  ['bootstrap', 'Bootstrap'],
  ['stripe', 'Stripe'],
  ['brevo', 'Brevo'],
  ['cloudinary', 'Cloudinary'],
] as const;

const englishPresentation = {
  version: 1 as const,
  blocks: [
    {
      type: 'paragraph' as const,
      text: 'Tugères is a white-label catering management and ordering application published by AkikSystems. Its current operating model is one isolated instance per caterer, with separate application, MySQL database, configuration, domain and licence.',
    },
    {
      type: 'image' as const,
      assetId: '__MEDIA_ASSET_ID__',
    },
    {
      type: 'heading' as const,
      level: 2 as const,
      text: 'Current capabilities',
    },
    {
      type: 'list' as const,
      style: 'unordered' as const,
      items: [
        'Catering catalogue, ordering, capacity and availability controls.',
        'Stripe payments with durable attempts, authoritative webhook handling and reconciliation.',
        'Order lifecycle tracking, stock, recipes and inventory movement ledger.',
        'Quotes, invoices, deposits, credit notes, PDFs, email delivery and quote signatures.',
        'Accounting-style payment and refund ledger, statistics and exports.',
        'White-label configuration, signed licence entitlements, automated reminders and operational-data pruning.',
      ],
    },
    {
      type: 'heading' as const,
      level: 2 as const,
      text: 'Architecture evidence',
    },
    {
      type: 'list' as const,
      style: 'unordered' as const,
      items: [
        'PHP application with a custom MVC and service/domain-policy structure.',
        'MySQL 8 persistence through PDO.',
        'Docker/Apache production image with migrations applied before the web server starts.',
        'Readiness endpoint validates MySQL and the schema_migrations table.',
        'Brevo HTTP API for email, Stripe for payments, Dompdf for billing documents and Cloudinary recommended for durable business images.',
        'CI quality gate covers Composer validation/audit, PHP syntax, unit tests, PHPStan, style checks and production-image build.',
      ],
    },
    {
      type: 'heading' as const,
      level: 2 as const,
      text: 'Evidence boundaries',
    },
    {
      type: 'list' as const,
      style: 'unordered' as const,
      items: [
        'The repository documents an intended commercial operating model, but does not by itself prove a live customer deployment.',
        'A green CI run does not replace smoke tests on the actually deployed environment.',
        'Private billing-document persistence must be explicitly tested after redeployment before a professional pilot is considered ready.',
        'Backup is an operating responsibility and must not be described as tested until a real restore has been performed.',
        'The repository contains historical Vite & Gourmand documentation; the current Tugères runbook and current code are authoritative for operations.',
      ],
    },
    {
      type: 'quote' as const,
      text: 'A professional pilot is not considered ready until deployment, readiness, payments, private documents, email, licensing, backup and restore checks have been validated on the operated environment.',
      attribution: 'Tugères operations runbook',
    },
  ],
};

const frenchPresentation = {
  version: 1 as const,
  blocks: [
    {
      type: 'paragraph' as const,
      text: 'Tugères est une application white-label de gestion et de commande pour traiteurs éditée par AkikSystems. Son modèle d exploitation actuel privilégie une instance isolée par traiteur, avec application, base MySQL, configuration, domaine et licence séparés.',
    },
    {
      type: 'image' as const,
      assetId: '__MEDIA_ASSET_ID__',
    },
    {
      type: 'heading' as const,
      level: 2 as const,
      text: 'Capacités actuelles',
    },
    {
      type: 'list' as const,
      style: 'unordered' as const,
      items: [
        'Catalogue traiteur, commandes, contrôle de capacité et de disponibilité.',
        'Paiements Stripe avec tentative durable, webhook autoritaire et réconciliation.',
        'Suivi du cycle de commande, stock, recettes et ledger de mouvements.',
        'Devis, factures, acomptes, avoirs, PDF, envoi email et signature de devis.',
        'Ledger des paiements et remboursements, statistiques et exports.',
        'Configuration white-label, licences signées, rappels automatisables et purge de données opérationnelles.',
      ],
    },
    {
      type: 'heading' as const,
      level: 2 as const,
      text: 'Preuves d architecture',
    },
    {
      type: 'list' as const,
      style: 'unordered' as const,
      items: [
        'Application PHP structurée autour d un MVC maison et de services/politiques de domaine.',
        'Persistance MySQL 8 via PDO.',
        'Image de production Docker/Apache avec migrations exécutées avant le démarrage du serveur web.',
        'Endpoint readiness validant MySQL et la table schema_migrations.',
        'API HTTP Brevo pour les emails, Stripe pour les paiements, Dompdf pour les documents de facturation et Cloudinary recommandé pour les images métier durables.',
        'Quality Gate CI couvrant validation/audit Composer, syntaxe PHP, tests unitaires, PHPStan, style et build de l image de production.',
      ],
    },
    {
      type: 'heading' as const,
      level: 2 as const,
      text: 'Limites de preuve',
    },
    {
      type: 'list' as const,
      style: 'unordered' as const,
      items: [
        'Le dépôt décrit un modèle d exploitation commerciale visé, mais ne prouve pas à lui seul un déploiement client actif.',
        'Une CI verte ne remplace pas les smoke tests sur l environnement réellement déployé.',
        'La persistance des documents privés de facturation doit être testée après redéploiement avant de considérer un pilote professionnel comme prêt.',
        'La sauvegarde relève de l exploitation et ne doit pas être décrite comme testée tant qu une restauration réelle n a pas été effectuée.',
        'Le dépôt contient de la documentation historique Vite & Gourmand ; le runbook Tugères courant et le code actuel font autorité pour l exploitation.',
      ],
    },
    {
      type: 'quote' as const,
      text: 'Un pilote professionnel n est pas considéré prêt tant que le déploiement, la readiness, les paiements, les documents privés, l email, la licence, la sauvegarde et la restauration n ont pas été validés sur l environnement exploité.',
      attribution: 'Runbook d exploitation Tugères',
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
  await db.insertInto('technologies').values({ id, slug, name }).execute();
  return id;
}

export async function bootstrapTugeresDomain(
  db: Kysely<Database>,
  input: BootstrapTugeresInput,
): Promise<BootstrapTugeresResult> {
  const existing = await db
    .selectFrom('system_localizations')
    .select('system_id')
    .where('locale', '=', 'en')
    .where('slug', '=', 'tugeres')
    .executeTakeFirst();

  if (existing !== undefined) {
    return { created: false, systemId: existing.system_id };
  }

  const systemId = randomUUID();
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
        presentation_kind: 'standard',
        evidence_policy: 'documented_only',
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
          slug: 'tugeres',
          title: 'Tugères',
          summary:
            'White-label catering management and ordering system with an isolated per-caterer operating model, payments, billing, inventory and operational controls.',
          proof_role: "White-label catering management and ordering product system",
          proof_maturity: "Implemented and documented; active customer deployment not evidenced",
          proof_demo_nature: "No supportable public demo or live customer deployment is exposed",
          proof_data_nature: "Repository/reference data and documented operating model; no customer deployment data presented",
          proof_limits: "Repository and runbook evidence do not prove an active customer deployment, tested restore, or production pilot readiness.",
          presentation_document: {
            ...englishPresentation,
            blocks: englishPresentation.blocks.map((block) =>
              block.type === 'image' ? { ...block, assetId: input.media.id } : block,
            ),
          },
          editorial_state: 'published',
          published_at: publishedAt,
        },
        {
          system_id: systemId,
          locale: 'fr',
          slug: 'tugeres',
          title: 'Tugères',
          summary:
            'Système white-label de gestion et commande pour traiteurs, avec instances isolées, paiements, facturation, stock et contrôles d exploitation.',
          proof_role: "Système produit white-label de gestion et commande pour traiteurs",
          proof_maturity: "Implémenté et documenté ; déploiement client actif non prouvé",
          proof_demo_nature: "Aucune démo publique ou déploiement client live supportable n est exposé",
          proof_data_nature: "Données de référence du dépôt et modèle d exploitation documenté ; aucune donnée de déploiement client présentée",
          proof_limits: "Le dépôt et le runbook ne prouvent ni déploiement client actif, ni restauration testée, ni readiness d un pilote de production.",
          presentation_document: {
            ...frenchPresentation,
            blocks: frenchPresentation.blocks.map((block) =>
              block.type === 'image' ? { ...block, assetId: input.media.id } : block,
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
      .insertInto('system_links')
      .values([
        {
          id: randomUUID(),
          system_id: systemId,
          kind: 'repository',
          url: 'https://github.com/AmineAKIK/tugeres',
          position: 0,
        },
        {
          id: randomUUID(),
          system_id: systemId,
          kind: 'documentation',
          url: 'https://github.com/AmineAKIK/tugeres/blob/main/docs/tugeres-operations.md',
          position: 1,
        },
        {
          id: randomUUID(),
          system_id: systemId,
          kind: 'documentation',
          url: 'https://github.com/AmineAKIK/tugeres/blob/main/docs/guide-installation.md',
          position: 2,
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
      })
      .execute();

    await transaction
      .insertInto('asset_localizations')
      .values([
        {
          asset_id: input.media.id,
          locale: 'en',
          alt_text: 'Generic catering menu reference image from the Tugères repository',
          caption:
            'Reference media from the Tugères repository. It illustrates the product domain and is not evidence of a customer deployment.',
        },
        {
          asset_id: input.media.id,
          locale: 'fr',
          alt_text: 'Image de référence générique de menu traiteur issue du dépôt Tugères',
          caption:
            'Média de référence issu du dépôt Tugères. Il illustre le domaine produit et ne constitue pas une preuve de déploiement client.',
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

  return { created: true, systemId };
}
