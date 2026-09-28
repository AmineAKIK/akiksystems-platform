import {
  parseProfileContent,
  type PlatformLocale,
  type ProfileEditableContent,
} from '@akiksystems/core';
import type { Kysely, Transaction } from 'kysely';

import {
  getPublishedWritingReferenceById,
  type PublishedWritingReference,
} from './writing-publication.js';
import { parseSystemPublicationSnapshot } from './system-publication.js';
import { systemReferenceHref } from './system-reference.js';
import type { Database, ProfileContactKind, ProfileLanguageCode } from './schema.js';

type ProfileDatabase = Kysely<Database> | Transaction<Database>;

export interface ProfileContact {
  kind: ProfileContactKind;
  value: string;
  visible: boolean;
}

export interface ProfileMobility {
  worldwide: boolean;
  remote: boolean;
  relocation: boolean;
}

export interface DraftProfileStackTechnology {
  id: string;
  slug: string;
  name: string;
  position: number;
}

export interface DraftProfileStackGroup {
  id: string;
  position: number;
  title: string | null;
  technologies: DraftProfileStackTechnology[];
}

export interface DraftProfile {
  id: string;
  locale: PlatformLocale;
  displayName: string | null;
  portraitAssetId: string | null;
  portraitAltText: string | null;
  sourceCvAssetId: string | null;
  content: ProfileEditableContent;
  contacts: ProfileContact[];
  languages: ProfileLanguageCode[];
  mobility: ProfileMobility;
  currentSystemId: string | null;
  stackGroups: DraftProfileStackGroup[];
  systemicScaleWritingId: string | null;
  editorialState: 'draft' | 'published';
  publishedAt: Date | null;
}

export interface ProfilePublicationStackTechnology {
  id: string;
  position: number;
}

export interface ProfilePublicationStackGroup {
  id: string;
  position: number;
  title: string;
  technologies: ProfilePublicationStackTechnology[];
}

export interface ProfilePublicationSnapshot {
  version: 1;
  profileId: string;
  locale: PlatformLocale;
  displayName: string;
  portraitAssetId: string | null;
  portraitAltText: string | null;
  sourceCvAssetId: string | null;
  content: ProfileEditableContent;
  contacts: Array<Pick<ProfileContact, 'kind' | 'value'>>;
  languages: ProfileLanguageCode[];
  mobility: ProfileMobility;
  currentSystemId: string | null;
  stackGroups: ProfilePublicationStackGroup[];
  systemicScaleWritingId: string | null;
}

export interface PublicProfileCurrentProject {
  id: string;
  slug: string;
  title: string;
  summary: string;
  href: string;
  publishedAt: Date;
  technologies: Array<{
    id: string;
    slug: string;
    name: string;
    position: number;
  }>;
}

export interface PublicProfileStackProofTechnology {
  id: string;
  slug: string;
  name: string;
  evidence: string;
}

export interface PublicProfileStackProofSystem {
  id: string;
  slug: string;
  title: string;
  summary: string;
  href: string;
  technologies: PublicProfileStackProofTechnology[];
}

export interface PublicProfileStackGroup {
  id: string;
  position: number;
  title: string;
  technologies: DraftProfileStackTechnology[];
  proofSystems: PublicProfileStackProofSystem[];
  proofCount: number;
}

