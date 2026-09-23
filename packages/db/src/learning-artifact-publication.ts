import type { PlatformLocale } from '@akiksystems/core';
import type { Kysely } from 'kysely';

import { getPublishedSystemReferenceById } from './system-reference.js';
import type { Database } from './schema.js';

export interface LearningArtifactPublicationSnapshot {
  version: 1;
  learningArtifactId: string;
  locale: PlatformLocale;
  slug: string;
  title: string;
  summary: string;
  body: string | null;
  trainingId: string | null;
  systemId: string | null;
  sourceAssetId: string | null;
  editorialPosition: number;
}

export interface PublicLearningArtifactTraining {
  trainingId: string;
  slug: string;
  title: string;
}

export interface PublicLearningArtifactSystem {
  systemId: string;
  slug: string;
  title: string;
  href: string;
}

export interface PublishedLearningArtifactListItem
  extends LearningArtifactPublicationSnapshot {
  publishedAt: Date;
}

export interface PublishedLearningArtifact
  extends PublishedLearningArtifactListItem {
  alternate: { locale: PlatformLocale; slug: string } | null;
  training: PublicLearningArtifactTraining | null;
  system: PublicLearningArtifactSystem | null;
}

function requiredText(value: string | null, label: string): string {
  const normalized = value?.trim() ?? '';
  if (normalized === '') {
    throw new Error(
      `LearningArtifact ${label} is required before publication.`,
    );
  }
  return normalized;
}

function parseSnapshot(value: unknown): LearningArtifactPublicationSnapshot {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid LearningArtifact publication snapshot.');
  }
  return value as LearningArtifactPublicationSnapshot;
}

async function resolveTraining(
  db: Kysely<Database>,
  input: { locale: PlatformLocale; trainingId: string },
): Promise<PublicLearningArtifactTraining | null> {
  const publication = await db
    .selectFrom('training_publications')
    .select('snapshot')
    .where('training_id', '=', input.trainingId)
    .where('locale', '=', input.locale)
    .executeTakeFirst();

  if (publication === undefined) return null;

  const value = publication.snapshot as {
    trainingId?: unknown;
    slug?: unknown;
    title?: unknown;
  };
  if (
    typeof value.trainingId !== 'string' ||
    typeof value.slug !== 'string' ||
    typeof value.title !== 'string'
  ) {
    return null;
  }

  return {
    trainingId: value.trainingId,
    slug: value.slug,
    title: value.title,
  };
}

export async function publishLearningArtifactLocalization(
  db: Kysely<Database>,
  input: { learningArtifactId: string; locale: PlatformLocale },
): Promise<void> {
  await db.transaction().execute(async (transaction) => {
    const row = await transaction
      .selectFrom('learning_artifacts')
      .innerJoin(
        'learning_artifact_localizations',
        'learning_artifact_localizations.learning_artifact_id',
        'learning_artifacts.id',
      )
      .select([
        'learning_artifacts.id',
        'learning_artifacts.training_id',
        'learning_artifacts.system_id',
        'learning_artifacts.source_asset_id',
        'learning_artifacts.editorial_position',
        'learning_artifact_localizations.slug',
        'learning_artifact_localizations.title',
        'learning_artifact_localizations.summary',
        'learning_artifact_localizations.body',
      ])
      .where('learning_artifacts.id', '=', input.learningArtifactId)
      .where('learning_artifact_localizations.locale', '=', input.locale)
      .executeTakeFirst();

    if (row === undefined) {
      throw new Error('LearningArtifact localization not found.');
    }

    const snapshot: LearningArtifactPublicationSnapshot = {
      version: 1,
      learningArtifactId: row.id,
      locale: input.locale,
      slug: requiredText(row.slug, 'slug'),
      title: requiredText(row.title, 'title'),
      summary: requiredText(row.summary, 'summary'),
      body: row.body?.trim() || null,
      trainingId: row.training_id,
      systemId: row.system_id,
      sourceAssetId: row.source_asset_id,
      editorialPosition: row.editorial_position,
    };
    const now = new Date();
    const snapshotJson = snapshot as unknown as Record<string, unknown>;

    await transaction
      .insertInto('learning_artifact_publications')
      .values({
        learning_artifact_id: input.learningArtifactId,
        locale: input.locale,
        slug: snapshot.slug,
        snapshot: snapshotJson,
        published_at: now,
        updated_at: now,
      })
      .onConflict((conflict) =>
        conflict.columns(['learning_artifact_id', 'locale']).doUpdateSet({
          slug: snapshot.slug,
          snapshot: snapshotJson,
          published_at: now,
          updated_at: now,
        }),
      )
      .execute();

    await transaction
      .updateTable('learning_artifact_localizations')
      .set({
        editorial_state: 'published',
        published_at: now,
        updated_at: now,
      })
      .where('learning_artifact_id', '=', input.learningArtifactId)
      .where('locale', '=', input.locale)
      .execute();
  });
}

