import type { PlatformLocale } from '@akiksystems/core';
import type { Kysely } from 'kysely';

import type { Database } from './schema.js';

export type WorkWithUsApproachStepKey = 'understand' | 'structure' | 'build';

export interface CommercialPageLegacyCompatibility {
  situationsTitle: string | null;
  situationsBody: string | null;
  capabilitiesTitle: string | null;
  capabilitiesBody: string | null;
  collaborationTitle: string | null;
  collaborationBody: string | null;
  inquiryTitle: string | null;
  inquiryBody: string | null;
  privacyNote: string | null;
}

export interface CommercialPagePublicationSnapshotV1
  extends CommercialPageLegacyCompatibility {
  version: 1;
  pageId: string;
  locale: PlatformLocale;
  title: string;
  introduction: string;
}

export interface WorkWithUsApproachStep {
  key: WorkWithUsApproachStepKey;
  title: string | null;
  body: string | null;
}

export interface CommercialPagePublicationSnapshotV2 {
  version: 2;
  pageId: string;
  locale: PlatformLocale;
  hero: {
    eyebrow: string | null;
    title: string;
    introduction: string;
  };
  approach: {
    eyebrow: string | null;
    title: string | null;
    introduction: string | null;
    steps: [
      WorkWithUsApproachStep,
      WorkWithUsApproachStep,
      WorkWithUsApproachStep,
    ];
  };
  contact: {
    eyebrow: string | null;
    title: string | null;
    introduction: string | null;
    nameLabel: string | null;
    emailLabel: string | null;
    organizationLabel: string | null;
    messageLabel: string | null;
    messagePlaceholder: string | null;
    listenLabel: string | null;
    submitLabel: string | null;
    successMessage: string | null;
    privacyNote: string | null;
  };
  about: {
    eyebrow: string | null;
    title: string | null;
    body: string | null;
    profileLinkLabel: string | null;
  };
  systems: {
    eyebrow: string | null;
    title: string | null;
    introduction: string | null;
    allSystemsLinkLabel: string | null;
  };
  legacy: CommercialPageLegacyCompatibility;
}

export type CommercialPagePublicationSnapshot =
  | CommercialPagePublicationSnapshotV1
  | CommercialPagePublicationSnapshotV2;

export type PublishedCommercialPage = CommercialPagePublicationSnapshot;

function nullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function objectRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function parseLegacyCompatibility(
  record: Record<string, unknown>,
): CommercialPageLegacyCompatibility {
  return {
    situationsTitle: nullableString(record.situationsTitle),
    situationsBody: nullableString(record.situationsBody),
    capabilitiesTitle: nullableString(record.capabilitiesTitle),
    capabilitiesBody: nullableString(record.capabilitiesBody),
    collaborationTitle: nullableString(record.collaborationTitle),
    collaborationBody: nullableString(record.collaborationBody),
    inquiryTitle: nullableString(record.inquiryTitle),
    inquiryBody: nullableString(record.inquiryBody),
    privacyNote: nullableString(record.privacyNote),
  };
}

function parseApproachStep(
  value: unknown,
  key: WorkWithUsApproachStepKey,
): WorkWithUsApproachStep | null {
  const record = objectRecord(value);
  if (record === null || record.key !== key) return null;

  return {
    key,
    title: nullableString(record.title),
    body: nullableString(record.body),
  };
}