export interface PublicProfile {
  id: string;
  locale: PlatformLocale;
  displayName: string;
  portraitAssetId: string | null;
  portraitAltText: string | null;
  sourceCvAssetId: string | null;
  content: ProfileEditableContent;
  contacts: Array<Pick<ProfileContact, 'kind' | 'value'>>;
  languages: ProfileLanguageCode[];
  mobility: ProfileMobility;
  currentProject: PublicProfileCurrentProject | null;
  stackGroups: PublicProfileStackGroup[];
  systemicScaleWriting: PublishedWritingReference | null;
  alternateLocale: PlatformLocale | null;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isContactKind(value: unknown): value is ProfileContactKind {
  return value === 'linkedin' || value === 'github' || value === 'email' || value === 'phone';
}

function isLanguageCode(value: unknown): value is ProfileLanguageCode {
  return value === 'fr' || value === 'en' || value === 'ar';
}

function parseSnapshotContacts(
  value: unknown,
): Array<Pick<ProfileContact, 'kind' | 'value'>> | null {
  if (!Array.isArray(value)) return null;

  const contacts: Array<Pick<ProfileContact, 'kind' | 'value'>> = [];
  for (const candidate of value) {
    if (candidate === null || typeof candidate !== 'object' || Array.isArray(candidate)) {
      return null;
    }
    const contact = candidate as Record<string, unknown>;
    if (!isContactKind(contact.kind) || typeof contact.value !== 'string') {
      return null;
    }
    contacts.push({ kind: contact.kind, value: contact.value });
  }
  return contacts;
}

function parseSnapshotStackGroups(value: unknown): ProfilePublicationStackGroup[] | null {
  if (!Array.isArray(value)) return null;

  const groups: ProfilePublicationStackGroup[] = [];
  for (const candidate of value) {
    if (candidate === null || typeof candidate !== 'object' || Array.isArray(candidate)) {
      return null;
    }

    const group = candidate as Record<string, unknown>;
    if (
      typeof group.id !== 'string' ||
      typeof group.position !== 'number' ||
      typeof group.title !== 'string' ||
      !Array.isArray(group.technologies)
    ) {
      return null;
    }

    const technologies: ProfilePublicationStackTechnology[] = [];
    for (const technologyCandidate of group.technologies) {
      if (
        technologyCandidate === null ||
        typeof technologyCandidate !== 'object' ||
        Array.isArray(technologyCandidate)
      ) {
        return null;
      }
      const technology = technologyCandidate as Record<string, unknown>;
      if (typeof technology.id !== 'string' || typeof technology.position !== 'number') {
        return null;
      }
      technologies.push({
        id: technology.id,
        position: technology.position,
      });
    }

    groups.push({
      id: group.id,
      position: group.position,
      title: group.title,
      technologies,
    });
  }
  return groups;
}

export function parseProfilePublicationSnapshot(value: unknown): ProfilePublicationSnapshot | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const snapshot = value as Record<string, unknown>;
  const contacts = parseSnapshotContacts(snapshot.contacts);
  const stackGroups = parseSnapshotStackGroups(snapshot.stackGroups);
  const mobility =
    snapshot.mobility !== null &&
    typeof snapshot.mobility === 'object' &&
    !Array.isArray(snapshot.mobility)
      ? (snapshot.mobility as Record<string, unknown>)
      : null;

  if (
    snapshot.version !== 1 ||
    typeof snapshot.profileId !== 'string' ||
    (snapshot.locale !== 'en' && snapshot.locale !== 'fr') ||
    typeof snapshot.displayName !== 'string' ||
    !isNullableString(snapshot.portraitAssetId) ||
    !isNullableString(snapshot.portraitAltText) ||
    !isNullableString(snapshot.sourceCvAssetId) ||
    snapshot.content === null ||
    typeof snapshot.content !== 'object' ||
    Array.isArray(snapshot.content) ||
    contacts === null ||
    !Array.isArray(snapshot.languages) ||
    !snapshot.languages.every(isLanguageCode) ||
    mobility === null ||
    typeof mobility.worldwide !== 'boolean' ||
    typeof mobility.remote !== 'boolean' ||
    typeof mobility.relocation !== 'boolean' ||
    !isNullableString(snapshot.currentSystemId) ||
    stackGroups === null ||
    !isNullableString(snapshot.systemicScaleWritingId)
  ) {
    return null;
  }

