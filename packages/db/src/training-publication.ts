import type { PlatformLocale, TrainingState } from '@akiksystems/core';
import type { Kysely } from 'kysely';

import type { Database } from './schema.js';

export interface TrainingPublicationSnapshot {
  version: 1;
  trainingId: string;
  locale: PlatformLocale;
  slug: string;
  title: string;
  summary: string;
  body: string | null;
  provider: string;
  state: TrainingState;
  startDate: string | null;
  endDate: string | null;
  editorialPosition: number;
}

export interface PublishedTrainingListItem extends TrainingPublicationSnapshot {
  publishedAt: Date;
}

export interface PublishedTraining extends PublishedTrainingListItem {
  alternate: { locale: PlatformLocale; slug: string } | null;
}

function requiredText(value: string | null, label: string): string {
  const normalized = value?.trim() ?? '';
  if (normalized === '') throw new Error(`Training ${label} is required before publication.`);
  return normalized;
}

function parseSnapshot(value: unknown): TrainingPublicationSnapshot {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid Training publication snapshot.');
  }
  return value as TrainingPublicationSnapshot;
}

export async function publishTrainingLocalization(
  db: Kysely<Database>,
  input: { trainingId: string; locale: PlatformLocale },
): Promise<void> {
  await db.transaction().execute(async (transaction) => {
    const row = await transaction
      .selectFrom('trainings')
      .innerJoin('training_localizations', 'training_localizations.training_id', 'trainings.id')
      .select([
        'trainings.id',
        'trainings.provider',
        'trainings.state',
        'trainings.start_date',
        'trainings.end_date',
        'trainings.editorial_position',
        'training_localizations.slug',
        'training_localizations.title',
        'training_localizations.summary',
        'training_localizations.body',
      ])
      .where('trainings.id', '=', input.trainingId)
      .where('training_localizations.locale', '=', input.locale)
      .executeTakeFirst();

    if (row === undefined) throw new Error('Training localization not found.');

    const snapshot: TrainingPublicationSnapshot = {
      version: 1,
      trainingId: row.id,
      locale: input.locale,
      slug: requiredText(row.slug, 'slug'),
      title: requiredText(row.title, 'title'),
      summary: requiredText(row.summary, 'summary'),
      body: row.body?.trim() || null,
      provider: requiredText(row.provider, 'provider'),
      state: row.state,
      startDate: row.start_date,
      endDate: row.end_date,
      editorialPosition: row.editorial_position,
    };
    const now = new Date();

    await transaction.insertInto('training_publications').values({
      training_id: input.trainingId,
      locale: input.locale,
      slug: snapshot.slug,
      snapshot,
      published_at: now,
      updated_at: now,
    }).onConflict((conflict) => conflict.columns(['training_id', 'locale']).doUpdateSet({
      slug: snapshot.slug,
      snapshot,
      published_at: now,
      updated_at: now,
    })).execute();

    await transaction.updateTable('training_localizations').set({
      editorial_state: 'published',
      published_at: now,
      updated_at: now,
    }).where('training_id', '=', input.trainingId).where('locale', '=', input.locale).execute();
  });
}

export async function unpublishTrainingLocalization(
  db: Kysely<Database>,
  input: { trainingId: string; locale: PlatformLocale },
): Promise<void> {
  await db.transaction().execute(async (transaction) => {
    await transaction.deleteFrom('training_publications')
      .where('training_id', '=', input.trainingId).where('locale', '=', input.locale).execute();
    await transaction.updateTable('training_localizations').set({
      editorial_state: 'draft',
      published_at: null,
      updated_at: new Date(),
    }).where('training_id', '=', input.trainingId).where('locale', '=', input.locale).execute();
  });
}

export async function listPublishedTrainings(
  db: Kysely<Database>,
  locale: PlatformLocale,
): Promise<PublishedTrainingListItem[]> {
  const rows = await db.selectFrom('training_publications')
    .innerJoin('trainings', 'trainings.id', 'training_publications.training_id')
    .select(['training_publications.snapshot', 'training_publications.published_at'])
    .where('training_publications.locale', '=', locale)
    .orderBy('trainings.editorial_position')
    .orderBy('trainings.created_at')
    .execute();

  return rows.map((row) => ({ ...parseSnapshot(row.snapshot), publishedAt: row.published_at }));
}

export async function getPublishedTraining(
  db: Kysely<Database>,
  input: { locale: PlatformLocale; slug: string },
): Promise<PublishedTraining | null> {
  const row = await db.selectFrom('training_publications')
    .select(['training_id', 'snapshot', 'published_at'])
    .where('locale', '=', input.locale)
    .where('slug', '=', input.slug)
    .executeTakeFirst();
  if (row === undefined) return null;

  const alternateLocale: PlatformLocale = input.locale === 'en' ? 'fr' : 'en';
  const alternate = await db.selectFrom('training_publications')
    .select(['locale', 'slug'])
    .where('training_id', '=', row.training_id)
    .where('locale', '=', alternateLocale)
    .executeTakeFirst();

  return {
    ...parseSnapshot(row.snapshot),
    publishedAt: row.published_at,
    alternate: alternate === undefined ? null : { locale: alternate.locale, slug: alternate.slug },
  };
}