function parseV2(
  record: Record<string, unknown>,
): CommercialPagePublicationSnapshotV2 | null {
  if (
    record.version !== 2 ||
    typeof record.pageId !== 'string' ||
    (record.locale !== 'en' && record.locale !== 'fr')
  ) {
    return null;
  }

  const hero = objectRecord(record.hero);
  const approach = objectRecord(record.approach);
  const contact = objectRecord(record.contact);
  const about = objectRecord(record.about);
  const systems = objectRecord(record.systems);
  const legacy = objectRecord(record.legacy);
  const heroTitle = nonEmptyString(hero?.title);
  const heroIntroduction = nonEmptyString(hero?.introduction);

  if (
    hero === null ||
    approach === null ||
    contact === null ||
    about === null ||
    systems === null ||
    legacy === null ||
    heroTitle === null ||
    heroIntroduction === null ||
    !Array.isArray(approach.steps) ||
    approach.steps.length !== 3
  ) {
    return null;
  }

  const understand = parseApproachStep(approach.steps[0], 'understand');
  const structure = parseApproachStep(approach.steps[1], 'structure');
  const build = parseApproachStep(approach.steps[2], 'build');

  if (understand === null || structure === null || build === null) return null;

  return {
    version: 2,
    pageId: record.pageId,
    locale: record.locale,
    hero: {
      eyebrow: nullableString(hero.eyebrow),
      title: heroTitle,
      introduction: heroIntroduction,
    },
    approach: {
      eyebrow: nullableString(approach.eyebrow),
      title: nullableString(approach.title),
      introduction: nullableString(approach.introduction),
      steps: [understand, structure, build],
    },
    contact: {
      eyebrow: nullableString(contact.eyebrow),
      title: nullableString(contact.title),
      introduction: nullableString(contact.introduction),
      nameLabel: nullableString(contact.nameLabel),
      emailLabel: nullableString(contact.emailLabel),
      organizationLabel: nullableString(contact.organizationLabel),
      messageLabel: nullableString(contact.messageLabel),
      messagePlaceholder: nullableString(contact.messagePlaceholder),
      listenLabel: nullableString(contact.listenLabel),
      submitLabel: nullableString(contact.submitLabel),
      successMessage: nullableString(contact.successMessage),
      privacyNote: nullableString(contact.privacyNote),
    },
    about: {
      eyebrow: nullableString(about.eyebrow),
      title: nullableString(about.title),
      body: nullableString(about.body),
      profileLinkLabel: nullableString(about.profileLinkLabel),
    },
    systems: {
      eyebrow: nullableString(systems.eyebrow),
      title: nullableString(systems.title),
      introduction: nullableString(systems.introduction),
      allSystemsLinkLabel: nullableString(systems.allSystemsLinkLabel),
    },
    legacy: parseLegacyCompatibility(legacy),
  };
}

export function parseCommercialPagePublicationSnapshot(
  value: unknown,
): CommercialPagePublicationSnapshot | null {
  const record = objectRecord(value);
  if (record === null) return null;

  if (record.version === 2) return parseV2(record);

  if (
    record.version !== 1 ||
    typeof record.pageId !== 'string' ||
    (record.locale !== 'en' && record.locale !== 'fr') ||
    nonEmptyString(record.title) === null ||
    nonEmptyString(record.introduction) === null
  ) {
    return null;
  }

  return {
    version: 1,
    pageId: record.pageId,
    locale: record.locale,
    title: record.title as string,
    introduction: record.introduction as string,
    ...parseLegacyCompatibility(record),
  };
}

export function commercialPageHero(
  snapshot: CommercialPagePublicationSnapshot,
): { title: string; introduction: string } {
  return snapshot.version === 2
    ? {
        title: snapshot.hero.title,
        introduction: snapshot.hero.introduction,
      }
    : {
        title: snapshot.title,
        introduction: snapshot.introduction,
      };
}

export function commercialPageLegacyCompatibility(
  snapshot: CommercialPagePublicationSnapshot,
): CommercialPageLegacyCompatibility {
  return snapshot.version === 2
    ? snapshot.legacy
    : {
        situationsTitle: snapshot.situationsTitle,
        situationsBody: snapshot.situationsBody,
        capabilitiesTitle: snapshot.capabilitiesTitle,
        capabilitiesBody: snapshot.capabilitiesBody,
        collaborationTitle: snapshot.collaborationTitle,
        collaborationBody: snapshot.collaborationBody,
        inquiryTitle: snapshot.inquiryTitle,
        inquiryBody: snapshot.inquiryBody,
        privacyNote: snapshot.privacyNote,
      };
}

export function patchCommercialPageLegacyCompatibility(
  snapshot: CommercialPagePublicationSnapshot,
  patch: Partial<CommercialPageLegacyCompatibility>,
): CommercialPagePublicationSnapshot {
  if (snapshot.version === 1) {
    return { ...snapshot, ...patch };
  }

  return {
    ...snapshot,
    legacy: {
      ...snapshot.legacy,
      ...patch,
    },
  };
}