  return {
    version: 1,
    profileId: snapshot.profileId,
    locale: snapshot.locale,
    displayName: snapshot.displayName,
    portraitAssetId: snapshot.portraitAssetId,
    portraitAltText: snapshot.portraitAltText,
    sourceCvAssetId: snapshot.sourceCvAssetId,
    content: parseProfileContent(snapshot.content),
    contacts,
    languages: snapshot.languages,
    mobility: {
      worldwide: mobility.worldwide,
      remote: mobility.remote,
      relocation: mobility.relocation,
    },
    currentSystemId: snapshot.currentSystemId,
    stackGroups,
    systemicScaleWritingId: snapshot.systemicScaleWritingId,
  };
}

async function portraitAltText(
  db: ProfileDatabase,
  assetId: string | null,
  locale: PlatformLocale,
): Promise<string | null> {
  if (assetId === null) return null;

  const row = await db
    .selectFrom('asset_localizations')
    .select('alt_text')
    .where('asset_id', '=', assetId)
    .where('locale', '=', locale)
    .executeTakeFirst();

  return row?.alt_text ?? null;
}

export async function getDraftProfile(
  db: ProfileDatabase,
  locale: PlatformLocale,
): Promise<DraftProfile | null> {
  const row = await db
    .selectFrom('profiles')
    .innerJoin('profile_localizations', 'profile_localizations.profile_id', 'profiles.id')
    .select([
      'profiles.id',
      'profiles.display_name',
      'profiles.portrait_asset_id',
      'profiles.source_cv_asset_id',
      'profiles.current_system_id',
      'profiles.systemic_scale_writing_id',
      'profile_localizations.content',
      'profile_localizations.editorial_state',
      'profile_localizations.published_at',
    ])
    .where('profiles.singleton_key', '=', 'public')
    .where('profile_localizations.locale', '=', locale)
    .executeTakeFirst();

  if (row === undefined) return null;

  const [contacts, languages, mobility, groupRows, groupTechnologyRows, altText] =
    await Promise.all([
      db
        .selectFrom('profile_contacts')
        .select(['kind', 'value', 'visible'])
        .where('profile_id', '=', row.id)
        .orderBy('kind')
        .execute(),
      db
        .selectFrom('profile_languages')
        .select(['language_code'])
        .where('profile_id', '=', row.id)
        .orderBy('position')
        .execute(),
      db
        .selectFrom('profile_mobility')
        .select(['worldwide', 'remote', 'relocation'])
        .where('profile_id', '=', row.id)
        .executeTakeFirst(),
      db
        .selectFrom('profile_stack_groups')
        .leftJoin('profile_stack_group_localizations', (join) =>
          join
            .onRef('profile_stack_group_localizations.group_id', '=', 'profile_stack_groups.id')
            .on('profile_stack_group_localizations.locale', '=', locale),
        )
        .select([
          'profile_stack_groups.id',
          'profile_stack_groups.position',
          'profile_stack_group_localizations.title',
        ])
        .where('profile_stack_groups.profile_id', '=', row.id)
        .orderBy('profile_stack_groups.position')
        .execute(),
      db
        .selectFrom('profile_stack_group_technologies')
        .innerJoin(
          'profile_stack_groups',
          'profile_stack_groups.id',
          'profile_stack_group_technologies.group_id',
        )
        .innerJoin(
          'technologies',
          'technologies.id',
          'profile_stack_group_technologies.technology_id',
        )
        .select([
          'profile_stack_group_technologies.group_id',
          'profile_stack_group_technologies.position',
          'technologies.id',
          'technologies.slug',
          'technologies.name',
        ])
        .where('profile_stack_groups.profile_id', '=', row.id)
        .orderBy('profile_stack_groups.position')
        .orderBy('profile_stack_group_technologies.position')
        .execute(),
      portraitAltText(db, row.portrait_asset_id, locale),
    ]);

  const technologiesByGroup = new Map<string, DraftProfileStackTechnology[]>();
  for (const technology of groupTechnologyRows) {
    const current = technologiesByGroup.get(technology.group_id) ?? [];
    current.push({
      id: technology.id,
      slug: technology.slug,
      name: technology.name,
      position: technology.position,
    });
    technologiesByGroup.set(technology.group_id, current);
  }

  return {
    id: row.id,
    locale,
    displayName: row.display_name,
    portraitAssetId: row.portrait_asset_id,
    portraitAltText: altText,
    sourceCvAssetId: row.source_cv_asset_id,
    content: parseProfileContent(row.content),
    contacts,
    languages: languages.map((language) => language.language_code),
    mobility: mobility ?? {
      worldwide: false,
      remote: false,
      relocation: false,
    },
    currentSystemId: row.current_system_id,
    stackGroups: groupRows.map((group) => ({
      id: group.id,
      position: group.position,
      title: group.title,
      technologies: technologiesByGroup.get(group.id) ?? [],
    })),
    systemicScaleWritingId: row.systemic_scale_writing_id,
    editorialState: row.editorial_state,
    publishedAt: row.published_at,
  };
}

