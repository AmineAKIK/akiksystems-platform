import { randomUUID } from 'node:crypto';

import type { Kysely, Transaction } from 'kysely';

import type { Database } from './schema.js';

export interface OriaMediaInput {
  id: string;
  storageKey: string;
  originalFilename: string;
  mimeType: 'image/webp';
  byteSize: number;
}

export interface BootstrapOriaInput {
  media: OriaMediaInput;
}

export interface BootstrapOriaResult {
  created: boolean;
  systemId: string;
}

const technologyNames = [
  ['typescript', 'TypeScript'],
  ['react', 'React'],
  ['vite', 'Vite'],
  ['react-router', 'React Router'],
  ['playwright', 'Playwright'],
  ['tailwind-css', 'Tailwind CSS'],
  ['pwa', 'Progressive Web App'],
] as const;

const englishPresentation = {
  version: 1 as const,
  blocks: [
    {
      type: 'paragraph' as const,
      text: 'Oria Nutrition is a deliberately non-industrial portfolio product: an accessible React and TypeScript PWA exploring nutrition coaching around atypical schedules through editorial content, practical tools and a simulated client space.',
    },
    {
      type: 'image' as const,
      assetId: '__MEDIA_ASSET_ID__',
    },
    {
      type: 'heading' as const,
      level: 2 as const,
      text: 'Capabilities',
    },
    {
      type: 'list' as const,
      style: 'unordered' as const,
      items: [
        'Responsive editorial product surfaces with reusable layout and UI primitives.',
        'Accessible navigation, dialogs, accordions, focus management and reduced-motion behavior.',
        'PWA install support with manifest, icons and generated service worker.',
        'Orientation quiz, recipe and article filtering, sleep estimator and a simulated client space.',
        'Route-level lazy loading, optimized editorial media and explicit performance budgets.',
        'Automated formatting, linting, dead-code analysis, strict typing, browser tests and axe accessibility checks.',
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
        'The brand, practitioner identity, contact details, prices and client data are fictional portfolio material.',
        'No real client data is processed by the application.',
        'The client space is simulated; there is no production booking, contact or authentication backend.',
        'Health content stays within general wellbeing and organization guidance and does not claim diagnosis, treatment or individualized medical advice.',
        'The public release is intentionally not search-indexed and should not be read as an operating nutrition practice.',
      ],
    },
    {
      type: 'heading' as const,
      level: 2 as const,
      text: 'Measured engineering evidence',
    },
    {
      type: 'list' as const,
      style: 'unordered' as const,
      items: [
        'Initial JavaScript entry reduced from 98.55 KiB gzip to 86.03 KiB gzip.',
        'Editorial image set reduced from 4.83 MB to 1.86 MB.',
        'Regression budgets enforce 90 KiB gzip for the initial JavaScript entry and 225 KiB per editorial WebP asset.',
      ],
    },
    {
      type: 'quote' as const,
      text: 'The project is published as a portfolio demonstration, not as a live nutrition practice.',
      attribution: 'Oria Nutrition repository',
    },
  ],
};