export async function buildCommercialPagePublicationSnapshot(
  db: Kysely<Database>,
  pageId: string,
  locale: PlatformLocale,
): Promise<CommercialPagePublicationSnapshotV2> {
  const row = await db
    .selectFrom('work_with_us_localizations')
    .select([
      'title',
      'introduction',
      'situations_title',
      'situations_body',
      'capabilities_title',
      'capabilities_body',
      'collaboration_title',
      'collaboration_body',
      'inquiry_title',
      'inquiry_body',
      'privacy_note',
    ])
    .where('page_id', '=', pageId)
    .where('locale', '=', locale)
    .executeTakeFirst();

  if (
    row === undefined ||
    row.title === null ||
    row.title.trim() === '' ||
    row.introduction === null ||
    row.introduction.trim() === ''
  ) {
    throw new Error(
      `Commercial page ${locale.toUpperCase()} requires a title and introduction before publication.`,
    );
  }

  const legacy: CommercialPageLegacyCompatibility = {
    situationsTitle: row.situations_title,
    situationsBody: row.situations_body,
    capabilitiesTitle: row.capabilities_title,
    capabilitiesBody: row.capabilities_body,
    collaborationTitle: row.collaboration_title,
    collaborationBody: row.collaboration_body,
    inquiryTitle: row.inquiry_title,
    inquiryBody: row.inquiry_body,
    privacyNote: row.privacy_note,
  };

  return {
    version: 2,
    pageId,
    locale,
    hero: {
      eyebrow: null,
      title: row.title,
      introduction: row.introduction,
    },
    approach: {
      eyebrow: null,
      title: row.collaboration_title,
      introduction: row.collaboration_body,
      steps: [
        {
          key: 'understand',
          title: row.situations_title,
          body: row.situations_body,
        },
        {
          key: 'structure',
          title: row.capabilities_title,
          body: row.capabilities_body,
        },
        {
          key: 'build',
          title: null,
          body: null,
        },
      ],
    },
    contact: {
      eyebrow: null,
      title: row.inquiry_title,
      introduction: row.inquiry_body,
      nameLabel: null,
      emailLabel: null,
      organizationLabel: null,
      messageLabel: null,
      messagePlaceholder: null,
      listenLabel: null,
      submitLabel: null,
      successMessage: null,
      privacyNote: row.privacy_note,
    },
    about: {
      eyebrow: null,
      title: null,
      body: null,
      profileLinkLabel: null,
    },
    systems: {
      eyebrow: null,
      title: null,
      introduction: null,
      allSystemsLinkLabel: null,
    },
    legacy,
  };
}

export async function publishCommercialPageLocalization(
  db: Kysely<Database>,
  pageId: string,
  locale: PlatformLocale,
): Promise<CommercialPagePublicationSnapshotV2> {
  const snapshot = await buildCommercialPagePublicationSnapshot(
    db,
    pageId,
    locale,
  );
  const snapshotJson: Record<string, unknown> = { ...snapshot };
  const now = new Date();

  await db.transaction().execute(async (transaction) => {
    await transaction
      .insertInto('work_with_us_publications')
      .values({
        page_id: pageId,
        locale,
        snapshot: snapshotJson,
        published_at: now,
        updated_at: now,
      })
      .onConflict((conflict) =>
        conflict.columns(['page_id', 'locale']).doUpdateSet({
          snapshot: snapshotJson,
          published_at: now,
          updated_at: now,
        }),
      )
      .execute();

    await transaction
      .updateTable('work_with_us_localizations')
      .set({
        editorial_state: 'published',
        published_at: now,
        updated_at: now,
      })
      .where('page_id', '=', pageId)
      .where('locale', '=', locale)
      .execute();
  });

  return snapshot;
}

export async function getPublishedCommercialPage(
  db: Kysely<Database>,
  locale: PlatformLocale,
): Promise<PublishedCommercialPage | null> {
  const publication = await db
    .selectFrom('work_with_us_publications')
    .select('snapshot')
    .where('locale', '=', locale)
    .executeTakeFirst();

  return publication === undefined
    ? null
    : parseCommercialPagePublicationSnapshot(publication.snapshot);
}
