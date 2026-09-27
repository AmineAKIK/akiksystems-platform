import {
  getDraftProfile,
  getDraftProfilePreview,
  listPublishedSystemReferences,
  listPublishedWritings,
  markProfileDraft,
  parseProfilePublicationSnapshot,
  publishProfileLocalization,
  unpublishProfileLocalization,
  writeAdminAuditEvent,
} from '@akiksystems/db';
import {
  profileCapabilityStepKeys,
  profileCrossCuttingKeys,
  profileEmblemSymbolKeys,
  profileGuidanceKeys,
  profileSystemicScaleProcessKeys,
  profileSystemicScaleStepKeys,
  type PlatformLocale,
  type ProfileEditableContent,
} from '@akiksystems/core';
import { randomUUID } from 'node:crypto';

import { requireAdminSession } from './admin.server';
import {
  assetExtensionForMimeType,
  deleteAssetObject,
  putAssetObject,
  validateAssetUpload,
} from './asset-storage.server';
import { appDb } from './db.server';
import { imageDimensions } from './image-dimensions.server';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const contactKinds = ['linkedin', 'github', 'email', 'phone'] as const;
const languageCodes = ['fr', 'en', 'ar'] as const;

function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

function nullableField(form: FormData, name: string): string | null {
  const value = field(form, name);
  return value === '' ? null : value;
}

function booleanField(form: FormData, name: string): boolean {
  return form.get(name) !== null;
}