export async function getDraftProfilePreview(
  db: Kysely<Database>,
  locale: PlatformLocale,
): Promise<PublicProfile | null> {
  const draft = await getDraftProfile(db, locale);
  if (draft === null) return null;

  const stackGroups: ProfilePublicationStackGroup[] = draft.stackGroups.map((group) => ({
    id: group.id,
    position: group.position,
    title: group.title ?? '',
    technologies: group.technologies.map((technology) => ({
      id: technology.id,
      position: technology.position,
    })),
  }));

  const [currentProject, resolvedStackGroups, systemicScaleWriting] = await Promise.all([
    resolveCurrentProject(db, locale, draft.currentSystemId),
    resolveStackGroups(db, locale, stackGroups),
    draft.systemicScaleWritingId === null
      ? Promise.resolve(null)
      : getPublishedWritingReferenceById(db, {
          locale,
          id: draft.systemicScaleWritingId,
        }),
  ]);

  return {
    id: draft.id,
    locale,
    displayName: draft.displayName ?? '',
    portraitAssetId: draft.portraitAssetId,
    portraitAltText: draft.portraitAltText,
    sourceCvAssetId: draft.sourceCvAssetId,
    content: draft.content,
    contacts: draft.contacts
      .filter((contact) => contact.visible)
      .map(({ kind, value }) => ({ kind, value })),
    languages: draft.languages,
    mobility: draft.mobility,
    currentProject,
    stackGroups: resolvedStackGroups,
    systemicScaleWriting,
    alternateLocale: null,
  };
}

function requiredPublicationText(value: string | null | undefined, label: string): string {
  const normalized = value?.trim() ?? '';
  if (normalized === '') {
    throw new Error(`Profile ${label} is required before publication.`);
  }
  return normalized;
}

export async function buildProfilePublicationSnapshot(
  db: ProfileDatabase,
  input: { locale: PlatformLocale },
): Promise<ProfilePublicationSnapshot> {
  const draft = await getDraftProfile(db, input.locale);
  if (draft === null) {
    throw new Error('Profile localization not found.');
  }

  const displayName = requiredPublicationText(draft.displayName, 'display name');
  requiredPublicationText(draft.content.hero.professionalTitle, 'professional title');
  requiredPublicationText(draft.content.hero.introduction, 'introduction');

  return {
    version: 1,
    profileId: draft.id,
    locale: draft.locale,
    displayName,
    portraitAssetId: draft.portraitAssetId,
    portraitAltText: draft.portraitAltText,
    sourceCvAssetId: draft.sourceCvAssetId,
    content: draft.content,
    contacts: draft.contacts
      .filter((contact) => contact.visible)
      .map(({ kind, value }) => ({ kind, value })),
    languages: draft.languages,
    mobility: draft.mobility,
    currentSystemId: draft.currentSystemId,
    stackGroups: draft.stackGroups.flatMap((group) => {
      const title = group.title?.trim() ?? '';
      if (title === '') return [];
      return [
        {
          id: group.id,
          position: group.position,
          title,
          technologies: group.technologies.map((technology) => ({
            id: technology.id,
            position: technology.position,
          })),
        },
      ];
    }),
    systemicScaleWritingId: draft.systemicScaleWritingId,
  };
}

