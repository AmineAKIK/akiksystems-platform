import { randomUUID } from 'node:crypto';

import type { PlatformLocale } from '@akiksystems/core';
import type { Kysely } from 'kysely';

import {
  commercialPageLegacyCompatibility,
  parseCommercialPagePublicationSnapshot,
  patchCommercialPageLegacyCompatibility,
  publishCommercialPageLocalization,
} from './commercial-page.js';
import type { Database } from './schema.js';

interface OpenSituationsSeed {
  title: string;
  introduction: string;
  situationsTitle: string;
  situationsBody: string;
}

export const workWithUsOpenSituationsSeed: Record<
  PlatformLocale,
  OpenSituationsSeed
> = {
  en: {
    title: 'Start with the situation',
    introduction:
      'Whether you are acting for an organization or for yourself, you can begin with what is happening, what matters, and what you want to change. You do not need to translate it into a predefined service.',
    situationsTitle: 'You do not need a finished brief',
    situationsBody:
      'You can arrive with a problem you can name, something that feels stuck, an idea that is still vague, or simply a result you want to reach. Describe the situation in your own words. The first exchange is for understanding the context; framing comes later, with a human.',
  },
  fr: {
    title: 'Partir de la situation',
    introduction:
      'Que vous agissiez pour une organisation ou à titre personnel, vous pouvez commencer par ce qui se passe, ce qui compte et ce que vous voulez faire évoluer. Vous n’avez pas à traduire cela dans une prestation prédéfinie.',
    situationsTitle: 'Vous n’avez pas besoin d’un cahier des charges finalisé',
    situationsBody:
      'Vous pouvez venir avec un problème identifié, quelque chose qui bloque, une idée encore floue ou simplement un résultat que vous cherchez à atteindre. Décrivez la situation avec vos mots. Le premier échange sert à comprendre le contexte ; le cadrage vient ensuite, avec une personne.',
  },
};

export interface BootstrapWorkWithUsOpenSituationsResult {
  pageId: string;
  createdPage: boolean;
  publishedLocales: PlatformLocale[];
  preservedDraftLocales: PlatformLocale[];
}

export async function bootstrapWorkWithUsOpenSituations(
  db: Kysely<Database>,
): Promise<BootstrapWorkWithUsOpenSituationsResult> {
  let page = await db
    .selectFrom('work_with_us_pages')
    .select('id')
    .where('singleton_key', '=', 'public')
    .executeTakeFirst();

  let createdPage = false;
  if (page === undefined) {
    const id = randomUUID();
    await db
      .insertInto('work_with_us_pages')
      .values({ id, singleton_key: 'public' })
      .execute();
    page = { id };
    createdPage = true;
  }

  const publishedLocales: PlatformLocale[] = [];
  const preservedDraftLocales: PlatformLocale[] = [];

  for (const locale of ['en', 'fr'] as const) {
    const seed = workWithUsOpenSituationsSeed[locale];
    const localization = await db
      .selectFrom('work_with_us_localizations')
      .select([
        'title',
        'introduction',
        'situations_title',
        'situations_body',
        'editorial_state',
      ])
      .where('page_id', '=', page.id)
      .where('locale', '=', locale)
      .executeTakeFirst();
    const publication = await db
      .selectFrom('work_with_us_publications')
      .select('snapshot')
      .where('page_id', '=', page.id)
      .where('locale', '=', locale)
      .executeTakeFirst();

    const hadAuthoredSituations =
      localization !== undefined &&
      (localization.situations_title !== null ||
        localization.situations_body !== null);

    if (localization === undefined) {
      await db
        .insertInto('work_with_us_localizations')
        .values({
          page_id: page.id,
          locale,
          title: seed.title,
          introduction: seed.introduction,
          situations_title: seed.situationsTitle,
          situations_body: seed.situationsBody,
        })
        .execute();
    } else {
      const updates: {
        title?: string;
        introduction?: string;
        situations_title?: string;
        situations_body?: string;
      } = {};

      if (localization.title === null) updates.title = seed.title;
      if (localization.introduction === null) {
        updates.introduction = seed.introduction;
      }
      if (localization.situations_title === null) {
        updates.situations_title = seed.situationsTitle;
      }
      if (localization.situations_body === null) {
        updates.situations_body = seed.situationsBody;
      }

      if (Object.keys(updates).length > 0) {
        await db
          .updateTable('work_with_us_localizations')
          .set({ ...updates, updated_at: new Date() })
          .where('page_id', '=', page.id)
          .where('locale', '=', locale)
          .execute();
      }
    }

    if (publication === undefined) {
      await publishCommercialPageLocalization(db, page.id, locale);
      publishedLocales.push(locale);
      continue;
    }

    const published = parseCommercialPagePublicationSnapshot(
      publication.snapshot,
    );
    if (
      published === null ||
      commercialPageLegacyCompatibility(published).situationsTitle !== null ||
      commercialPageLegacyCompatibility(published).situationsBody !== null
    ) {
      continue;
    }

    if (hadAuthoredSituations) {
      preservedDraftLocales.push(locale);
      continue;
    }

    const now = new Date();
    await db
      .updateTable('work_with_us_publications')
      .set({
        snapshot: patchCommercialPageLegacyCompatibility(published, {
          situationsTitle: seed.situationsTitle,
          situationsBody: seed.situationsBody,
        }) as unknown as Record<string, unknown>,
        published_at: now,
        updated_at: now,
      })
      .where('page_id', '=', page.id)
      .where('locale', '=', locale)
      .execute();
    publishedLocales.push(locale);
  }

  return {
    pageId: page.id,
    createdPage,
    publishedLocales,
    preservedDraftLocales,
  };
}