export async function unpublishLearningArtifactLocalization(
  db: Kysely<Database>,
  input: { learningArtifactId: string; locale: PlatformLocale },
): Promise<void> {
  await db.transaction().execute(async (transaction) => {
    await transaction
      .deleteFrom('learning_artifact_publications')
      .where('learning_artifact_id', '=', input.learningArtifactId)
      .where('locale', '=', input.locale)
      .execute();

    await transaction
      .updateTable('learning_artifact_localizations')
      .set({
        editorial_state: 'draft',
        published_at: null,
        updated_at: new Date(),
      })
      .where('learning_artifact_id', '=', input.learningArtifactId)
      .where('locale', '=', input.locale)
      .execute();
  });
}

export async function listPublishedLearningArtifacts(
  db: Kysely<Database>,
  locale: PlatformLocale,
): Promise<PublishedLearningArtifactListItem[]> {
  const rows = await db
    .selectFrom('learning_artifact_publications')
    .innerJoin(
      'learning_artifacts',
      'learning_artifacts.id',
      'learning_artifact_publications.learning_artifact_id',
    )
    .select([
      'learning_artifact_publications.snapshot',
      'learning_artifact_publications.published_at',
    ])
    .where('learning_artifact_publications.locale', '=', locale)
    .orderBy('learning_artifacts.editorial_position')
    .orderBy('learning_artifacts.created_at')
    .execute();

  return rows.map((row) => ({
    ...parseSnapshot(row.snapshot),
    publishedAt: row.published_at,
  }));
}

export async function listPublishedLearningArtifactsForSystem(
  db: Kysely<Database>,
  input: { locale: PlatformLocale; systemId: string },
): Promise<PublishedLearningArtifactListItem[]> {
  const rows = await db
    .selectFrom('learning_artifact_publications')
    .select(['snapshot', 'published_at'])
    .where('locale', '=', input.locale)
    .execute();

  return rows
    .map((row) => ({
      ...parseSnapshot(row.snapshot),
      publishedAt: row.published_at,
    }))
    .filter((artifact) => artifact.systemId === input.systemId)
    .sort(
      (left, right) =>
        left.editorialPosition - right.editorialPosition ||
        left.learningArtifactId.localeCompare(right.learningArtifactId),
    );
}

export async function listPublishedLearningArtifactsForTraining(
  db: Kysely<Database>,
  input: { locale: PlatformLocale; trainingId: string },
): Promise<PublishedLearningArtifactListItem[]> {
  const rows = await db
    .selectFrom('learning_artifact_publications')
    .select(['snapshot', 'published_at'])
    .where('locale', '=', input.locale)
    .execute();

  return rows
    .map((row) => ({
      ...parseSnapshot(row.snapshot),
      publishedAt: row.published_at,
    }))
    .filter((artifact) => artifact.trainingId === input.trainingId)
    .sort(
      (left, right) =>
        left.editorialPosition - right.editorialPosition ||
        left.learningArtifactId.localeCompare(right.learningArtifactId),
    );
}

export async function getPublishedLearningArtifact(
  db: Kysely<Database>,
  input: { locale: PlatformLocale; slug: string },
): Promise<PublishedLearningArtifact | null> {
  const row = await db
    .selectFrom('learning_artifact_publications')
    .select(['learning_artifact_id', 'snapshot', 'published_at'])
    .where('locale', '=', input.locale)
    .where('slug', '=', input.slug)
    .executeTakeFirst();

  if (row === undefined) return null;

  const snapshot = parseSnapshot(row.snapshot);
  const alternateLocale: PlatformLocale = input.locale === 'en' ? 'fr' : 'en';
  const [alternate, training, systemReference] = await Promise.all([
    db
      .selectFrom('learning_artifact_publications')
      .select(['locale', 'slug'])
      .where('learning_artifact_id', '=', row.learning_artifact_id)
      .where('locale', '=', alternateLocale)
      .executeTakeFirst(),
    snapshot.trainingId === null
      ? Promise.resolve(null)
      : resolveTraining(db, {
          locale: input.locale,
          trainingId: snapshot.trainingId,
        }),
    snapshot.systemId === null
      ? Promise.resolve(null)
      : getPublishedSystemReferenceById(db, {
          locale: input.locale,
          id: snapshot.systemId,
        }),
  ]);

  return {
    ...snapshot,
    publishedAt: row.published_at,
    alternate:
      alternate === undefined
        ? null
        : { locale: alternate.locale, slug: alternate.slug },
    training,
    system:
      systemReference === null
        ? null
        : {
            systemId: systemReference.id,
            slug: systemReference.slug,
            title: systemReference.title,
            href: systemReference.href,
          },
  };
}