export async function markProfileDraft(
  db: ProfileDatabase,
  input: { profileId: string; locale?: PlatformLocale },
): Promise<void> {
  let query = db
    .updateTable('profile_localizations')
    .set({
      editorial_state: 'draft',
      published_at: null,
      updated_at: new Date(),
    })
    .where('profile_id', '=', input.profileId);

  if (input.locale !== undefined) {
    query = query.where('locale', '=', input.locale);
  }

  await query.execute();
}

export async function publishProfileLocalization(
  db: Kysely<Database>,
  input: { locale: PlatformLocale },
): Promise<ProfilePublicationSnapshot> {
  return db.transaction().execute(async (transaction) => {
    const snapshot = await buildProfilePublicationSnapshot(transaction, input);
    const now = new Date();
    const snapshotJson = snapshot as unknown as Record<string, unknown>;

    await transaction
      .insertInto('profile_publications')
      .values({
        profile_id: snapshot.profileId,
        locale: snapshot.locale,
        snapshot: snapshotJson,
        published_at: now,
        updated_at: now,
      })
      .onConflict((conflict) =>
        conflict.columns(['profile_id', 'locale']).doUpdateSet({
          snapshot: snapshotJson,
          published_at: now,
          updated_at: now,
        }),
      )
      .execute();

    await transaction
      .updateTable('profile_localizations')
      .set({
        editorial_state: 'published',
        published_at: now,
        updated_at: now,
      })
      .where('profile_id', '=', snapshot.profileId)
      .where('locale', '=', snapshot.locale)
      .executeTakeFirstOrThrow();

    return snapshot;
  });
}

export async function unpublishProfileLocalization(
  db: Kysely<Database>,
  input: { locale: PlatformLocale },
): Promise<void> {
  await db.transaction().execute(async (transaction) => {
    const profile = await transaction
      .selectFrom('profiles')
      .select('id')
      .where('singleton_key', '=', 'public')
      .executeTakeFirstOrThrow();

    await transaction
      .deleteFrom('profile_publications')
      .where('profile_id', '=', profile.id)
      .where('locale', '=', input.locale)
      .execute();

    await transaction
      .updateTable('profile_localizations')
      .set({
        editorial_state: 'draft',
        published_at: null,
        updated_at: new Date(),
      })
      .where('profile_id', '=', profile.id)
      .where('locale', '=', input.locale)
      .execute();
  });
}

async function resolveCurrentProject(
  db: Kysely<Database>,
  locale: PlatformLocale,
  systemId: string | null,
): Promise<PublicProfileCurrentProject | null> {
  if (systemId === null) return null;

  const row = await db
    .selectFrom('system_publications')
    .innerJoin('systems', 'systems.id', 'system_publications.system_id')
    .select(['system_publications.snapshot', 'system_publications.published_at'])
    .where('systems.id', '=', systemId)
    .where('systems.lifecycle', '=', 'active')
    .where('system_publications.locale', '=', locale)
    .executeTakeFirst();

  if (row === undefined) return null;
  const snapshot = parseSystemPublicationSnapshot(row.snapshot);
  if (snapshot === null) return null;

  return {
    id: snapshot.systemId,
    slug: snapshot.slug,
    title: snapshot.title,
    summary: snapshot.summary,
    href: systemReferenceHref(locale, snapshot.slug),
    publishedAt: row.published_at,
    technologies: snapshot.technologies.map(({ id, slug, name, position }) => ({
      id,
      slug,
      name,
      position,
    })),
  };
}

