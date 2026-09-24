import { randomUUID } from 'node:crypto';

import type { PlatformLocale } from '@akiksystems/core';
import type { Kysely } from 'kysely';

import {
  parseCommercialPagePublicationSnapshot,
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
      published.situationsTitle !== null ||
      published.situationsBody !== null
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
        snapshot: {
          ...published,
          situationsTitle: seed.situationsTitle,
          situationsBody: seed.situationsBody,
        } as unknown as Record<string, unknown>,
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