function lineList(form: FormData, name: string): string[] {
  return field(form, name)
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function requiredUuid(form: FormData, name: string, label: string): string {
  const value = field(form, name);
  if (!uuidPattern.test(value)) {
    throw new Error(label + ' is invalid.');
  }
  return value;
}

function optionalUuid(form: FormData, name: string, label: string): string | null {
  const value = field(form, name);
  if (value === '') return null;
  if (!uuidPattern.test(value)) {
    throw new Error(label + ' is invalid.');
  }
  return value;
}

function requiredLocale(form: FormData): PlatformLocale {
  const locale = field(form, 'locale');
  if (locale !== 'en' && locale !== 'fr') {
    throw new Error('Profile locale is invalid.');
  }
  return locale;
}

function actionScope(
  intent: string,
): 'content' | 'structure' | 'stack' | 'assets' {
  if (intent === 'save-profile-global') return 'structure';
  if (intent.includes('profile-stack')) return 'stack';
  if (
    intent.includes('profile-portrait') ||
    intent.includes('profile-cv')
  ) {
    return 'assets';
  }
  return 'content';
}

function localizedCommand(
  intent: string,
): { operation: 'save' | 'publish'; locale: PlatformLocale } | null {
  const match = /^(save|publish)-profile-localization:(en|fr)$/.exec(intent);
  if (match === null) return null;
  return {
    operation: match[1] as 'save' | 'publish',
    locale: match[2] as PlatformLocale,
  };
}

function profileContentFromForm(form: FormData): ProfileEditableContent {
  return {
    hero: {
      eyebrow: field(form, 'heroEyebrow'),
      professionalTitle: field(form, 'heroProfessionalTitle'),
      specialization: field(form, 'heroSpecialization'),
      introduction: field(form, 'heroIntroduction'),
      cvLabel: field(form, 'heroCvLabel'),
    },
    currentProject: {
      eyebrow: field(form, 'currentProjectEyebrow'),
      roleLabel: field(form, 'currentProjectRoleLabel'),
      role: field(form, 'currentProjectRole'),
      ctaLabel: field(form, 'currentProjectCtaLabel'),
      updatedLabel: field(form, 'currentProjectUpdatedLabel'),
    },
    stack: {
      eyebrow: field(form, 'stackEyebrow'),
      title: field(form, 'stackTitle'),
      introduction: field(form, 'stackIntroduction'),
      proofCountLabel: field(form, 'stackProofCountLabel'),
      inspectSystemLabel: field(form, 'stackInspectSystemLabel'),
    },
    guidance: {
      eyebrow: field(form, 'guidanceEyebrow'),
      title: field(form, 'guidanceTitle'),
      introduction: field(form, 'guidanceIntroduction'),
      centerLabel: field(form, 'guidanceCenterLabel'),
      benefitLabel: field(form, 'guidanceBenefitLabel'),
      avoidanceLabel: field(form, 'guidanceAvoidanceLabel'),
      questionsLabel: field(form, 'guidanceQuestionsLabel'),
      conclusion: field(form, 'guidanceConclusion'),
      looks: Object.fromEntries(
        profileGuidanceKeys.map((key) => [
          key,
          {
            title: field(form, 'guidance_' + key + '_title'),
            description: field(form, 'guidance_' + key + '_description'),
            metricValue: nullableField(form, 'guidance_' + key + '_metricValue'),
            metricLabel: nullableField(form, 'guidance_' + key + '_metricLabel'),
            source: nullableField(form, 'guidance_' + key + '_source'),
            benefit: field(form, 'guidance_' + key + '_benefit'),
            avoidance: field(form, 'guidance_' + key + '_avoidance'),
            questions: lineList(form, 'guidance_' + key + '_questions'),
          },
        ]),
      ) as ProfileEditableContent['guidance']['looks'],
    },
    capabilities: {
      eyebrow: field(form, 'capabilitiesEyebrow'),
      title: field(form, 'capabilitiesTitle'),
      introduction: field(form, 'capabilitiesIntroduction'),
      beforeCodingLabel: field(form, 'capabilitiesBeforeCodingLabel'),
      buildDeliverLabel: field(form, 'capabilitiesBuildDeliverLabel'),
      runLiveLabel: field(form, 'capabilitiesRunLiveLabel'),
      deliverableLabel: field(form, 'capabilitiesDeliverableLabel'),
      crossCuttingLabel: field(form, 'capabilitiesCrossCuttingLabel'),
      steps: Object.fromEntries(
        profileCapabilityStepKeys.map((key) => [
          key,
          {
            title: field(form, 'capability_' + key + '_title'),
            purpose: field(form, 'capability_' + key + '_purpose'),
            actions: lineList(form, 'capability_' + key + '_actions'),
            deliverable: field(form, 'capability_' + key + '_deliverable'),
          },
        ]),
      ) as ProfileEditableContent['capabilities']['steps'],
      crossCutting: Object.fromEntries(
        profileCrossCuttingKeys.map((key) => [
          key,
          {
            title: field(form, 'crossCutting_' + key + '_title'),
            description: field(form, 'crossCutting_' + key + '_description'),
          },
        ]),
      ) as ProfileEditableContent['capabilities']['crossCutting'],
    },
    systemicScale: {
      eyebrow: field(form, 'systemicEyebrow'),
      title: field(form, 'systemicTitle'),
      statementPrimary: field(form, 'systemicStatementPrimary'),
      statementSecondary: field(form, 'systemicStatementSecondary'),
      introduction: field(form, 'systemicIntroduction'),
      reasoningLinkLabel: field(form, 'systemicReasoningLinkLabel'),
      exampleLabel: field(form, 'systemicExampleLabel'),
      questionLabel: field(form, 'systemicQuestionLabel'),
      processLabels: Object.fromEntries(
        profileSystemicScaleProcessKeys.map((key) => [
          key,
          field(form, 'systemicProcess_' + key),
        ]),
      ) as ProfileEditableContent['systemicScale']['processLabels'],
      steps: Object.fromEntries(
        profileSystemicScaleStepKeys.map((key) => [
          key,
          {
            title: field(form, 'systemic_' + key + '_title'),
            principle: field(form, 'systemic_' + key + '_principle'),
            example: field(form, 'systemic_' + key + '_example'),
            question: field(form, 'systemic_' + key + '_question'),
            diagramLeadLabel: field(
              form,
              'systemic_' + key + '_diagramLeadLabel',
            ),
            diagramAlt: field(form, 'systemic_' + key + '_diagramAlt'),
          },
        ]),
      ) as ProfileEditableContent['systemicScale']['steps'],
    },
    emblem: {
      eyebrow: field(form, 'emblemEyebrow'),
      title: field(form, 'emblemTitle'),
      introduction: field(form, 'emblemIntroduction'),
      conclusion: field(form, 'emblemConclusion'),
      symbols: Object.fromEntries(
        profileEmblemSymbolKeys.map((key) => [
          key,
          {
            name: field(form, 'emblem_' + key + '_name'),
            concept: field(form, 'emblem_' + key + '_concept'),
            description: field(form, 'emblem_' + key + '_description'),
          },
        ]),
      ) as ProfileEditableContent['emblem']['symbols'],
    },
    callToAction: {
      eyebrow: field(form, 'ctaEyebrow'),
      title: field(form, 'ctaTitle'),
      body: field(form, 'ctaBody'),
      buttonLabel: field(form, 'ctaButtonLabel'),
    },
  };
}

async function singletonProfile() {
  return appDb
    .selectFrom('profiles')
    .select([
      'id',
      'portrait_asset_id',
      'source_cv_asset_id',
      'current_system_id',
      'systemic_scale_writing_id',
    ])
    .where('singleton_key', '=', 'public')
    .executeTakeFirstOrThrow();
}

async function ensurePublishedSystem(
  systemId: string | null,
  locale: PlatformLocale,
): Promise<void> {
  if (systemId === null) return;

  const row = await appDb
    .selectFrom('system_publications')
    .innerJoin('systems', 'systems.id', 'system_publications.system_id')
    .select('systems.id')
    .where('systems.id', '=', systemId)
    .where('systems.lifecycle', '=', 'active')
    .where('system_publications.locale', '=', locale)
    .executeTakeFirst();

  if (row === undefined) {
    throw new Error(
      'Current project must be a published active System in the selected locale.',
    );
  }
}

async function ensurePublishedWriting(
  writingId: string | null,
  locale: PlatformLocale,
): Promise<void> {
  if (writingId === null) return;

  const row = await appDb
    .selectFrom('writing_publications')
    .innerJoin('writings', 'writings.id', 'writing_publications.writing_id')
    .select('writings.id')
    .where('writings.id', '=', writingId)
    .where('writings.lifecycle', '=', 'active')
    .where('writing_publications.locale', '=', locale)
    .executeTakeFirst();

  if (row === undefined) {
    throw new Error(
      'Systemic Scale Writing must be published in the selected locale.',
    );
  }
}

async function retireUnusedProfileAssets(profileId: string): Promise<void> {
  const profile = await appDb
    .selectFrom('profiles')
    .select(['portrait_asset_id', 'source_cv_asset_id'])
    .where('id', '=', profileId)
    .executeTakeFirstOrThrow();

  const publications = await appDb
    .selectFrom('profile_publications')
    .select('snapshot')
    .where('profile_id', '=', profileId)
    .execute();

  const referenced = new Set<string>();
  if (profile.portrait_asset_id !== null) {
    referenced.add(profile.portrait_asset_id);
  }
  if (profile.source_cv_asset_id !== null) {
    referenced.add(profile.source_cv_asset_id);
  }

  for (const publication of publications) {
    const snapshot = parseProfilePublicationSnapshot(publication.snapshot);
    if (snapshot?.portraitAssetId) referenced.add(snapshot.portraitAssetId);
    if (snapshot?.sourceCvAssetId) referenced.add(snapshot.sourceCvAssetId);
  }

  const ownedAssets = await appDb
    .selectFrom('assets')
    .select(['id', 'storage_key'])
    .where('storage_key', 'like', 'profiles/' + profileId + '/%')
    .execute();

  for (const asset of ownedAssets) {
    if (referenced.has(asset.id)) continue;

    try {
      await deleteAssetObject(asset.storage_key);
    } catch {
      continue;
    }

    await appDb.deleteFrom('assets').where('id', '=', asset.id).execute();
  }
}

async function moveProfileGroup(
  profileId: string,
  groupId: string,
  direction: 'up' | 'down',
): Promise<boolean> {
  const groups = await appDb
    .selectFrom('profile_stack_groups')
    .select(['id', 'position'])
    .where('profile_id', '=', profileId)
    .orderBy('position')
    .execute();

  const currentIndex = groups.findIndex((group) => group.id === groupId);
  const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
  const current = groups[currentIndex];
  const target = groups[targetIndex];
  if (current === undefined || target === undefined) return false;

  const temporaryPosition =
    Math.max(...groups.map((group) => group.position), 0) + 1;

  await appDb.transaction().execute(async (transaction) => {
    await transaction
      .updateTable('profile_stack_groups')
      .set({ position: temporaryPosition, updated_at: new Date() })
      .where('id', '=', current.id)
      .executeTakeFirstOrThrow();

    await transaction
      .updateTable('profile_stack_groups')
      .set({ position: current.position, updated_at: new Date() })
      .where('id', '=', target.id)
      .executeTakeFirstOrThrow();

    await transaction
      .updateTable('profile_stack_groups')
      .set({ position: target.position, updated_at: new Date() })
      .where('id', '=', current.id)
      .executeTakeFirstOrThrow();

    await markProfileDraft(transaction, { profileId });
  });

  return true;
}

async function moveProfileTechnology(
  profileId: string,
  groupId: string,
  technologyId: string,
  direction: 'up' | 'down',
): Promise<boolean> {
  const group = await appDb
    .selectFrom('profile_stack_groups')
    .select('id')
    .where('id', '=', groupId)
    .where('profile_id', '=', profileId)
    .executeTakeFirst();

  if (group === undefined) {
    throw new Error('Profile Stack group not found.');
  }

  const technologies = await appDb
    .selectFrom('profile_stack_group_technologies')
    .select(['technology_id', 'position'])
    .where('group_id', '=', groupId)
    .orderBy('position')
    .execute();

  const currentIndex = technologies.findIndex(
    (technology) => technology.technology_id === technologyId,
  );
  const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
  const current = technologies[currentIndex];
  const target = technologies[targetIndex];
  if (current === undefined || target === undefined) return false;

  const temporaryPosition =
    Math.max(...technologies.map((technology) => technology.position), 0) + 1;

  await appDb.transaction().execute(async (transaction) => {
    await transaction
      .updateTable('profile_stack_group_technologies')
      .set({ position: temporaryPosition })
      .where('group_id', '=', groupId)
      .where('technology_id', '=', current.technology_id)
      .executeTakeFirstOrThrow();

    await transaction
      .updateTable('profile_stack_group_technologies')
      .set({ position: current.position })
      .where('group_id', '=', groupId)
      .where('technology_id', '=', target.technology_id)
      .executeTakeFirstOrThrow();

    await transaction
      .updateTable('profile_stack_group_technologies')
      .set({ position: target.position })
      .where('group_id', '=', groupId)
      .where('technology_id', '=', current.technology_id)
      .executeTakeFirstOrThrow();

    await markProfileDraft(transaction, { profileId });
  });

  return true;
}

export async function loadProfileAdmin(request: Request) {
  const session = await requireAdminSession(request);
  const locale: PlatformLocale =
    new URL(request.url).searchParams.get('locale') === 'fr' ? 'fr' : 'en';

  const [
    profile,
    preview,
    publications,
    systems,
    writings,
    technologies,
    assetRows,
  ] = await Promise.all([
    getDraftProfile(appDb, locale),
    getDraftProfilePreview(appDb, locale),
    appDb
      .selectFrom('profile_publications')
      .select(['locale', 'published_at', 'updated_at'])
      .execute(),
    listPublishedSystemReferences(appDb, { locale }),
    listPublishedWritings(appDb, locale),
    appDb
      .selectFrom('technologies')
      .select(['id', 'slug', 'name'])
      .orderBy('name')
      .orderBy('id')
      .execute(),
    appDb
      .selectFrom('profiles')
      .leftJoin('assets as portrait', 'portrait.id', 'profiles.portrait_asset_id')
      .leftJoin('assets as cv', 'cv.id', 'profiles.source_cv_asset_id')
      .select([
        'profiles.id',
        'portrait.id as portrait_id',
        'portrait.original_filename as portrait_filename',
        'portrait.mime_type as portrait_mime_type',
        'cv.id as cv_id',
        'cv.original_filename as cv_filename',
        'cv.mime_type as cv_mime_type',
      ])
      .where('profiles.singleton_key', '=', 'public')
      .executeTakeFirstOrThrow(),
  ]);

  if (profile === null || preview === null) {
    throw new Response('Profile not found.', { status: 404 });
  }

  const portraitAltRows =
    assetRows.portrait_id === null
      ? []
      : await appDb
          .selectFrom('asset_localizations')
          .select(['locale', 'alt_text'])
          .where('asset_id', '=', assetRows.portrait_id)
          .execute();

  return {
    email: session.user.email,
    locale,
    profile,
    preview,
    publications: publications.map((publication) => ({
      locale: publication.locale,
      publishedAt: publication.published_at.toISOString(),
      updatedAt: publication.updated_at.toISOString(),
    })),
    systems,
    writings: writings.map((writing) => ({
      id: writing.writingId,
      title: writing.title,
      slug: writing.slug,
      href:
        writing.locale === 'fr'
          ? '/fr/ecrits/' + writing.slug
          : '/en/writings/' + writing.slug,
    })),
    technologies,
    assets: {
      portrait:
        assetRows.portrait_id === null
          ? null
          : {
              id: assetRows.portrait_id,
              filename: assetRows.portrait_filename,
              mimeType: assetRows.portrait_mime_type,
              alt: Object.fromEntries(
                portraitAltRows.map((row) => [row.locale, row.alt_text]),
              ),
            },
      cv:
        assetRows.cv_id === null
          ? null
          : {
              id: assetRows.cv_id,
              filename: assetRows.cv_filename,
              mimeType: assetRows.cv_mime_type,
            },
    },
  };
}

export async function handleProfileAdminAction(request: Request) {
  const session = await requireAdminSession(request);
  const form = await request.formData();
  const intent = field(form, '_intent');
  const profile = await singletonProfile();

  try {
    const command = localizedCommand(intent);

    if (command !== null) {
      const content = profileContentFromForm(form);
      const groupRows = await appDb
        .selectFrom('profile_stack_groups')
        .select('id')
        .where('profile_id', '=', profile.id)
        .execute();

      await appDb.transaction().execute(async (transaction) => {
        await transaction
          .updateTable('profile_localizations')
          .set({
            content,
            editorial_state: 'draft',
            published_at: null,
            updated_at: new Date(),
          })
          .where('profile_id', '=', profile.id)
          .where('locale', '=', command.locale)
          .executeTakeFirstOrThrow();

        for (const group of groupRows) {
          const title = field(form, 'stackGroupTitle:' + group.id);

          if (title === '') {
            await transaction
              .deleteFrom('profile_stack_group_localizations')
              .where('group_id', '=', group.id)
              .where('locale', '=', command.locale)
              .execute();
            continue;
          }

          await transaction
            .insertInto('profile_stack_group_localizations')
            .values({
              group_id: group.id,
              locale: command.locale,
              title,
            })
            .onConflict((conflict) =>
              conflict.columns(['group_id', 'locale']).doUpdateSet({
                title,
                updated_at: new Date(),
              }),
            )
            .execute();
        }

        await writeAdminAuditEvent(transaction, {
          actorUserId: session.user.id,
          actorEmail: session.user.email,
          action: 'profile.localization_saved',
          entityType: 'profile',
          entityId: profile.id,
          locale: command.locale,
          metadata: {
            directPublish: command.operation === 'publish',
            publicSnapshotPreserved: command.operation === 'save',
            structureOwnedByCode: true,
          },
        });
      });

      if (command.operation === 'save') {
        return {
          scope: 'content' as const,
          ok: true,
          message: command.locale.toUpperCase() + ' Profile draft saved.',
        };
      }

      const snapshot = await publishProfileLocalization(appDb, {
        locale: command.locale,
      });

      await writeAdminAuditEvent(appDb, {
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: 'profile.localization_published',
        entityType: 'profile',
        entityId: profile.id,
        locale: command.locale,
        metadata: {
          snapshotVersion: snapshot.version,
          stackGroupCount: snapshot.stackGroups.length,
          contactCount: snapshot.contacts.length,
        },
      });

      await retireUnusedProfileAssets(profile.id);

      return {
        scope: 'content' as const,
        ok: true,
        message: command.locale.toUpperCase() + ' Profile published.',
      };
    }

    if (intent === 'unpublish-profile-localization') {
      const locale = requiredLocale(form);

      await unpublishProfileLocalization(appDb, { locale });

      await writeAdminAuditEvent(appDb, {
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: 'profile.localization_unpublished',
        entityType: 'profile',
        entityId: profile.id,
        locale,
        metadata: {},
      });

      await retireUnusedProfileAssets(profile.id);

      return {
        scope: 'content' as const,
        ok: true,
        message: locale.toUpperCase() + ' Profile unpublished.',
      };
    }

    if (intent === 'save-profile-global') {
      const locale = requiredLocale(form);
      const displayName = nullableField(form, 'displayName');
      const currentSystemId = optionalUuid(
        form,
        'currentSystemId',
        'Current System',
      );
      const systemicScaleWritingId = optionalUuid(
        form,
        'systemicScaleWritingId',
        'Systemic Scale Writing',
      );

      const canonicalChecks: Promise<void>[] = [];
      if (currentSystemId !== profile.current_system_id) {
        canonicalChecks.push(ensurePublishedSystem(currentSystemId, locale));
      }
      if (systemicScaleWritingId !== profile.systemic_scale_writing_id) {
        canonicalChecks.push(
          ensurePublishedWriting(systemicScaleWritingId, locale),
        );
      }
      await Promise.all(canonicalChecks);

      const selectedLanguages = form
        .getAll('languages')
        .filter(
          (value): value is (typeof languageCodes)[number] =>
            typeof value === 'string' &&
            languageCodes.includes(value as (typeof languageCodes)[number]),
        );

      await appDb.transaction().execute(async (transaction) => {
        await transaction
          .updateTable('profiles')
          .set({
            display_name: displayName,
            current_system_id: currentSystemId,
            systemic_scale_writing_id: systemicScaleWritingId,
            updated_at: new Date(),
          })
          .where('id', '=', profile.id)
          .executeTakeFirstOrThrow();

        for (const kind of contactKinds) {
          const value = field(form, 'contact:' + kind);

          if (value === '') {
            await transaction
              .deleteFrom('profile_contacts')
              .where('profile_id', '=', profile.id)
              .where('kind', '=', kind)
              .execute();
            continue;
          }

          await transaction
            .insertInto('profile_contacts')
            .values({
              profile_id: profile.id,
              kind,
              value,
              visible: booleanField(form, 'contactVisible:' + kind),
            })
            .onConflict((conflict) =>
              conflict.columns(['profile_id', 'kind']).doUpdateSet({
                value,
                visible: booleanField(form, 'contactVisible:' + kind),
                updated_at: new Date(),
              }),
            )
            .execute();
        }

        await transaction
          .deleteFrom('profile_languages')
          .where('profile_id', '=', profile.id)
          .execute();

        if (selectedLanguages.length > 0) {
          await transaction
            .insertInto('profile_languages')
            .values(
              selectedLanguages.map((languageCode, position) => ({
                profile_id: profile.id,
                language_code: languageCode,
                position,
              })),
            )
            .execute();
        }

        await transaction
          .updateTable('profile_mobility')
          .set({
            worldwide: booleanField(form, 'mobilityWorldwide'),
            remote: booleanField(form, 'mobilityRemote'),
            relocation: booleanField(form, 'mobilityRelocation'),
            updated_at: new Date(),
          })
          .where('profile_id', '=', profile.id)
          .executeTakeFirstOrThrow();

        await markProfileDraft(transaction, { profileId: profile.id });

        await writeAdminAuditEvent(transaction, {
          actorUserId: session.user.id,
          actorEmail: session.user.email,
          action: 'profile.global_structure_saved',
          entityType: 'profile',
          entityId: profile.id,
          locale,
          metadata: {
            localesMarkedDraft: ['en', 'fr'],
            currentSystemId,
            systemicScaleWritingId,
            languageCount: selectedLanguages.length,
          },
        });
      });

      return {
        scope: 'structure' as const,
        ok: true,
        message: 'Profile global structure saved; EN and FR are now draft.',
      };
    }

    if (intent === 'add-profile-stack-group') {
      const locale = requiredLocale(form);
      const title = field(form, 'groupTitle');

      if (title === '') {
        throw new Error('Stack group title is required.');
      }

      const max = await appDb
        .selectFrom('profile_stack_groups')
        .select(({ fn }) => fn.max<number>('position').as('max_position'))
        .where('profile_id', '=', profile.id)
        .executeTakeFirst();

      const groupId = randomUUID();
      const position = (max?.max_position ?? -1) + 1;

      await appDb.transaction().execute(async (transaction) => {
        await transaction
          .insertInto('profile_stack_groups')
          .values({
            id: groupId,
            profile_id: profile.id,
            position,
          })
          .execute();

        await transaction
          .insertInto('profile_stack_group_localizations')
          .values({
            group_id: groupId,
            locale,
            title,
          })
          .execute();

        await markProfileDraft(transaction, { profileId: profile.id });

        await writeAdminAuditEvent(transaction, {
          actorUserId: session.user.id,
          actorEmail: session.user.email,
          action: 'profile.stack_group_added',
          entityType: 'profile',
          entityId: profile.id,
          locale,
          metadata: {
            groupId,
            position,
          },
        });
      });

      return {
        scope: 'stack' as const,
        ok: true,
        message: 'Stack group added; EN and FR are now draft.',
      };
    }

    if (
      intent === 'move-profile-stack-group' ||
      intent === 'remove-profile-stack-group'
    ) {
      const groupId = requiredUuid(form, 'groupId', 'Stack group');

      const group = await appDb
        .selectFrom('profile_stack_groups')
        .select('id')
        .where('id', '=', groupId)
        .where('profile_id', '=', profile.id)
        .executeTakeFirst();

      if (group === undefined) {
        throw new Error('Profile Stack group not found.');
      }

      if (intent === 'remove-profile-stack-group') {
        await appDb.transaction().execute(async (transaction) => {
          await transaction
            .deleteFrom('profile_stack_groups')
            .where('id', '=', groupId)
            .executeTakeFirstOrThrow();

          await markProfileDraft(transaction, { profileId: profile.id });

          await writeAdminAuditEvent(transaction, {
            actorUserId: session.user.id,
            actorEmail: session.user.email,
            action: 'profile.stack_group_removed',
            entityType: 'profile',
            entityId: profile.id,
            metadata: { groupId },
          });
        });

        return {
          scope: 'stack' as const,
          ok: true,
          message: 'Stack group removed; EN and FR are now draft.',
        };
      }

      const direction = field(form, 'direction');
      if (direction !== 'up' && direction !== 'down') {
        throw new Error('Invalid Stack group move direction.');
      }

      const moved = await moveProfileGroup(profile.id, groupId, direction);

      if (moved) {
        await writeAdminAuditEvent(appDb, {
          actorUserId: session.user.id,
          actorEmail: session.user.email,
          action: 'profile.stack_group_order_changed',
          entityType: 'profile',
          entityId: profile.id,
          metadata: { groupId, direction },
        });
      }

      return {
        scope: 'stack' as const,
        ok: true,
        message: moved
          ? 'Stack group order updated; EN and FR are now draft.'
          : 'Stack group is already at that boundary.',
      };
    }

    if (intent === 'add-profile-stack-technology') {
      const groupId = requiredUuid(form, 'groupId', 'Stack group');
      const technologyId = requiredUuid(form, 'technologyId', 'Technology');

      const [group, technology] = await Promise.all([
        appDb
          .selectFrom('profile_stack_groups')
          .select('id')
          .where('id', '=', groupId)
          .where('profile_id', '=', profile.id)
          .executeTakeFirst(),
        appDb
          .selectFrom('technologies')
          .select('id')
          .where('id', '=', technologyId)
          .executeTakeFirst(),
      ]);

      if (group === undefined) {
        throw new Error('Profile Stack group not found.');
      }
      if (technology === undefined) {
        throw new Error('Technology not found.');
      }

      const existing = await appDb
        .selectFrom('profile_stack_group_technologies')
        .select('technology_id')
        .where('group_id', '=', groupId)
        .where('technology_id', '=', technologyId)
        .executeTakeFirst();

      if (existing !== undefined) {
        return {
          scope: 'stack' as const,
          ok: true,
          message: 'Technology is already in this Stack group.',
        };
      }

      const max = await appDb
        .selectFrom('profile_stack_group_technologies')
        .select(({ fn }) => fn.max<number>('position').as('max_position'))
        .where('group_id', '=', groupId)
        .executeTakeFirst();

      await appDb.transaction().execute(async (transaction) => {
        await transaction
          .insertInto('profile_stack_group_technologies')
          .values({
            group_id: groupId,
            technology_id: technologyId,
            position: (max?.max_position ?? -1) + 1,
          })
          .execute();

        await markProfileDraft(transaction, { profileId: profile.id });

        await writeAdminAuditEvent(transaction, {
          actorUserId: session.user.id,
          actorEmail: session.user.email,
          action: 'profile.stack_technology_added',
          entityType: 'profile',
          entityId: profile.id,
          metadata: {
            groupId,
            technologyId,
          },
        });
      });

      return {
        scope: 'stack' as const,
        ok: true,
        message: 'Technology added; EN and FR are now draft.',
      };
    }

    if (
      intent === 'remove-profile-stack-technology' ||
      intent === 'move-profile-stack-technology'
    ) {
      const groupId = requiredUuid(form, 'groupId', 'Stack group');
      const technologyId = requiredUuid(form, 'technologyId', 'Technology');

      const group = await appDb
        .selectFrom('profile_stack_groups')
        .select('id')
        .where('id', '=', groupId)
        .where('profile_id', '=', profile.id)
        .executeTakeFirst();

      if (group === undefined) {
        throw new Error('Profile Stack group not found.');
      }

      if (intent === 'remove-profile-stack-technology') {
        const deleted = await appDb.transaction().execute(
          async (transaction) => {
            const result = await transaction
              .deleteFrom('profile_stack_group_technologies')
              .where('group_id', '=', groupId)
              .where('technology_id', '=', technologyId)
              .executeTakeFirst();

            if (Number(result.numDeletedRows) > 0) {
              await markProfileDraft(transaction, { profileId: profile.id });
              await writeAdminAuditEvent(transaction, {
                actorUserId: session.user.id,
                actorEmail: session.user.email,
                action: 'profile.stack_technology_removed',
                entityType: 'profile',
                entityId: profile.id,
                metadata: { groupId, technologyId },
              });
            }

            return Number(result.numDeletedRows) > 0;
          },
        );

        if (!deleted) {
          throw new Error('Technology is not in this Stack group.');
        }

        return {
          scope: 'stack' as const,
          ok: true,
          message: 'Technology removed; EN and FR are now draft.',
        };
      }

      const direction = field(form, 'direction');
      if (direction !== 'up' && direction !== 'down') {
        throw new Error('Invalid Technology move direction.');
      }

      const moved = await moveProfileTechnology(
        profile.id,
        groupId,
        technologyId,
        direction,
      );

      if (moved) {
        await writeAdminAuditEvent(appDb, {
          actorUserId: session.user.id,
          actorEmail: session.user.email,
          action: 'profile.stack_technology_order_changed',
          entityType: 'profile',
          entityId: profile.id,
          metadata: { groupId, technologyId, direction },
        });
      }

      return {
        scope: 'stack' as const,
        ok: true,
        message: moved
          ? 'Technology order updated; EN and FR are now draft.'
          : 'Technology is already at that boundary.',
      };
    }

    if (
      intent === 'upload-profile-portrait' ||
      intent === 'upload-profile-cv'
    ) {
      const file = form.get('file');
      if (!(file instanceof File)) {
        throw new Error('Choose a file to upload.');
      }

      validateAssetUpload(file);

      const portrait = intent === 'upload-profile-portrait';
      if (portrait && !file.type.startsWith('image/')) {
        throw new Error('Profile portrait must be an image.');
      }
      if (!portrait && file.type !== 'application/pdf') {
        throw new Error('Profile CV must be a PDF.');
      }

      const bytes = new Uint8Array(await file.arrayBuffer());
      const dimensions = imageDimensions(file.type, bytes);
      const assetId = randomUUID();
      const extension = assetExtensionForMimeType(file.type);
      const kind = portrait ? 'portrait' : 'cv';
      const storageKey =
        'profiles/' + profile.id + '/' + kind + '/' + assetId + '.' + extension;

      await putAssetObject(storageKey, file);

      try {
        await appDb.transaction().execute(async (transaction) => {
          await transaction
            .insertInto('assets')
            .values({
              id: assetId,
              storage_key: storageKey,
              original_filename: file.name,
              mime_type: file.type,
              byte_size: file.size,
              width: dimensions?.width ?? null,
              height: dimensions?.height ?? null,
            })
            .execute();

          await transaction
            .insertInto('asset_localizations')
            .values([
              {
                asset_id: assetId,
                locale: 'en',
                alt_text: portrait ? nullableField(form, 'altEn') : null,
                caption: null,
              },
              {
                asset_id: assetId,
                locale: 'fr',
                alt_text: portrait ? nullableField(form, 'altFr') : null,
                caption: null,
              },
            ])
            .execute();

          await transaction
            .updateTable('profiles')
            .set({
              ...(portrait
                ? { portrait_asset_id: assetId }
                : { source_cv_asset_id: assetId }),
              updated_at: new Date(),
            })
            .where('id', '=', profile.id)
            .executeTakeFirstOrThrow();

          await markProfileDraft(transaction, { profileId: profile.id });

          await writeAdminAuditEvent(transaction, {
            actorUserId: session.user.id,
            actorEmail: session.user.email,
            action: portrait
              ? 'profile.portrait_uploaded'
              : 'profile.cv_uploaded',
            entityType: 'asset',
            entityId: assetId,
            metadata: {
              profileId: profile.id,
              mimeType: file.type,
              byteSize: file.size,
            },
          });
        });
      } catch (error) {
        await deleteAssetObject(storageKey).catch(() => undefined);
        throw error;
      }

      await retireUnusedProfileAssets(profile.id);

      return {
        scope: 'assets' as const,
        ok: true,
        message: portrait
          ? 'Portrait uploaded; EN and FR are now draft.'
          : 'CV uploaded; EN and FR are now draft.',
      };
    }

    if (intent === 'save-profile-portrait-alt') {
      if (profile.portrait_asset_id === null) {
        throw new Error('No Profile portrait is selected.');
      }

      const portraitAssetId = profile.portrait_asset_id;

      await appDb.transaction().execute(async (transaction) => {
        for (const locale of ['en', 'fr'] as const) {
          const altText = nullableField(
            form,
            locale === 'en' ? 'altEN' : 'altFR',
          );

          await transaction
            .insertInto('asset_localizations')
            .values({
              asset_id: portraitAssetId,
              locale,
              alt_text: altText,
              caption: null,
            })
            .onConflict((conflict) =>
              conflict.columns(['asset_id', 'locale']).doUpdateSet({
                alt_text: altText,
                updated_at: new Date(),
              }),
            )
            .execute();
        }

        await markProfileDraft(transaction, { profileId: profile.id });
        await writeAdminAuditEvent(transaction, {
          actorUserId: session.user.id,
          actorEmail: session.user.email,
          action: 'profile.portrait_alt_saved',
          entityType: 'asset',
          entityId: portraitAssetId,
          metadata: { profileId: profile.id, locales: ['en', 'fr'] },
        });
      });

      return {
        scope: 'assets' as const,
        ok: true,
        message: 'Portrait alternative text saved; EN and FR are now draft.',
      };
    }

    if (
      intent === 'remove-profile-portrait' ||
      intent === 'remove-profile-cv'
    ) {
      const portrait = intent === 'remove-profile-portrait';

      await appDb.transaction().execute(async (transaction) => {
        await transaction
          .updateTable('profiles')
          .set({
            ...(portrait
              ? { portrait_asset_id: null }
              : { source_cv_asset_id: null }),
            updated_at: new Date(),
          })
          .where('id', '=', profile.id)
          .executeTakeFirstOrThrow();

        await markProfileDraft(transaction, { profileId: profile.id });
        await writeAdminAuditEvent(transaction, {
          actorUserId: session.user.id,
          actorEmail: session.user.email,
          action: portrait
            ? 'profile.portrait_removed_from_draft'
            : 'profile.cv_removed_from_draft',
          entityType: 'profile',
          entityId: profile.id,
          metadata: {
            assetId: portrait
              ? profile.portrait_asset_id
              : profile.source_cv_asset_id,
          },
        });
      });

      await retireUnusedProfileAssets(profile.id);

      return {
        scope: 'assets' as const,
        ok: true,
        message: portrait
          ? 'Portrait removed from draft; EN and FR are now draft.'
          : 'CV removed from draft; EN and FR are now draft.',
      };
    }

    return {
      scope: 'content' as const,
      ok: false,
      message: 'Unsupported Profile operation.',
    };
  } catch (error) {
    return {
      scope: actionScope(intent),
      ok: false,
      message:
        error instanceof Error ? error.message : 'Profile operation failed.',
    };
  }
}