async function resolveStackGroups(
  db: Kysely<Database>,
  locale: PlatformLocale,
  groups: ProfilePublicationStackGroup[],
): Promise<PublicProfileStackGroup[]> {
  const technologyIds = [
    ...new Set(groups.flatMap((group) => group.technologies.map((technology) => technology.id))),
  ];

  const [technologyRows, publicationRows] = await Promise.all([
    technologyIds.length === 0
      ? Promise.resolve([])
      : db
          .selectFrom('technologies')
          .select(['id', 'slug', 'name'])
          .where('id', 'in', technologyIds)
          .execute(),
    db
      .selectFrom('system_publications')
      .innerJoin('systems', 'systems.id', 'system_publications.system_id')
      .select(['systems.editorial_position', 'system_publications.snapshot'])
      .where('systems.lifecycle', '=', 'active')
      .where('system_publications.locale', '=', locale)
      .orderBy('systems.editorial_position')
      .orderBy('systems.created_at')
      .orderBy('systems.id')
      .execute(),
  ]);

  const technologyById = new Map(technologyRows.map((technology) => [technology.id, technology]));
  const systems = publicationRows.flatMap((row) => {
    const snapshot = parseSystemPublicationSnapshot(row.snapshot);
    return snapshot === null ? [] : [snapshot];
  });

  return groups.map((group) => {
    const selectedIds = new Set(group.technologies.map((technology) => technology.id));
    const technologies = group.technologies.flatMap((selection) => {
      const technology = technologyById.get(selection.id);
      return technology === undefined
        ? []
        : [
            {
              id: technology.id,
              slug: technology.slug,
              name: technology.name,
              position: selection.position,
            },
          ];
    });

    const proofSystems = systems.flatMap((system): PublicProfileStackProofSystem[] => {
      const proofTechnologies = system.technologies.flatMap((technology) => {
        const evidence = technology.evidence?.trim() ?? '';
        if (!selectedIds.has(technology.id) || evidence === '') return [];
        return [
          {
            id: technology.id,
            slug: technology.slug,
            name: technology.name,
            evidence,
          },
        ];
      });

      if (proofTechnologies.length === 0) return [];
      return [
        {
          id: system.systemId,
          slug: system.slug,
          title: system.title,
          summary: system.summary,
          href: systemReferenceHref(locale, system.slug),
          technologies: proofTechnologies,
        },
      ];
    });

    return {
      id: group.id,
      position: group.position,
      title: group.title,
      technologies,
      proofSystems,
      proofCount: proofSystems.length,
    };
  });
}

export async function getPublicProfile(
  db: Kysely<Database>,
  locale: PlatformLocale,
): Promise<PublicProfile | null> {
  const row = await db
    .selectFrom('profile_publications')
    .innerJoin('profiles', 'profiles.id', 'profile_publications.profile_id')
    .select(['profile_publications.profile_id', 'profile_publications.snapshot'])
    .where('profiles.singleton_key', '=', 'public')
    .where('profile_publications.locale', '=', locale)
    .executeTakeFirst();

  if (row === undefined) return null;

  const snapshot = parseProfilePublicationSnapshot(row.snapshot);
  if (snapshot === null || snapshot.profileId !== row.profile_id) return null;

  const alternateLocale: PlatformLocale = locale === 'en' ? 'fr' : 'en';
  const [currentProject, stackGroups, systemicScaleWriting, alternate] = await Promise.all([
    resolveCurrentProject(db, locale, snapshot.currentSystemId),
    resolveStackGroups(db, locale, snapshot.stackGroups),
    snapshot.systemicScaleWritingId === null
      ? Promise.resolve(null)
      : getPublishedWritingReferenceById(db, {
          locale,
          id: snapshot.systemicScaleWritingId,
        }),
    db
      .selectFrom('profile_publications')
      .select('locale')
      .where('profile_id', '=', snapshot.profileId)
      .where('locale', '=', alternateLocale)
      .executeTakeFirst(),
  ]);

  return {
    id: snapshot.profileId,
    locale: snapshot.locale,
    displayName: snapshot.displayName,
    portraitAssetId: snapshot.portraitAssetId,
    portraitAltText: snapshot.portraitAltText,
    sourceCvAssetId: snapshot.sourceCvAssetId,
    content: snapshot.content,
    contacts: snapshot.contacts,
    languages: snapshot.languages,
    mobility: snapshot.mobility,
    currentProject,
    stackGroups,
    systemicScaleWriting,
    alternateLocale: alternate?.locale ?? null,
  };
}