interface WorkWithUsCapabilitiesSeed {
  capabilitiesTitle: string;
  capabilitiesBody: string;
}

export const workWithUsCapabilitiesSeed: Record<
  PlatformLocale,
  WorkWithUsCapabilitiesSeed
> = {
  en: {
    capabilitiesTitle: 'Capabilities that can be combined',
    capabilitiesBody:
      'Depending on the situation, AkikSystems can help turn an unclear operational or product problem into a bounded software system; design architecture and interfaces around explicit constraints; build web applications, internal tools, and data-backed workflows; connect existing systems and automate repetitive work; and make the result inspectable with tests, documentation, observability, and clear limits. These capabilities can be combined according to the situation; they do not define a menu the visitor has to choose from.',
  },
  fr: {
    capabilitiesTitle: 'Des capacités à combiner',
    capabilitiesBody:
      'Selon la situation, AkikSystems peut aider à transformer un problème opérationnel ou produit encore flou en système logiciel délimité ; concevoir l’architecture et les interfaces autour de contraintes explicites ; construire des applications web, des outils internes et des flux appuyés sur les données ; relier des systèmes existants et automatiser des tâches répétitives ; puis rendre le résultat inspectable avec des tests, de la documentation, de l’observabilité et des limites claires. Ces capacités se combinent selon la situation ; elles ne définissent pas un menu dans lequel il faudrait choisir.',
  },
};

export interface BootstrapWorkWithUsCapabilitiesResult {
  pageId: string;
  createdPage: boolean;
  publishedLocales: PlatformLocale[];
  preservedDraftLocales: PlatformLocale[];
}

export async function bootstrapWorkWithUsCapabilities(
  db: Kysely<Database>,
): Promise<BootstrapWorkWithUsCapabilitiesResult> {
  const baseline = await bootstrapWorkWithUsOpenSituations(db);
  const pageId = baseline.pageId;
  const publishedLocales: PlatformLocale[] = [];
  const preservedDraftLocales: PlatformLocale[] = [];

  for (const locale of ['en', 'fr'] as const) {
    const seed = workWithUsCapabilitiesSeed[locale];
    const localization = await db
      .selectFrom('work_with_us_localizations')
      .select(['capabilities_title', 'capabilities_body'])
      .where('page_id', '=', pageId)
      .where('locale', '=', locale)
      .executeTakeFirstOrThrow();
    const publication = await db
      .selectFrom('work_with_us_publications')
      .select('snapshot')
      .where('page_id', '=', pageId)
      .where('locale', '=', locale)
      .executeTakeFirst();

    const hadAuthoredCapabilities =
      localization.capabilities_title !== null ||
      localization.capabilities_body !== null;

    const updates: {
      capabilities_title?: string;
      capabilities_body?: string;
    } = {};

    if (localization.capabilities_title === null) {
      updates.capabilities_title = seed.capabilitiesTitle;
    }
    if (localization.capabilities_body === null) {
      updates.capabilities_body = seed.capabilitiesBody;
    }

    if (Object.keys(updates).length > 0) {
      await db
        .updateTable('work_with_us_localizations')
        .set({ ...updates, updated_at: new Date() })
        .where('page_id', '=', pageId)
        .where('locale', '=', locale)
        .execute();
    }

    if (publication === undefined) {
      await publishCommercialPageLocalization(db, pageId, locale);
      publishedLocales.push(locale);
      continue;
    }

    const published = parseCommercialPagePublicationSnapshot(
      publication.snapshot,
    );
    if (
      published === null ||
      commercialPageLegacyCompatibility(published).capabilitiesTitle !== null ||
      commercialPageLegacyCompatibility(published).capabilitiesBody !== null
    ) {
      continue;
    }

    if (hadAuthoredCapabilities) {
      preservedDraftLocales.push(locale);
      continue;
    }

    const now = new Date();
    await db
      .updateTable('work_with_us_publications')
      .set({
        snapshot: patchCommercialPageLegacyCompatibility(published, {
          capabilitiesTitle: seed.capabilitiesTitle,
          capabilitiesBody: seed.capabilitiesBody,
        }) as unknown as Record<string, unknown>,
        published_at: now,
        updated_at: now,
      })
      .where('page_id', '=', pageId)
      .where('locale', '=', locale)
      .execute();
    publishedLocales.push(locale);
  }

  return {
    pageId,
    createdPage: baseline.createdPage,
    publishedLocales,
    preservedDraftLocales,
  };
}