const frenchPresentation = {
  version: 1 as const,
  blocks: [
    {
      type: 'paragraph' as const,
      text: 'Oria Nutrition est volontairement non industriel : une PWA portfolio accessible en React et TypeScript qui explore l accompagnement nutritionnel autour des rythmes atypiques via des contenus editoriaux, des outils pratiques et un espace client simule.',
    },
    {
      type: 'image' as const,
      assetId: '__MEDIA_ASSET_ID__',
    },
    {
      type: 'heading' as const,
      level: 2 as const,
      text: 'Capacités',
    },
    {
      type: 'list' as const,
      style: 'unordered' as const,
      items: [
        'Surfaces editoriales responsives avec primitives de mise en page et d interface reutilisables.',
        'Navigation accessible, dialogues, accordéons, gestion du focus et comportement reduced-motion.',
        'Installation PWA avec manifest, icones et service worker genere.',
        'Quiz d orientation, filtrage recettes/articles, estimateur de sommeil et espace client simule.',
        'Chargement paresseux par route, medias editoriaux optimises et budgets de performance explicites.',
        'Formatage, lint, analyse de code mort, typage strict, tests navigateur et controles axe automatises.',
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
        'La marque, l identite de praticien, les coordonnees, les prix et les donnees client sont fictifs et destines au portfolio.',
        'Aucune donnee de client reel n est traitee par l application.',
        'L espace client est simule ; il n existe pas de backend de reservation, contact ou authentification en production.',
        'Le contenu sante reste du conseil general de bien-etre et d organisation et ne pretend ni diagnostiquer, ni traiter, ni fournir un avis medical individualise.',
        'La version publique est volontairement non indexee et ne doit pas etre lue comme un cabinet de nutrition en activite.',
      ],
    },
    {
      type: 'heading' as const,
      level: 2 as const,
      text: 'Preuves d ingénierie mesurées',
    },
    {
      type: 'list' as const,
      style: 'unordered' as const,
      items: [
        'Entree JavaScript initiale reduite de 98,55 Kio gzip a 86,03 Kio gzip.',
        'Ensemble d images editoriales reduit de 4,83 Mo a 1,86 Mo.',
        'Budgets de regression a 90 Kio gzip pour l entree JavaScript initiale et 225 Kio par image WebP editoriale.',
      ],
    },
    {
      type: 'quote' as const,
      text: 'Le projet est publie comme demonstration portfolio, pas comme cabinet de nutrition en activite.',
      attribution: 'Depot Oria Nutrition',
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

export async function bootstrapOriaDomain(
  db: Kysely<Database>,
  input: BootstrapOriaInput,
): Promise<BootstrapOriaResult> {
  const existing = await db
    .selectFrom('system_localizations')
    .select('system_id')
    .where('locale', '=', 'en')
    .where('slug', '=', 'oria-nutrition')
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
        presentation_kind: 'interactive_entry',
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
          slug: 'oria-nutrition',
          title: 'Oria Nutrition',
          summary:
            'Accessible nutrition-coaching PWA portfolio for atypical schedules, with fictional product data, practical tools and a simulated client space.',
          proof_role: "Accessible non-industrial nutrition-coaching portfolio application",
          proof_maturity: "Public portfolio PWA with simulated product flows",
          proof_demo_nature: "The public application is itself the portfolio demonstration",
          proof_data_nature: "Fictional practitioner, pricing, contact and client data; no real client data",
          proof_limits: "Not an operating nutrition practice, medical service, production booking system, or real authenticated client backend.",
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
          slug: 'oria-nutrition',
          title: 'Oria Nutrition',
          summary:
            'PWA portfolio accessible autour de la nutrition et des rythmes atypiques, avec donnees fictives, outils pratiques et espace client simule.',
          proof_role: "Application portfolio accessible et non industrielle autour de la nutrition",
          proof_maturity: "PWA portfolio publique avec parcours produit simulés",
          proof_demo_nature: "L application publique constitue elle-même la démonstration portfolio",
          proof_data_nature: "Identité praticien, tarifs, contacts et données client fictifs ; aucune donnée client réelle",
          proof_limits: "Ce n est ni un cabinet de nutrition en activité, ni un service médical, ni un système de réservation ou backend client réel.",
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
      .insertInto('system_links')
      .values([
        {
          id: randomUUID(),
          system_id: systemId,
          kind: 'live',
          url: 'https://amineakik.github.io/orianutrition/',
          position: 0,
        },
        {
          id: randomUUID(),
          system_id: systemId,
          kind: 'repository',
          url: 'https://github.com/AmineAKIK/orianutrition',
          position: 1,
        },
        {
          id: randomUUID(),
          system_id: systemId,
          kind: 'documentation',
          url: 'https://github.com/AmineAKIK/orianutrition/blob/main/docs/case-study.md',
          position: 2,
        },
        {
          id: randomUUID(),
          system_id: systemId,
          kind: 'documentation',
          url: 'https://github.com/AmineAKIK/orianutrition/blob/main/docs/content-provenance.md',
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
      })
      .execute();

    await transaction
      .insertInto('asset_localizations')
      .values([
        {
          asset_id: input.media.id,
          locale: 'en',
          alt_text: 'Oria Nutrition editorial image showing a food composition',
          caption:
            'Original portfolio media from the Oria Nutrition repository; no real client material is used.',
        },
        {
          asset_id: input.media.id,
          locale: 'fr',
          alt_text: 'Image editoriale Oria Nutrition montrant une composition alimentaire',
          caption:
            'Media portfolio original issu du depot Oria Nutrition ; aucun contenu de client reel n est utilise.',
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