interface WorkWithUsCollaborationSeed {
  collaborationTitle: string;
  collaborationBody: string;
}

export const workWithUsCollaborationSeed: Record<
  PlatformLocale,
  WorkWithUsCollaborationSeed
> = {
  en: {
    collaborationTitle: 'How collaboration begins',
    collaborationBody:
      'The first step is a conversation focused on understanding the situation: what is happening, what matters, what is already in place, and where uncertainty remains. You do not need a finished brief or a predefined solution. After that first human exchange, we can decide whether there is a useful next step and, if so, frame the work, its boundaries, responsibilities, and evidence together.',
  },
  fr: {
    collaborationTitle: 'Comment la collaboration commence',
    collaborationBody:
      'La première étape est un échange centré sur la compréhension de la situation : ce qui se passe, ce qui compte, ce qui existe déjà et ce qui reste incertain. Vous n’avez pas besoin d’un cahier des charges finalisé ni d’une solution prédéfinie. Après ce premier échange humain, nous pouvons décider s’il existe une suite utile et, si oui, cadrer ensemble le travail, ses limites, les responsabilités et les preuves attendues.',
  },
};

export interface BootstrapWorkWithUsCollaborationResult {
  pageId: string;
  createdPage: boolean;
  publishedLocales: PlatformLocale[];
  preservedDraftLocales: PlatformLocale[];
}

export async function bootstrapWorkWithUsCollaboration(
  db: Kysely<Database>,
): Promise<BootstrapWorkWithUsCollaborationResult> {
  const baseline = await bootstrapWorkWithUsCapabilities(db);
  const pageId = baseline.pageId;
  const publishedLocales: PlatformLocale[] = [];
  const preservedDraftLocales: PlatformLocale[] = [];

  for (const locale of ['en', 'fr'] as const) {
    const seed = workWithUsCollaborationSeed[locale];
    const localization = await db
      .selectFrom('work_with_us_localizations')
      .select(['collaboration_title', 'collaboration_body'])
      .where('page_id', '=', pageId)
      .where('locale', '=', locale)
      .executeTakeFirstOrThrow();
    const publication = await db
      .selectFrom('work_with_us_publications')
      .select('snapshot')
      .where('page_id', '=', pageId)
      .where('locale', '=', locale)
      .executeTakeFirst();

    const hadAuthoredCollaboration =
      localization.collaboration_title !== null ||
      localization.collaboration_body !== null;

    const updates: {
      collaboration_title?: string;
      collaboration_body?: string;
    } = {};

    if (localization.collaboration_title === null) {
      updates.collaboration_title = seed.collaborationTitle;
    }
    if (localization.collaboration_body === null) {
      updates.collaboration_body = seed.collaborationBody;
    }

    if (Object.keys(updates).length > 0) {
      await db
        .updateTable('work_with_us_localizations')
        .set({ ...updates, updated_at: new Date() })
        .where('page_id', '=', pageId)
        .where('locale', '=', locale)
        .execute();
    }

    if (publication === undefined) {
      await publishCommercialPageLocalization(db, pageId, locale);
      publishedLocales.push(locale);
      continue;
    }

    const published = parseCommercialPagePublicationSnapshot(
      publication.snapshot,
    );
    if (
      published === null ||
      commercialPageLegacyCompatibility(published).collaborationTitle !== null ||
      commercialPageLegacyCompatibility(published).collaborationBody !== null
    ) {
      continue;
    }

    if (hadAuthoredCollaboration) {
      preservedDraftLocales.push(locale);
      continue;
    }

    const now = new Date();
    await db
      .updateTable('work_with_us_publications')
      .set({
        snapshot: patchCommercialPageLegacyCompatibility(published, {
          collaborationTitle: seed.collaborationTitle,
          collaborationBody: seed.collaborationBody,
        }) as unknown as Record<string, unknown>,
        published_at: now,
        updated_at: now,
      })
      .where('page_id', '=', pageId)
      .where('locale', '=', locale)
      .execute();
    publishedLocales.push(locale);
  }

  return {
    pageId,
    createdPage: baseline.createdPage,
    publishedLocales,
    preservedDraftLocales,
  };
}
