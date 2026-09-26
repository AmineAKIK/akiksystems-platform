import {
  getDraftProfile,
  listPublishedSystemReferences,
  writeAdminAuditEvent,
} from '@akiksystems/db';
import { BrandSignature, Button, Container, Heading, Link, Text } from '@akiksystems/ui';
import { randomUUID } from 'node:crypto';
import { Form, useActionData, useLoaderData } from 'react-router';

import {
  assetExtensionForMimeType,
  deleteAssetObject,
  putAssetObject,
  validateAssetUpload,
} from '../lib/asset-storage.server';
import { AdminProfileInlineEditor } from '../components/admin-profile-inline-editor';
import { requireAdminSession } from '../lib/admin.server';
import { appDb } from '../lib/db.server';

import type { Route } from './+types/admin-profile';

const technologyJourneyStages = [
  { key: 'programming', position: 0, label: 'Programming' },
  { key: 'networks_telecom', position: 1, label: 'Networks / telecom' },
  { key: 'it_support', position: 2, label: 'IT support' },
  { key: 'industry', position: 3, label: 'Relevant industry' },
  { key: 'development_akiksystems', position: 4, label: 'Development / AkikSystems' },
] as const;

const imageMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
]);

function textField(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

function optionalText(form: FormData, name: string): string | null {
  const value = textField(form, name);
  return value === '' ? null : value;
}

interface ParsedWorkPrinciple {
  enTitle: string;
  enDetail: string | null;
  frTitle: string;
  frDetail: string | null;
}

function parseWorkPrinciples(value: string): ParsedWorkPrinciple[] {
  const lines = value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length > 8) {
    throw new Error('How I work is limited to eight concise principles.');
  }

  return lines.map((line, index) => {
    const parts = line.split('||');
    if (parts.length !== 2) {
      throw new Error(
        `Principle line ${index + 1} must use "EN title | EN detail || FR title | FR detail".`,
      );
    }

    const [enPart, frPart] = parts;
    const [enTitleRaw, ...enDetailParts] = (enPart ?? '').split('|');
    const [frTitleRaw, ...frDetailParts] = (frPart ?? '').split('|');
    const enTitle = (enTitleRaw ?? '').trim();
    const frTitle = (frTitleRaw ?? '').trim();
    const enDetail = enDetailParts.join('|').trim() || null;
    const frDetail = frDetailParts.join('|').trim() || null;

    if (enTitle === '' || frTitle === '') {
      throw new Error(
        `Principle line ${index + 1} requires both English and French titles.`,
      );
    }

    if (enTitle.length > 80 || frTitle.length > 80) {
      throw new Error(
        `Principle line ${index + 1} titles must stay within 80 characters.`,
      );
    }

    if ((enDetail?.length ?? 0) > 240 || (frDetail?.length ?? 0) > 240) {
      throw new Error(
        `Principle line ${index + 1} details must stay within 240 characters.`,
      );
    }

    const publicCopy = [enTitle, enDetail, frTitle, frDetail]
      .filter((part): part is string => part !== null)
      .join(' ');

    if (/\bcssov\b/i.test(publicCopy)) {
      throw new Error(
        'Public working principles must describe the practice directly without naming CSSOV.',
      );
    }

    return { enTitle, enDetail, frTitle, frDetail };
  });
}

interface ParsedCapability {
  enTitle: string;
  enSummary: string | null;
  frTitle: string;
  frSummary: string | null;
}

interface ParsedCapabilityGroup {
  enTitle: string;
  frTitle: string;
  capabilities: ParsedCapability[];
}

function parseCapabilities(value: string): ParsedCapabilityGroup[] {
  const groups: ParsedCapabilityGroup[] = [];
  let current: ParsedCapabilityGroup | null = null;

  for (const [index, rawLine] of value.split('\n').entries()) {
    const line = rawLine.trim();
    if (line === '') continue;

    if (line.startsWith('#')) {
      const parts = line.slice(1).split('||');
      if (parts.length !== 2) {
        throw new Error(
          `Capability group line ${index + 1} must use "# EN group || FR group".`,
        );
      }

      const enTitle = (parts[0] ?? '').trim();
      const frTitle = (parts[1] ?? '').trim();
      if (enTitle === '' || frTitle === '') {
        throw new Error(
          `Capability group line ${index + 1} requires EN and FR titles.`,
        );
      }

      current = { enTitle, frTitle, capabilities: [] };
      groups.push(current);
      continue;
    }

    if (current === null) {
      throw new Error(
        `Capability line ${index + 1} must follow a "# EN group || FR group" line.`,
      );
    }

    const parts = line.split('||');
    if (parts.length !== 2) {
      throw new Error(
        `Capability line ${index + 1} must use "EN title | EN summary || FR title | FR summary".`,
      );
    }

    const [enTitleRaw, ...enSummaryParts] = (parts[0] ?? '').split('|');
    const [frTitleRaw, ...frSummaryParts] = (parts[1] ?? '').split('|');
    const enTitle = (enTitleRaw ?? '').trim();
    const frTitle = (frTitleRaw ?? '').trim();

    if (enTitle === '' || frTitle === '') {
      throw new Error(
        `Capability line ${index + 1} requires EN and FR titles.`,
      );
    }

    current.capabilities.push({
      enTitle,
      enSummary: enSummaryParts.join('|').trim() || null,
      frTitle,
      frSummary: frSummaryParts.join('|').trim() || null,
    });
  }

  if (groups.length > 8) {
    throw new Error('Capabilities are limited to eight groups.');
  }

  for (const group of groups) {
    if (group.capabilities.length === 0) {
      throw new Error(
        `Capability group "${group.enTitle}" must contain at least one capability.`,
      );
    }
    if (group.capabilities.length > 12) {
      throw new Error(
        `Capability group "${group.enTitle}" is limited to twelve capabilities.`,
      );
    }
  }

  return groups;
}

async function publicProfileId(): Promise<string> {
  const profile = await appDb
    .selectFrom('profiles')
    .select('id')
    .where('singleton_key', '=', 'public')
    .executeTakeFirst();

  if (profile === undefined) {
    throw new Response('Profile not found.', { status: 404 });
  }

  return profile.id;
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await requireAdminSession(request);
  const profileId = await publicProfileId();
  const activeLocale =
    new URL(request.url).searchParams.get('locale') === 'fr' ? 'fr' : 'en';

  const [
    profile,
    localizations,
    portrait,
    sourceCv,
    auditEvents,
    selectableSystems,
    selectedSystems,
    selectableExperiences,
    selectedExperiences,
    publications,
  ] = await Promise.all([
    appDb
      .selectFrom('profiles')
      .select(['id', 'display_name', 'portrait_asset_id', 'source_cv_asset_id'])
      .where('id', '=', profileId)
      .executeTakeFirstOrThrow(),
    appDb
      .selectFrom('profile_localizations')
      .select([
        'locale',
        'professional_title',
        'introduction',
        'foundational_copy',
      ])
      .where('profile_id', '=', profileId)
      .execute(),
    appDb
      .selectFrom('profiles')
      .innerJoin('assets', 'assets.id', 'profiles.portrait_asset_id')
      .leftJoin(
        'asset_localizations as portrait_en',
        (join) =>
          join
            .onRef('portrait_en.asset_id', '=', 'assets.id')
            .on('portrait_en.locale', '=', 'en'),
      )
      .leftJoin(
        'asset_localizations as portrait_fr',
        (join) =>
          join
            .onRef('portrait_fr.asset_id', '=', 'assets.id')
            .on('portrait_fr.locale', '=', 'fr'),
      )
      .select([
        'assets.id',
        'assets.original_filename',
        'assets.mime_type',
        'assets.byte_size',
        'portrait_en.alt_text as alt_en',
        'portrait_fr.alt_text as alt_fr',
      ])
      .where('profiles.id', '=', profileId)
      .executeTakeFirst(),
    appDb
      .selectFrom('profiles')
      .innerJoin('assets', 'assets.id', 'profiles.source_cv_asset_id')
      .select([
        'assets.id as cv_asset_id',
        'assets.original_filename as cv_original_filename',
        'assets.mime_type as cv_mime_type',
        'assets.byte_size as cv_byte_size',
      ])
      .where('profiles.id', '=', profileId)
      .executeTakeFirst(),
    appDb
      .selectFrom('admin_audit_events')
      .select([
        'id',
        'actor_email',
        'action',
        'locale',
        'metadata',
        'created_at',
      ])
      .where('entity_type', '=', 'profile')
      .where('entity_id', '=', profileId)
      .orderBy('created_at', 'desc')
      .limit(20)
      .execute(),
    appDb
      .selectFrom('systems')
      .leftJoin(
        'system_localizations as system_en',
        (join) =>
          join
            .onRef('system_en.system_id', '=', 'systems.id')
            .on('system_en.locale', '=', 'en'),
      )
      .leftJoin(
        'system_localizations as system_fr',
        (join) =>
          join
            .onRef('system_fr.system_id', '=', 'systems.id')
            .on('system_fr.locale', '=', 'fr'),
      )
      .select([
        'systems.id',
        'systems.lifecycle',
        'system_en.title as title_en',
        'system_fr.title as title_fr',
      ])
      .where('systems.lifecycle', '=', 'active')
      .orderBy('systems.created_at', 'desc')
      .execute(),
    appDb
      .selectFrom('profile_systems')
      .select(['system_id', 'position'])
      .where('profile_id', '=', profileId)
      .orderBy('position')
      .execute(),
    appDb
      .selectFrom('experiences')
      .leftJoin(
        'experience_localizations as experience_en',
        (join) =>
          join
            .onRef('experience_en.experience_id', '=', 'experiences.id')
            .on('experience_en.locale', '=', 'en'),
      )
      .leftJoin(
        'experience_localizations as experience_fr',
        (join) =>
          join
            .onRef('experience_fr.experience_id', '=', 'experiences.id')
            .on('experience_fr.locale', '=', 'fr'),
      )
      .select([
        'experiences.id',
        'experience_en.title as title_en',
        'experience_en.summary as summary_en',
        'experience_fr.title as title_fr',
        'experience_fr.summary as summary_fr',
      ])
      .orderBy('experiences.created_at', 'desc')
      .execute(),
    appDb
      .selectFrom('profile_experiences')
      .select(['experience_id', 'position'])
      .where('profile_id', '=', profileId)
      .orderBy('position')
      .execute(),
    appDb
      .selectFrom('profile_publications')
      .select(['locale', 'published_at', 'updated_at'])
      .where('profile_id', '=', profileId)
      .execute(),
  ]);

  const byLocale = new Map(
    localizations.map((localization) => [localization.locale, localization]),
  );

  const principles = await appDb
    .selectFrom('profile_work_principles')
    .leftJoin(
      'profile_work_principle_localizations as principle_en',
      (join) =>
        join
          .onRef('principle_en.principle_id', '=', 'profile_work_principles.id')
          .on('principle_en.locale', '=', 'en'),
    )
    .leftJoin(
      'profile_work_principle_localizations as principle_fr',
      (join) =>
        join
          .onRef('principle_fr.principle_id', '=', 'profile_work_principles.id')
          .on('principle_fr.locale', '=', 'fr'),
    )
    .select([
      'profile_work_principles.id',
      'profile_work_principles.position',
      'profile_work_principles.evidence_system_id',
      'principle_en.title as title_en',
      'principle_en.detail as detail_en',
      'principle_fr.title as title_fr',
      'principle_fr.detail as detail_fr',
    ])
    .where('profile_work_principles.profile_id', '=', profileId)
    .orderBy('profile_work_principles.position')
    .execute();

  const capabilityRows = await appDb
    .selectFrom('profile_capability_groups')
    .leftJoin(
      'profile_capability_group_localizations as capability_group_en',
      (join) =>
        join
          .onRef(
            'capability_group_en.group_id',
            '=',
            'profile_capability_groups.id',
          )
          .on('capability_group_en.locale', '=', 'en'),
    )
    .leftJoin(
      'profile_capability_group_localizations as capability_group_fr',
      (join) =>
        join
          .onRef(
            'capability_group_fr.group_id',
            '=',
            'profile_capability_groups.id',
          )
          .on('capability_group_fr.locale', '=', 'fr'),
    )
    .leftJoin(
      'profile_capabilities',
      'profile_capabilities.group_id',
      'profile_capability_groups.id',
    )
    .leftJoin(
      'profile_capability_localizations as capability_en',
      (join) =>
        join
          .onRef(
            'capability_en.capability_id',
            '=',
            'profile_capabilities.id',
          )
          .on('capability_en.locale', '=', 'en'),
    )
    .leftJoin(
      'profile_capability_localizations as capability_fr',
      (join) =>
        join
          .onRef(
            'capability_fr.capability_id',
            '=',
            'profile_capabilities.id',
          )
          .on('capability_fr.locale', '=', 'fr'),
    )
    .select([
      'profile_capability_groups.id as group_id',
      'profile_capability_groups.position as group_position',
      'capability_group_en.title as group_title_en',
      'capability_group_fr.title as group_title_fr',
      'profile_capabilities.id as capability_id',
      'profile_capabilities.position as capability_position',
      'capability_en.title as capability_title_en',
      'capability_en.summary as capability_summary_en',
      'capability_fr.title as capability_title_fr',
      'capability_fr.summary as capability_summary_fr',
    ])
    .where('profile_capability_groups.profile_id', '=', profileId)
    .orderBy('profile_capability_groups.position')
    .orderBy('profile_capabilities.position')
    .execute();

  const profileLanguages = await appDb
    .selectFrom('profile_languages')
    .select(['language_code', 'position'])
    .where('profile_id', '=', profileId)
    .orderBy('position')
    .execute();

  const profileMobility =
    (await appDb
      .selectFrom('profile_mobility')
      .select(['worldwide', 'remote', 'relocation'])
      .where('profile_id', '=', profileId)
      .executeTakeFirst()) ?? {
      worldwide: false,
      remote: false,
      relocation: false,
    };

  const technologyJourneyRows = await appDb
    .selectFrom('profile_technology_journey_stages')
    .leftJoin(
      'profile_technology_journey_stage_localizations as journey_en',
      (join) =>
        join
          .onRef(
            'journey_en.profile_id',
            '=',
            'profile_technology_journey_stages.profile_id',
          )
          .onRef(
            'journey_en.stage_key',
            '=',
            'profile_technology_journey_stages.stage_key',
          )
          .on('journey_en.locale', '=', 'en'),
    )
    .leftJoin(
      'profile_technology_journey_stage_localizations as journey_fr',
      (join) =>
        join
          .onRef(
            'journey_fr.profile_id',
            '=',
            'profile_technology_journey_stages.profile_id',
          )
          .onRef(
            'journey_fr.stage_key',
            '=',
            'profile_technology_journey_stages.stage_key',
          )
          .on('journey_fr.locale', '=', 'fr'),
    )
    .select([
      'profile_technology_journey_stages.stage_key',
      'profile_technology_journey_stages.position',
      'profile_technology_journey_stages.evidence_experience_id',
      'profile_technology_journey_stages.evidence_system_id',
      'journey_en.title as title_en',
      'journey_en.summary as summary_en',
      'journey_fr.title as title_fr',
      'journey_fr.summary as summary_fr',
    ])
    .where('profile_technology_journey_stages.profile_id', '=', profileId)
    .orderBy('profile_technology_journey_stages.position')
    .execute();

  const draftProfile = await getDraftProfile(appDb, activeLocale);
  if (draftProfile === null) {
    throw new Response('Profile draft not found.', { status: 404 });
  }

  const referenceIds = [
    ...new Set([
      ...draftProfile.representativeSystems.map(({ id }) => id),
      ...draftProfile.workPrinciples.flatMap(({ evidenceSystem }) =>
        evidenceSystem === null ? [] : [evidenceSystem.id],
      ),
      ...draftProfile.technologyJourney.flatMap(({ evidence }) =>
        evidence?.kind === 'system' ? [evidence.id] : [],
      ),
    ]),
  ];
  const draftSystemReferences = await listPublishedSystemReferences(appDb, {
    locale: activeLocale,
    ids: referenceIds,
  });

  return {
    profile,
    en: byLocale.get('en') ?? null,
    fr: byLocale.get('fr') ?? null,
    portrait: portrait ?? null,
    sourceCv: sourceCv ?? null,
    principles,
    capabilityRows,
    profileLanguages,
    profileMobility,
    technologyJourneyRows,
    selectableSystems,
    selectedSystems,
    selectableExperiences,
    selectedExperiences,
    publications: publications.map((publication) => ({
      ...publication,
      published_at: publication.published_at.toISOString(),
      updated_at: publication.updated_at.toISOString(),
    })),
    auditEvents: auditEvents.map((event) => ({
      ...event,
      created_at: event.created_at.toISOString(),
    })),
    activeLocale,
    draftProfile,
    draftSystemReferences,
    operatorEmail: session.user.email,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const session = await requireAdminSession(request);
  const profileId = await publicProfileId();
  const form = await request.formData();
  const intent = textField(form, '_intent');

  if (intent === 'profile-inline-save' || intent === 'profile-inline-publish') {
    const localeValue = textField(form, 'locale');
    if (localeValue !== 'en' && localeValue !== 'fr') {
      return { ok: false, message: 'Profile locale must be EN or FR.' };
    }
    const locale = localeValue;
    const displayName = optionalText(form, 'displayName');
    const professionalTitle = optionalText(form, 'professionalTitle');
    const introduction = optionalText(form, 'introduction');
    const foundationalCopy = optionalText(form, 'foundationalCopy');

    if ((displayName?.length ?? 0) > 80) {
      return {
        ok: false,
        message: 'Display name must stay within 80 characters.',
      };
    }
    if ((professionalTitle?.length ?? 0) > 100) {
      return {
        ok: false,
        message: 'Professional title must stay within 100 characters.',
      };
    }
    if ((introduction?.length ?? 0) > 320) {
      return {
        ok: false,
        message: 'Introduction must stay within 320 characters.',
      };
    }
    if ((foundationalCopy?.length ?? 0) > 600) {
      return {
        ok: false,
        message: 'Foundational profile copy must stay within 600 characters.',
      };
    }

    const [
      principleRows,
      journeyRows,
      capabilityGroupRows,
      capabilityRows,
      technologies,
    ] = await Promise.all([
      appDb
        .selectFrom('profile_work_principles')
        .select(['id'])
        .where('profile_id', '=', profileId)
        .orderBy('position')
        .execute(),
      appDb
        .selectFrom('profile_technology_journey_stage_localizations')
        .select(['stage_key'])
        .where('profile_id', '=', profileId)
        .where('locale', '=', locale)
        .execute(),
      appDb
        .selectFrom('profile_capability_groups')
        .select(['id'])
        .where('profile_id', '=', profileId)
        .orderBy('position')
        .execute(),
      appDb
        .selectFrom('profile_capabilities')
        .innerJoin(
          'profile_capability_groups',
          'profile_capability_groups.id',
          'profile_capabilities.group_id',
        )
        .select(['profile_capabilities.id'])
        .where('profile_capability_groups.profile_id', '=', profileId)
        .orderBy('profile_capability_groups.position')
        .orderBy('profile_capabilities.position')
        .execute(),
      appDb.selectFrom('technologies').select(['name', 'slug']).execute(),
    ]);

    const principleUpdates = principleRows.map(({ id }) => {
      const title = textField(form, `principle-${id}-title`);
      const detail = optionalText(form, `principle-${id}-detail`);

      if (title === '') {
        throw new Response('Working principle titles cannot be empty.', {
          status: 400,
        });
      }
      if (title.length > 80 || (detail?.length ?? 0) > 240) {
        throw new Response(
          'Working principle titles must stay within 80 characters and details within 240 characters.',
          { status: 400 },
        );
      }
      if (/\bcssov\b/i.test([title, detail].filter(Boolean).join(' '))) {
        throw new Response(
          'Public working principles must describe the practice directly without naming CSSOV.',
          { status: 400 },
        );
      }

      return { id, title, detail };
    });

    const journeyUpdates = journeyRows.map(({ stage_key }) => {
      const title = textField(form, `journey-${stage_key}-title`);
      const summary = optionalText(form, `journey-${stage_key}-summary`);

      if (title === '') {
        throw new Response('Technological journey titles cannot be empty.', {
          status: 400,
        });
      }
      if (title.length > 80 || (summary?.length ?? 0) > 280) {
        throw new Response(
          'Technological journey titles must stay within 80 characters and summaries within 280 characters.',
          { status: 400 },
        );
      }

      return { key: stage_key, title, summary };
    });

    const technologyTerms = new Set(
      technologies.flatMap(({ name, slug }) => [
        name.trim().toLocaleLowerCase(),
        slug.trim().toLocaleLowerCase(),
      ]),
    );

    const groupUpdates = capabilityGroupRows.map(({ id }) => {
      const title = textField(form, `capability-group-${id}-title`);
      if (title === '') {
        throw new Response('Capability group titles cannot be empty.', {
          status: 400,
        });
      }
      if (title.length > 80) {
        throw new Response(
          'Capability group titles must stay within 80 characters.',
          { status: 400 },
        );
      }
      if (technologyTerms.has(title.toLocaleLowerCase())) {
        throw new Response(
          'Capability groups must describe abilities, not Technology names.',
          { status: 400 },
        );
      }
      return { id, title };
    });

    const capabilityUpdates = capabilityRows.map(({ id }) => {
      const title = textField(form, `capability-${id}-title`);
      const summary = optionalText(form, `capability-${id}-summary`);
      if (title === '') {
        throw new Response('Capability titles cannot be empty.', {
          status: 400,
        });
      }
      if (title.length > 100 || (summary?.length ?? 0) > 280) {
        throw new Response(
          'Capability titles must stay within 100 characters and summaries within 280 characters.',
          { status: 400 },
        );
      }
      if (technologyTerms.has(title.toLocaleLowerCase())) {
        throw new Response(
          'Capabilities must describe conceptual or engineering abilities, not Technology names.',
          { status: 400 },
        );
      }
      return { id, title, summary };
    });

    await appDb.transaction().execute(async (transaction) => {
      await transaction
        .updateTable('profiles')
        .set({
          display_name: displayName,
          updated_at: new Date(),
        })
        .where('id', '=', profileId)
        .executeTakeFirstOrThrow();

      await transaction
        .updateTable('profile_localizations')
        .set({
          professional_title: professionalTitle,
          introduction,
          foundational_copy: foundationalCopy,
          updated_at: new Date(),
        })
        .where('profile_id', '=', profileId)
        .where('locale', '=', locale)
        .executeTakeFirstOrThrow();

      for (const principle of principleUpdates) {
        await transaction
          .updateTable('profile_work_principle_localizations')
          .set({
            title: principle.title,
            detail: principle.detail,
            updated_at: new Date(),
          })
          .where('principle_id', '=', principle.id)
          .where('locale', '=', locale)
          .executeTakeFirstOrThrow();
      }

      for (const stage of journeyUpdates) {
        await transaction
          .updateTable('profile_technology_journey_stage_localizations')
          .set({
            title: stage.title,
            summary: stage.summary,
            updated_at: new Date(),
          })
          .where('profile_id', '=', profileId)
          .where('stage_key', '=', stage.key)
          .where('locale', '=', locale)
          .executeTakeFirstOrThrow();
      }

      for (const group of groupUpdates) {
        await transaction
          .updateTable('profile_capability_group_localizations')
          .set({ title: group.title })
          .where('group_id', '=', group.id)
          .where('locale', '=', locale)
          .executeTakeFirstOrThrow();
      }

      for (const capability of capabilityUpdates) {
        await transaction
          .updateTable('profile_capability_localizations')
          .set({
            title: capability.title,
            summary: capability.summary,
          })
          .where('capability_id', '=', capability.id)
          .where('locale', '=', locale)
          .executeTakeFirstOrThrow();
      }

      await writeAdminAuditEvent(transaction, {
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: 'profile.inline_copy_updated',
        entityType: 'profile',
        entityId: profileId,
        locale,
        metadata: {
          principleCount: principleUpdates.length,
          journeyStageCount: journeyUpdates.length,
          capabilityGroupCount: groupUpdates.length,
          capabilityCount: capabilityUpdates.length,
          editor: 'public-layout',
        },
      });
    });

    if (intent === 'profile-inline-save') {
      return {
        ok: true,
        message: `${locale.toUpperCase()} Profile draft saved.`,
      };
    }

    const draft = await getDraftProfile(appDb, locale);
    if (
      draft === null ||
      draft.displayName === null ||
      draft.professionalTitle === null ||
      draft.introduction === null
    ) {
      return {
        ok: false,
        message: `${locale.toUpperCase()} Profile cannot publish until display name, professional title, and introduction are complete.`,
      };
    }

    const now = new Date();
    await appDb.transaction().execute(async (transaction) => {
      await transaction
        .insertInto('profile_publications')
        .values({
          profile_id: profileId,
          locale,
          snapshot: draft as unknown as Record<string, unknown>,
          published_at: now,
          updated_at: now,
        })
        .onConflict((conflict) =>
          conflict.columns(['profile_id', 'locale']).doUpdateSet({
            snapshot: draft as unknown as Record<string, unknown>,
            published_at: now,
            updated_at: now,
          }),
        )
        .execute();

      await writeAdminAuditEvent(transaction, {
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: 'profile.localization_published',
        entityType: 'profile',
        entityId: profileId,
        locale,
        metadata: {
          snapshotVersion: 1,
          representativeSystemCount: draft.representativeSystems.length,
          workPrincipleCount: draft.workPrinciples.length,
          source: 'inline-editor',
        },
      });
    });

    return {
      ok: true,
      message: `${locale.toUpperCase()} Profile saved and published.`,
    };
  }

  if (intent === 'profile-publish' || intent === 'profile-unpublish') {
    const localeValue = textField(form, 'locale');
    if (localeValue !== 'en' && localeValue !== 'fr') {
      return { ok: false, message: 'Profile locale must be EN or FR.' };
    }
    const locale = localeValue;

    if (intent === 'profile-unpublish') {
      await appDb.transaction().execute(async (transaction) => {
        await transaction
          .deleteFrom('profile_publications')
          .where('profile_id', '=', profileId)
          .where('locale', '=', locale)
          .execute();

        await writeAdminAuditEvent(transaction, {
          actorUserId: session.user.id,
          actorEmail: session.user.email,
          action: 'profile.localization_unpublished',
          entityType: 'profile',
          entityId: profileId,
          locale,
          metadata: {},
        });
      });

      return { ok: true, message: `${locale.toUpperCase()} Profile unpublished.` };
    }

    const draft = await getDraftProfile(appDb, locale);
    if (
      draft === null ||
      draft.displayName === null ||
      draft.professionalTitle === null ||
      draft.introduction === null
    ) {
      return {
        ok: false,
        message: `${locale.toUpperCase()} Profile cannot publish until display name, professional title, and introduction are complete.`,
      };
    }

    const now = new Date();
    await appDb.transaction().execute(async (transaction) => {
      await transaction
        .insertInto('profile_publications')
        .values({
          profile_id: profileId,
          locale,
          snapshot: draft as unknown as Record<string, unknown>,
          published_at: now,
          updated_at: now,
        })
        .onConflict((conflict) =>
          conflict.columns(['profile_id', 'locale']).doUpdateSet({
            snapshot: draft as unknown as Record<string, unknown>,
            published_at: now,
            updated_at: now,
          }),
        )
        .execute();

      await writeAdminAuditEvent(transaction, {
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: 'profile.localization_published',
        entityType: 'profile',
        entityId: profileId,
        locale,
        metadata: {
          snapshotVersion: 1,
          representativeSystemCount: draft.representativeSystems.length,
          workPrincipleCount: draft.workPrinciples.length,
        },
      });
    });

    return { ok: true, message: `${locale.toUpperCase()} Profile published from current draft.` };
  }

  if (intent === 'identity') {
    const displayName = optionalText(form, 'displayName');
    if (displayName !== null && displayName.length > 80) {
      return { ok: false, message: 'Display name must stay within 80 characters.' };
    }

    const localized = {
      en: {
        professional_title: optionalText(form, 'professionalTitleEn'),
        introduction: optionalText(form, 'introductionEn'),
        foundational_copy: optionalText(form, 'foundationalCopyEn'),
      },
      fr: {
        professional_title: optionalText(form, 'professionalTitleFr'),
        introduction: optionalText(form, 'introductionFr'),
        foundational_copy: optionalText(form, 'foundationalCopyFr'),
      },
    };

    for (const [locale, values] of Object.entries(localized)) {
      if ((values.professional_title?.length ?? 0) > 100) {
        return {
          ok: false,
          message: `${locale.toUpperCase()} professional title must stay within 100 characters.`,
        };
      }
      if ((values.introduction?.length ?? 0) > 320) {
        return {
          ok: false,
          message: `${locale.toUpperCase()} introduction must stay within 320 characters.`,
        };
      }
      if ((values.foundational_copy?.length ?? 0) > 600) {
        return {
          ok: false,
          message: `${locale.toUpperCase()} foundational copy must stay within 600 characters.`,
        };
      }
    }

    await appDb.transaction().execute(async (transaction) => {
      await transaction
        .updateTable('profiles')
        .set({
          display_name: displayName,
          updated_at: new Date(),
        })
        .where('id', '=', profileId)
        .executeTakeFirstOrThrow();

      for (const locale of ['en', 'fr'] as const) {
        await transaction
          .updateTable('profile_localizations')
          .set({
            ...localized[locale],
            updated_at: new Date(),
          })
          .where('profile_id', '=', profileId)
          .where('locale', '=', locale)
          .executeTakeFirstOrThrow();
      }

      await writeAdminAuditEvent(transaction, {
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: 'profile.identity_updated',
        entityType: 'profile',
        entityId: profileId,
        metadata: {
          displayNamePresent: displayName !== null,
          localizedFields: [
            'professional_title',
            'introduction',
            'foundational_copy',
          ],
          locales: ['en', 'fr'],
        },
      });
    });

    return { ok: true, message: 'Professional identity updated.' };
  }

  if (intent === 'work-principle-evidence') {
    const currentPrinciples = await appDb
      .selectFrom('profile_work_principles')
      .select(['id'])
      .where('profile_id', '=', profileId)
      .execute();

    const assignments = currentPrinciples.map(({ id }) => {
      const value = form.get(`evidence-${id}`);
      return {
        principleId: id,
        systemId:
          typeof value === 'string' && value.trim() !== '' ? value.trim() : null,
      };
    });

    const selectedSystemIds = [
      ...new Set(
        assignments
          .map(({ systemId }) => systemId)
          .filter((systemId): systemId is string => systemId !== null),
      ),
    ];

    if (selectedSystemIds.length > 0) {
      const validSystems = await appDb
        .selectFrom('systems')
        .select('id')
        .where('lifecycle', '=', 'active')
        .where('id', 'in', selectedSystemIds)
        .execute();

      if (validSystems.length !== selectedSystemIds.length) {
        return {
          ok: false,
          message: 'Principle evidence must reference active System objects.',
        };
      }
    }

    await appDb.transaction().execute(async (transaction) => {
      for (const assignment of assignments) {
        await transaction
          .updateTable('profile_work_principles')
          .set({
            evidence_system_id: assignment.systemId,
            updated_at: new Date(),
          })
          .where('id', '=', assignment.principleId)
          .where('profile_id', '=', profileId)
          .executeTakeFirstOrThrow();
      }

      await writeAdminAuditEvent(transaction, {
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: 'profile.work_principle_evidence_updated',
        entityType: 'profile',
        entityId: profileId,
        metadata: {
          principleCount: assignments.length,
          evidenceCount: assignments.filter(({ systemId }) => systemId !== null)
            .length,
        },
      });
    });

    return { ok: true, message: 'How I work evidence updated.' };
  }

  if (intent === 'work-principles') {
    let principles: ParsedWorkPrinciple[];

    try {
      principles = parseWorkPrinciples(textField(form, 'workPrinciples'));
    } catch (error) {
      return {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : 'Working principles are invalid.',
      };
    }

    const existingPrinciples = await appDb
      .selectFrom('profile_work_principles')
      .leftJoin(
        'profile_work_principle_localizations as existing_en',
        (join) =>
          join
            .onRef('existing_en.principle_id', '=', 'profile_work_principles.id')
            .on('existing_en.locale', '=', 'en'),
      )
      .leftJoin(
        'profile_work_principle_localizations as existing_fr',
        (join) =>
          join
            .onRef('existing_fr.principle_id', '=', 'profile_work_principles.id')
            .on('existing_fr.locale', '=', 'fr'),
      )
      .select([
        'profile_work_principles.id',
        'profile_work_principles.evidence_system_id',
        'existing_en.title as title_en',
        'existing_fr.title as title_fr',
      ])
      .where('profile_work_principles.profile_id', '=', profileId)
      .execute();

    const principleKey = (enTitle: string, frTitle: string) =>
      `${enTitle.trim().toLocaleLowerCase()}\u0000${frTitle.trim().toLocaleLowerCase()}`;
    const existingByKey = new Map(
      existingPrinciples
        .filter(
          (principle) =>
            principle.title_en !== null && principle.title_fr !== null,
        )
        .map((principle) => [
          principleKey(principle.title_en!, principle.title_fr!),
          principle,
        ]),
    );

    await appDb.transaction().execute(async (transaction) => {
      await transaction
        .updateTable('profile_work_principles')
        .set((expression) => ({
          position: expression('position', '+', 1000),
          updated_at: new Date(),
        }))
        .where('profile_id', '=', profileId)
        .execute();

      const retainedIds: string[] = [];

      for (const [position, principle] of principles.entries()) {
        const existing = existingByKey.get(
          principleKey(principle.enTitle, principle.frTitle),
        );
        const principleId = existing?.id ?? randomUUID();
        retainedIds.push(principleId);

        if (existing === undefined) {
          await transaction
            .insertInto('profile_work_principles')
            .values({
              id: principleId,
              profile_id: profileId,
              position,
              evidence_system_id: null,
            })
            .execute();
        } else {
          await transaction
            .updateTable('profile_work_principles')
            .set({
              position,
              updated_at: new Date(),
            })
            .where('id', '=', principleId)
            .where('profile_id', '=', profileId)
            .executeTakeFirstOrThrow();
        }

        for (const localization of [
          {
            locale: 'en' as const,
            title: principle.enTitle,
            detail: principle.enDetail,
          },
          {
            locale: 'fr' as const,
            title: principle.frTitle,
            detail: principle.frDetail,
          },
        ]) {
          await transaction
            .insertInto('profile_work_principle_localizations')
            .values({
              principle_id: principleId,
              locale: localization.locale,
              title: localization.title,
              detail: localization.detail,
              updated_at: new Date(),
            })
            .onConflict((conflict) =>
              conflict.columns(['principle_id', 'locale']).doUpdateSet({
                title: localization.title,
                detail: localization.detail,
                updated_at: new Date(),
              }),
            )
            .execute();
        }
      }

      if (retainedIds.length === 0) {
        await transaction
          .deleteFrom('profile_work_principles')
          .where('profile_id', '=', profileId)
          .execute();
      } else {
        await transaction
          .deleteFrom('profile_work_principles')
          .where('profile_id', '=', profileId)
          .where('id', 'not in', retainedIds)
          .execute();
      }

      await writeAdminAuditEvent(transaction, {
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: 'profile.work_principles_updated',
        entityType: 'profile',
        entityId: profileId,
        metadata: {
          principleCount: principles.length,
          locales: ['en', 'fr'],
          ordering: 'explicit',
          identityPreservation: 'bilingual-title-match',
        },
      });
    });

    return { ok: true, message: 'How I work updated.' };
  }

  if (intent === 'languages-mobility') {
    const allowedLanguages = new Set(['fr', 'en', 'ar']);
    const languageCodes = form
      .getAll('language')
      .filter((value): value is string => typeof value === 'string')
      .filter((value) => allowedLanguages.has(value));

    const orderedLanguages = [...new Set(languageCodes)].sort((left, right) => {
      const leftPosition = Number(textField(form, `language-position-${left}`));
      const rightPosition = Number(textField(form, `language-position-${right}`));
      return leftPosition - rightPosition;
    }) as Array<'fr' | 'en' | 'ar'>;

    const worldwide = form.get('mobility-worldwide') === 'on';
    const remote = form.get('mobility-remote') === 'on';
    const relocation = form.get('mobility-relocation') === 'on';

    await appDb.transaction().execute(async (transaction) => {
      await transaction
        .deleteFrom('profile_languages')
        .where('profile_id', '=', profileId)
        .execute();

      if (orderedLanguages.length > 0) {
        await transaction
          .insertInto('profile_languages')
          .values(
            orderedLanguages.map((languageCode, position) => ({
              profile_id: profileId,
              language_code: languageCode,
              position,
            })),
          )
          .execute();
      }

      await transaction
        .insertInto('profile_mobility')
        .values({
          profile_id: profileId,
          worldwide,
          remote,
          relocation,
          updated_at: new Date(),
        })
        .onConflict((conflict) =>
          conflict.column('profile_id').doUpdateSet({
            worldwide,
            remote,
            relocation,
            updated_at: new Date(),
          }),
        )
        .execute();

      await writeAdminAuditEvent(transaction, {
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: 'profile.languages_mobility_updated',
        entityType: 'profile',
        entityId: profileId,
        metadata: {
          languages: orderedLanguages,
          worldwide,
          remote,
          relocation,
        },
      });
    });

    return { ok: true, message: 'Languages and mobility updated.' };
  }

  if (intent === 'capabilities') {
    let groups: ParsedCapabilityGroup[];

    try {
      groups = parseCapabilities(textField(form, 'capabilities'));
    } catch (error) {
      return {
        ok: false,
        message:
          error instanceof Error ? error.message : 'Capabilities are invalid.',
      };
    }

    const technologies = await appDb
      .selectFrom('technologies')
      .select(['name', 'slug'])
      .execute();
    const technologyTerms = new Set(
      technologies.flatMap(({ name, slug }) => [
        name.trim().toLocaleLowerCase(),
        slug.trim().toLocaleLowerCase(),
      ]),
    );

    for (const group of groups) {
      for (const title of [group.enTitle, group.frTitle]) {
        if (title.length > 80) {
          return { ok: false, message: 'Capability group titles must stay within 80 characters.' };
        }
        if (technologyTerms.has(title.toLocaleLowerCase())) {
          return {
            ok: false,
            message:
              'Capability groups must describe abilities, not Technology names.',
          };
        }
      }

      for (const capability of group.capabilities) {
        if (
          capability.enTitle.length > 100 ||
          capability.frTitle.length > 100 ||
          (capability.enSummary?.length ?? 0) > 280 ||
          (capability.frSummary?.length ?? 0) > 280
        ) {
          return {
            ok: false,
            message: 'Capability titles must stay within 100 characters and summaries within 280 characters.',
          };
        }
        for (const title of [capability.enTitle, capability.frTitle]) {
          if (technologyTerms.has(title.toLocaleLowerCase())) {
            return {
              ok: false,
              message:
                'Capabilities must describe conceptual or engineering abilities, not Technology names.',
            };
          }
        }
      }
    }

    await appDb.transaction().execute(async (transaction) => {
      await transaction
        .deleteFrom('profile_capability_groups')
        .where('profile_id', '=', profileId)
        .execute();

      for (const [groupPosition, group] of groups.entries()) {
        const groupId = randomUUID();
        await transaction
          .insertInto('profile_capability_groups')
          .values({
            id: groupId,
            profile_id: profileId,
            position: groupPosition,
          })
          .execute();

        await transaction
          .insertInto('profile_capability_group_localizations')
          .values([
            { group_id: groupId, locale: 'en', title: group.enTitle },
            { group_id: groupId, locale: 'fr', title: group.frTitle },
          ])
          .execute();

        for (const [capabilityPosition, capability] of group.capabilities.entries()) {
          const capabilityId = randomUUID();
          await transaction
            .insertInto('profile_capabilities')
            .values({
              id: capabilityId,
              group_id: groupId,
              position: capabilityPosition,
            })
            .execute();

          await transaction
            .insertInto('profile_capability_localizations')
            .values([
              {
                capability_id: capabilityId,
                locale: 'en',
                title: capability.enTitle,
                summary: capability.enSummary,
              },
              {
                capability_id: capabilityId,
                locale: 'fr',
                title: capability.frTitle,
                summary: capability.frSummary,
              },
            ])
            .execute();
        }
      }

      await writeAdminAuditEvent(transaction, {
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: 'profile.capabilities_updated',
        entityType: 'profile',
        entityId: profileId,
        metadata: {
          groupCount: groups.length,
          capabilityCount: groups.reduce(
            (count, group) => count + group.capabilities.length,
            0,
          ),
          locales: ['en', 'fr'],
          technologySeparation: 'enforced',
        },
      });
    });

    return { ok: true, message: 'Capabilities updated.' };
  }

  if (intent === 'technology-journey') {
    const selectedProfileExperiences = await appDb
      .selectFrom('profile_experiences')
      .select('experience_id')
      .where('profile_id', '=', profileId)
      .execute();
    const selectedProfileSystems = await appDb
      .selectFrom('profile_systems')
      .innerJoin('systems', 'systems.id', 'profile_systems.system_id')
      .select('profile_systems.system_id')
      .where('profile_systems.profile_id', '=', profileId)
      .where('systems.lifecycle', '=', 'active')
      .execute();
    const allowedExperienceIds = new Set(
      selectedProfileExperiences.map(({ experience_id }) => experience_id),
    );
    const allowedSystemIds = new Set(
      selectedProfileSystems.map(({ system_id }) => system_id),
    );

    const updates = technologyJourneyStages.map((stage) => {
      const titleEn = textField(form, `journey-${stage.key}-title-en`);
      const titleFr = textField(form, `journey-${stage.key}-title-fr`);
      const summaryEn = optionalText(form, `journey-${stage.key}-summary-en`);
      const summaryFr = optionalText(form, `journey-${stage.key}-summary-fr`);
      const evidence = textField(form, `journey-${stage.key}-evidence`);

      if (titleEn === '' || titleFr === '') {
        throw new Response('Technological journey titles are required in EN and FR.', {
          status: 400,
        });
      }
      if (titleEn.length > 80 || titleFr.length > 80) {
        throw new Response('Technological journey titles must stay within 80 characters.', {
          status: 400,
        });
      }
      if ((summaryEn?.length ?? 0) > 280 || (summaryFr?.length ?? 0) > 280) {
        throw new Response('Technological journey summaries must stay within 280 characters.', {
          status: 400,
        });
      }

      let evidenceExperienceId: string | null = null;
      let evidenceSystemId: string | null = null;
      if (evidence.startsWith('experience:')) {
        const id = evidence.slice('experience:'.length);
        if (!allowedExperienceIds.has(id)) {
          throw new Response(
            'Technological journey Experience evidence must already be selected on Profile.',
            { status: 400 },
          );
        }
        evidenceExperienceId = id;
      } else if (evidence.startsWith('system:')) {
        const id = evidence.slice('system:'.length);
        if (!allowedSystemIds.has(id)) {
          throw new Response(
            'Technological journey System evidence must already be selected on Profile.',
            { status: 400 },
          );
        }
        evidenceSystemId = id;
      }

      return {
        ...stage,
        titleEn,
        titleFr,
        summaryEn,
        summaryFr,
        evidenceExperienceId,
        evidenceSystemId,
      };
    });

    await appDb.transaction().execute(async (transaction) => {
      for (const stage of updates) {
        await transaction
          .updateTable('profile_technology_journey_stages')
          .set({
            evidence_experience_id: stage.evidenceExperienceId,
            evidence_system_id: stage.evidenceSystemId,
            updated_at: new Date(),
          })
          .where('profile_id', '=', profileId)
          .where('stage_key', '=', stage.key)
          .executeTakeFirstOrThrow();

        for (const localization of [
          {
            locale: 'en' as const,
            title: stage.titleEn,
            summary: stage.summaryEn,
          },
          {
            locale: 'fr' as const,
            title: stage.titleFr,
            summary: stage.summaryFr,
          },
        ]) {
          await transaction
            .insertInto('profile_technology_journey_stage_localizations')
            .values({
              profile_id: profileId,
              stage_key: stage.key,
              locale: localization.locale,
              title: localization.title,
              summary: localization.summary,
              updated_at: new Date(),
            })
            .onConflict((conflict) =>
              conflict
                .columns(['profile_id', 'stage_key', 'locale'])
                .doUpdateSet({
                  title: localization.title,
                  summary: localization.summary,
                  updated_at: new Date(),
                }),
            )
            .execute();
        }
      }

      await writeAdminAuditEvent(transaction, {
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: 'profile.technology_journey_updated',
        entityType: 'profile',
        entityId: profileId,
        metadata: {
          stageCount: updates.length,
          experienceEvidenceCount: updates.filter(
            ({ evidenceExperienceId }) => evidenceExperienceId !== null,
          ).length,
          systemEvidenceCount: updates.filter(
            ({ evidenceSystemId }) => evidenceSystemId !== null,
          ).length,
          stageOrder: technologyJourneyStages.map(({ key }) => key),
        },
      });
    });

    return { ok: true, message: 'Technological journey updated.' };
  }

  if (intent === 'professional-journey') {
    const selectedIds = form
      .getAll('professionalExperience')
      .filter((value): value is string => typeof value === 'string');
    const orderedIds = [...new Set(selectedIds)].sort((left, right) => {
      const leftPosition = Number(textField(form, `experience-position-${left}`));
      const rightPosition = Number(textField(form, `experience-position-${right}`));
      return leftPosition - rightPosition;
    });

    const validExperiences =
      orderedIds.length === 0
        ? []
        : await appDb
            .selectFrom('experiences')
            .select('id')
            .where('id', 'in', orderedIds)
            .execute();

    if (validExperiences.length !== orderedIds.length) {
      return {
        ok: false,
        message: 'Professional journey must reference existing Experience objects.',
      };
    }

    await appDb.transaction().execute(async (transaction) => {
      await transaction
        .deleteFrom('profile_experiences')
        .where('profile_id', '=', profileId)
        .execute();

      if (orderedIds.length > 0) {
        await transaction
          .insertInto('profile_experiences')
          .values(
            orderedIds.map((experienceId, position) => ({
              profile_id: profileId,
              experience_id: experienceId,
              position,
            })),
          )
          .execute();
      }

      await writeAdminAuditEvent(transaction, {
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: 'profile.professional_journey_updated',
        entityType: 'profile',
        entityId: profileId,
        metadata: {
          experienceIds: orderedIds,
          ordering: 'explicit',
          inclusion: 'intentional-only',
        },
      });
    });

    return { ok: true, message: 'Professional journey updated.' };
  }

  if (intent === 'representative-systems') {
    const selectedIds = form
      .getAll('representativeSystem')
      .filter((value): value is string => typeof value === 'string');
    const orderedIds = [...new Set(selectedIds)].sort((left, right) => {
      const leftPosition = Number(textField(form, `position-${left}`));
      const rightPosition = Number(textField(form, `position-${right}`));
      return leftPosition - rightPosition;
    });

    const validSystems =
      orderedIds.length === 0
        ? []
        : await appDb
            .selectFrom('systems')
            .select('id')
            .where('lifecycle', '=', 'active')
            .where('id', 'in', orderedIds)
            .execute();

    if (validSystems.length !== orderedIds.length) {
      return {
        ok: false,
        message: 'Representative Systems must reference active System objects.',
      };
    }

    await appDb.transaction().execute(async (transaction) => {
      await transaction
        .deleteFrom('profile_systems')
        .where('profile_id', '=', profileId)
        .execute();

      if (orderedIds.length > 0) {
        await transaction
          .insertInto('profile_systems')
          .values(
            orderedIds.map((systemId, position) => ({
              profile_id: profileId,
              system_id: systemId,
              position,
            })),
          )
          .execute();
      }

      await writeAdminAuditEvent(transaction, {
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: 'profile.representative_systems_updated',
        entityType: 'profile',
        entityId: profileId,
        metadata: {
          systemIds: orderedIds,
          ordering: 'explicit',
        },
      });
    });

    return { ok: true, message: 'Representative Systems updated.' };
  }

  if (intent === 'source-cv') {
    const file = form.get('file');

    if (!(file instanceof File)) {
      return { ok: false, message: 'Choose a PDF CV file.' };
    }

    if (file.type !== 'application/pdf') {
      return { ok: false, message: 'Source CV must be a PDF file.' };
    }

    try {
      validateAssetUpload(file);
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'CV upload is invalid.',
      };
    }

    const current = await appDb
      .selectFrom('profiles')
      .leftJoin('assets', 'assets.id', 'profiles.source_cv_asset_id')
      .select([
        'profiles.source_cv_asset_id',
        'assets.storage_key as source_cv_storage_key',
      ])
      .where('profiles.id', '=', profileId)
      .executeTakeFirstOrThrow();

    const assetId = randomUUID();
    const storageKey = `profiles/${profileId}/cv/${assetId}.pdf`;

    try {
      await putAssetObject(storageKey, file);

      await appDb.transaction().execute(async (transaction) => {
        await transaction
          .insertInto('assets')
          .values({
            id: assetId,
            storage_key: storageKey,
            original_filename: file.name,
            mime_type: file.type,
            byte_size: file.size,
          })
          .execute();

        await transaction
          .updateTable('profiles')
          .set({
            source_cv_asset_id: assetId,
            updated_at: new Date(),
          })
          .where('id', '=', profileId)
          .executeTakeFirstOrThrow();

        await writeAdminAuditEvent(transaction, {
          actorUserId: session.user.id,
          actorEmail: session.user.email,
          action: 'profile.source_cv_updated',
          entityType: 'profile',
          entityId: profileId,
          metadata: {
            mimeType: file.type,
            byteSize: file.size,
            replacedExistingCv: current.source_cv_asset_id !== null,
          },
        });
      });
    } catch (error) {
      try {
        await deleteAssetObject(storageKey);
      } catch {
        // Best-effort compensation if storage already rejected the upload.
      }

      return {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : 'Source CV upload could not be completed.',
      };
    }

    return {
      ok: true,
      message:
        current.source_cv_asset_id === null
          ? 'Source CV updated.'
          : 'Source CV updated. Previous asset preserved for any published Profile snapshot.',
    };
  }

  if (intent === 'remove-source-cv') {
    const current = await appDb
      .selectFrom('profiles')
      .innerJoin('assets', 'assets.id', 'profiles.source_cv_asset_id')
      .select(['assets.id', 'assets.storage_key'])
      .where('profiles.id', '=', profileId)
      .executeTakeFirst();

    if (current === undefined) {
      return { ok: true, message: 'No source CV is currently set.' };
    }

    await appDb.transaction().execute(async (transaction) => {
      await transaction
        .updateTable('profiles')
        .set({
          source_cv_asset_id: null,
          updated_at: new Date(),
        })
        .where('id', '=', profileId)
        .executeTakeFirstOrThrow();

      await writeAdminAuditEvent(transaction, {
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: 'profile.source_cv_removed',
        entityType: 'profile',
        entityId: profileId,
        metadata: {
          assetId: current.id,
          storageObjectPreserved: true,
          reason: 'published_snapshot_safety',
        },
      });
    });

    return { ok: true, message: 'Source CV removed.' };
  }

  if (intent === 'portrait') {
    const file = form.get('file');
    const altEn = optionalText(form, 'altEn');
    const altFr = optionalText(form, 'altFr');

    if (!(file instanceof File)) {
      return { ok: false, message: 'Choose a portrait image.' };
    }

    try {
      validateAssetUpload(file);
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Invalid portrait.',
      };
    }

    if (!imageMimeTypes.has(file.type)) {
      return {
        ok: false,
        message: 'Portrait must be JPEG, PNG, WebP, or AVIF.',
      };
    }

    if (altEn === null || altFr === null) {
      return {
        ok: false,
        message: 'English and French portrait alt text are required.',
      };
    }

    const current = await appDb
      .selectFrom('profiles')
      .leftJoin('assets', 'assets.id', 'profiles.portrait_asset_id')
      .select([
        'profiles.portrait_asset_id',
        'assets.storage_key as portrait_storage_key',
      ])
      .where('profiles.id', '=', profileId)
      .executeTakeFirstOrThrow();

    const assetId = randomUUID();
    const extension = assetExtensionForMimeType(file.type);
    const storageKey = `profiles/${profileId}/portrait/${assetId}.${extension}`;

    try {
      await putAssetObject(storageKey, file);

      await appDb.transaction().execute(async (transaction) => {
        await transaction
          .insertInto('assets')
          .values({
            id: assetId,
            storage_key: storageKey,
            original_filename: file.name,
            mime_type: file.type,
            byte_size: file.size,
          })
          .execute();

        await transaction
          .insertInto('asset_localizations')
          .values([
            {
              asset_id: assetId,
              locale: 'en',
              alt_text: altEn,
              caption: null,
            },
            {
              asset_id: assetId,
              locale: 'fr',
              alt_text: altFr,
              caption: null,
            },
          ])
          .execute();

        await transaction
          .updateTable('profiles')
          .set({
            portrait_asset_id: assetId,
            updated_at: new Date(),
          })
          .where('id', '=', profileId)
          .executeTakeFirstOrThrow();

        await writeAdminAuditEvent(transaction, {
          actorUserId: session.user.id,
          actorEmail: session.user.email,
          action: 'profile.portrait_updated',
          entityType: 'profile',
          entityId: profileId,
          metadata: {
            mimeType: file.type,
            byteSize: file.size,
            localizedMetadata: ['en', 'fr'],
            replacedExistingPortrait: current.portrait_asset_id !== null,
          },
        });
      });
    } catch (error) {
      try {
        await deleteAssetObject(storageKey);
      } catch {
        // Best-effort compensation if storage already rejected the upload.
      }

      return {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : 'Portrait upload could not be completed.',
      };
    }

    return {
      ok: true,
      message:
        current.portrait_asset_id === null
          ? 'Portrait updated.'
          : 'Portrait updated. Previous asset preserved for any published Profile snapshot.',
    };
  }

  if (intent === 'remove-portrait') {
    const current = await appDb
      .selectFrom('profiles')
      .innerJoin('assets', 'assets.id', 'profiles.portrait_asset_id')
      .select(['assets.id', 'assets.storage_key'])
      .where('profiles.id', '=', profileId)
      .executeTakeFirst();

    if (current === undefined) {
      return { ok: true, message: 'No portrait is currently set.' };
    }

    await appDb.transaction().execute(async (transaction) => {
      await transaction
        .updateTable('profiles')
        .set({
          portrait_asset_id: null,
          updated_at: new Date(),
        })
        .where('id', '=', profileId)
        .executeTakeFirstOrThrow();

      await writeAdminAuditEvent(transaction, {
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: 'profile.portrait_removed',
        entityType: 'profile',
        entityId: profileId,
        metadata: {
          assetId: current.id,
          storageObjectPreserved: true,
          reason: 'published_snapshot_safety',
        },
      });
    });

    return { ok: true, message: 'Portrait removed.' };
  }

  return { ok: false, message: 'Unsupported Profile operation.' };
}

function ProfileAdvancedControls() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <section className="aks-admin-shell aks-admin-profile-advanced-shell">
      <Container>
        <div className="aks-proof-stack">
          <section className="aks-admin-card">
            <div className="aks-proof-stack">
              <Text className="aks-proof-eyebrow" size="sm" tone="muted">
                L3 · Profile
              </Text>
              <Heading level={1} size="md">
                Professional identity
              </Heading>
              <Text tone="muted">
                Maintain one public professional identity with localized EN/FR
                presentation. This is not an HTML CV.
              </Text>
              <div className="aks-proof-actions">
                <Link href="/admin">Back to administration</Link>
                <Link href="/en/profile">Open public Profile</Link>
              </div>
            </div>
          </section>

          {actionData ? (
            <section className="aks-admin-card" aria-live="polite">
              <Text tone={actionData.ok ? 'strong' : 'muted'}>
                {actionData.message}
              </Text>
            </section>
          ) : null}

          <section className="aks-admin-card">
            <div className="aks-proof-stack">
              <Heading level={2} size="sm">
                Publication
              </Heading>
              <Text size="sm" tone="muted">
                Draft edits stay private. Preview the current draft, then publish
                EN and FR independently as immutable public snapshots.
              </Text>
              <div className="aks-admin-domain-grid">
                {(['en', 'fr'] as const).map((locale) => {
                  const publication = data.publications.find(
                    (candidate) => candidate.locale === locale,
                  );
                  const publicHref = locale === 'fr' ? '/fr/profil' : '/en/profile';

                  return (
                    <div
                      className="aks-admin-card"
                      data-profile-publication={locale}
                      key={locale}
                    >
                      <Heading level={3} size="sm">
                        {locale.toUpperCase()}
                      </Heading>
                      <Text size="sm" tone="muted">
                        {publication === undefined
                          ? 'Draft only'
                          : `Published · ${new Date(publication.published_at).toLocaleString()}`}
                      </Text>
                      <div className="aks-proof-actions">
                        <Link href={`/admin/profile/preview/${locale}`}>
                          Preview draft
                        </Link>
                        {publication === undefined ? null : (
                          <Link href={publicHref}>Open published Profile</Link>
                        )}
                      </div>
                      <div className="aks-proof-actions">
                        <Form method="post">
                          <input name="_intent" type="hidden" value="profile-publish" />
                          <input name="locale" type="hidden" value={locale} />
                          <Button type="submit">
                            {publication === undefined ? 'Publish' : 'Republish draft'}
                          </Button>
                        </Form>
                        {publication === undefined ? null : (
                          <Form method="post">
                            <input
                              name="_intent"
                              type="hidden"
                              value="profile-unpublish"
                            />
                            <input name="locale" type="hidden" value={locale} />
                            <Button emphasis="quiet" type="submit">
                              Unpublish
                            </Button>
                          </Form>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="aks-admin-card">
            <Form className="aks-admin-form" method="post">
              <input name="_intent" type="hidden" value="identity" />
              <Heading level={2} size="sm">
                Identity & foundational copy
              </Heading>
              <label>
                <span>Display name</span>
                <input
                  defaultValue={data.profile.display_name ?? ''}
                  maxLength={80}
                  name="displayName"
                  type="text"
                />
              </label>

              <div className="aks-admin-domain-grid">
                <fieldset className="aks-admin-fieldset">
                  <legend>English</legend>
                  <label>
                    <span>Professional title</span>
                    <input
                      defaultValue={data.en?.professional_title ?? ''}
                      maxLength={100}
                      name="professionalTitleEn"
                      type="text"
                    />
                  </label>
                  <label>
                    <span>Introduction</span>
                    <textarea
                      defaultValue={data.en?.introduction ?? ''}
                      maxLength={320}
                      name="introductionEn"
                      rows={5}
                    />
                  </label>
                  <label>
                    <span>Foundational profile copy</span>
                    <textarea
                      defaultValue={data.en?.foundational_copy ?? ''}
                      maxLength={600}
                      name="foundationalCopyEn"
                      rows={8}
                    />
                  </label>
                </fieldset>

                <fieldset className="aks-admin-fieldset">
                  <legend>Français</legend>
                  <label>
                    <span>Titre professionnel</span>
                    <input
                      defaultValue={data.fr?.professional_title ?? ''}
                      maxLength={100}
                      name="professionalTitleFr"
                      type="text"
                    />
                  </label>
                  <label>
                    <span>Introduction</span>
                    <textarea
                      defaultValue={data.fr?.introduction ?? ''}
                      maxLength={320}
                      name="introductionFr"
                      rows={5}
                    />
                  </label>
                  <label>
                    <span>Texte fondateur du profil</span>
                    <textarea
                      defaultValue={data.fr?.foundational_copy ?? ''}
                      maxLength={600}
                      name="foundationalCopyFr"
                      rows={8}
                    />
                  </label>
                </fieldset>
              </div>
              <Button type="submit">Save professional identity</Button>
            </Form>
          </section>

          <section className="aks-admin-card">
            <Form className="aks-admin-form" method="post">
              <input name="_intent" type="hidden" value="work-principles" />
              <Heading level={2} size="sm">
                How I work
              </Heading>
              <Text size="sm" tone="muted">
                Keep this public section concise and practice-oriented. Do not
                expose internal methodology names. One ordered principle per
                line: EN title | EN detail || FR title | FR detail.
              </Text>
              <textarea
                defaultValue={data.principles
                  .map(
                    (principle) =>
                      `${principle.title_en ?? ''} | ${principle.detail_en ?? ''} || ${principle.title_fr ?? ''} | ${principle.detail_fr ?? ''}`,
                  )
                  .join('\n')}
                name="workPrinciples"
                rows={10}
              />
              <Button type="submit">Save How I work</Button>
            </Form>

            {data.principles.length > 0 ? (
              <Form className="aks-admin-form" method="post">
                <input
                  name="_intent"
                  type="hidden"
                  value="work-principle-evidence"
                />
                <Heading level={3} size="sm">
                  Evidence examples
                </Heading>
                <Text size="sm" tone="muted">
                  Optionally connect a principle to one active System. Public
                  Profile shows the example only when that System is published
                  in the current language.
                </Text>
                <div className="aks-proof-stack">
                  {data.principles.map((principle) => (
                    <label key={principle.id}>
                      <span>
                        {principle.title_en ??
                          principle.title_fr ??
                          `Principle ${principle.position + 1}`}
                      </span>
                      <select
                        defaultValue={principle.evidence_system_id ?? ''}
                        name={`evidence-${principle.id}`}
                      >
                        <option value="">No evidence System</option>
                        {data.selectableSystems.map((system) => (
                          <option key={system.id} value={system.id}>
                            {system.title_en ?? system.title_fr ?? system.id}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
                <Button type="submit">Save principle evidence</Button>
              </Form>
            ) : null}
          </section>

          <section className="aks-admin-card">
            <Form className="aks-admin-form" method="post">
              <input name="_intent" type="hidden" value="languages-mobility" />
              <Heading level={2} size="sm">
                Languages and mobility
              </Heading>
              <Text size="sm" tone="muted">
                Keep spoken languages and mobility as structured Profile facts,
                not editorial prose.
              </Text>
              <div className="aks-admin-domain-grid">
                <fieldset className="aks-admin-fieldset">
                  <legend>Languages</legend>
                  {[
                    { code: 'fr', label: 'French' },
                    { code: 'en', label: 'English' },
                    { code: 'ar', label: 'Arabic' },
                  ].map(({ code, label }) => {
                    const selected = data.profileLanguages.find(
                      (language) => language.language_code === code,
                    );

                    return (
                      <div className="aks-admin-card" key={code}>
                        <label>
                          <input
                            defaultChecked={selected !== undefined}
                            name="language"
                            type="checkbox"
                            value={code}
                          />
                          <span>{label}</span>
                        </label>
                        <label>
                          <span>Order</span>
                          <input
                            defaultValue={selected?.position ?? 999}
                            min={0}
                            name={`language-position-${code}`}
                            type="number"
                          />
                        </label>
                      </div>
                    );
                  })}
                </fieldset>
                <fieldset className="aks-admin-fieldset">
                  <legend>Mobility</legend>
                  <label>
                    <input
                      defaultChecked={data.profileMobility.worldwide}
                      name="mobility-worldwide"
                      type="checkbox"
                    />
                    <span>Worldwide</span>
                  </label>
                  <label>
                    <input
                      defaultChecked={data.profileMobility.remote}
                      name="mobility-remote"
                      type="checkbox"
                    />
                    <span>Remote</span>
                  </label>
                  <label>
                    <input
                      defaultChecked={data.profileMobility.relocation}
                      name="mobility-relocation"
                      type="checkbox"
                    />
                    <span>Relocation</span>
                  </label>
                </fieldset>
              </div>
              <Button type="submit">Save languages and mobility</Button>
            </Form>
          </section>

          <section className="aks-admin-card">
            <Form className="aks-admin-form" method="post">
              <input name="_intent" type="hidden" value="capabilities" />
              <Heading level={2} size="sm">
                Capabilities
              </Heading>
              <Text size="sm" tone="muted">
                Model engineering abilities separately from tools. Use a group
                line "# EN group || FR group", then bilingual capability lines
                "EN title | EN summary || FR title | FR summary". Technology
                names such as React or Docker are rejected when they exist in
                the Technology domain.
              </Text>
              <textarea
                defaultValue={data.capabilityRows
                  .map((row, index, rows) => {
                    const previous = rows[index - 1];
                    const groupLine =
                      previous?.group_id === row.group_id
                        ? []
                        : [
                            `# ${row.group_title_en ?? ''} || ${row.group_title_fr ?? ''}`,
                          ];
                    const capabilityLine =
                      row.capability_id === null
                        ? []
                        : [
                            `${row.capability_title_en ?? ''} | ${row.capability_summary_en ?? ''} || ${row.capability_title_fr ?? ''} | ${row.capability_summary_fr ?? ''}`,
                          ];
                    return [...groupLine, ...capabilityLine].join('\n');
                  })
                  .filter(Boolean)
                  .join('\n')}
                name="capabilities"
                rows={14}
              />
              <Button type="submit">Save capabilities</Button>
            </Form>
          </section>

          <section className="aks-admin-card">
            <Form className="aks-admin-form" method="post">
              <input name="_intent" type="hidden" value="technology-journey" />
              <Heading level={2} size="sm">
                Technological journey
              </Heading>
              <Text size="sm" tone="muted">
                Keep the five-step path coherent and technical rather than autobiographical.
                Evidence can only reuse Experiences or Systems already selected on Profile.
              </Text>
              <div className="aks-proof-stack">
                {technologyJourneyStages.map((stage) => {
                  const row = data.technologyJourneyRows.find(
                    (candidate) => candidate.stage_key === stage.key,
                  );
                  const evidenceValue =
                    row?.evidence_experience_id !== null &&
                    row?.evidence_experience_id !== undefined
                      ? `experience:${row.evidence_experience_id}`
                      : row?.evidence_system_id !== null &&
                          row?.evidence_system_id !== undefined
                        ? `system:${row.evidence_system_id}`
                        : '';

                  return (
                    <fieldset className="aks-admin-fieldset" key={stage.key}>
                      <legend>
                        {stage.position + 1}. {stage.label}
                      </legend>
                      <div className="aks-admin-domain-grid">
                        <label>
                          <span>English title</span>
                          <input
                            defaultValue={row?.title_en ?? ''}
                            name={`journey-${stage.key}-title-en`}
                            required
                            type="text"
                          />
                        </label>
                        <label>
                          <span>French title</span>
                          <input
                            defaultValue={row?.title_fr ?? ''}
                            name={`journey-${stage.key}-title-fr`}
                            required
                            type="text"
                          />
                        </label>
                        <label>
                          <span>English summary</span>
                          <textarea
                            defaultValue={row?.summary_en ?? ''}
                            name={`journey-${stage.key}-summary-en`}
                            rows={3}
                          />
                        </label>
                        <label>
                          <span>French summary</span>
                          <textarea
                            defaultValue={row?.summary_fr ?? ''}
                            name={`journey-${stage.key}-summary-fr`}
                            rows={3}
                          />
                        </label>
                      </div>
                      <label>
                        <span>Optional Profile evidence</span>
                        <select
                          defaultValue={evidenceValue}
                          name={`journey-${stage.key}-evidence`}
                        >
                          <option value="">No evidence</option>
                          {data.selectedExperiences.map((selected) => {
                            const experience = data.selectableExperiences.find(
                              (candidate) => candidate.id === selected.experience_id,
                            );
                            return experience === undefined ? null : (
                              <option
                                key={selected.experience_id}
                                value={`experience:${selected.experience_id}`}
                              >
                                Experience · {experience.title_en ?? experience.title_fr ?? experience.id}
                              </option>
                            );
                          })}
                          {data.selectedSystems.map((selected) => {
                            const system = data.selectableSystems.find(
                              (candidate) => candidate.id === selected.system_id,
                            );
                            return system === undefined ? null : (
                              <option
                                key={selected.system_id}
                                value={`system:${selected.system_id}`}
                              >
                                System · {system.title_en ?? system.title_fr ?? system.id}
                              </option>
                            );
                          })}
                        </select>
                      </label>
                    </fieldset>
                  );
                })}
              </div>
              <Button type="submit">Save technological journey</Button>
            </Form>
          </section>

          <section className="aks-admin-card">
            <Form className="aks-admin-form" method="post">
              <input name="_intent" type="hidden" value="professional-journey" />
              <Heading level={2} size="sm">
                Relevant professional journey
              </Heading>
              <Text size="sm" tone="muted">
                Include only deliberately selected technology or industrial
                Experience objects. Nothing from older history is added
                automatically.
              </Text>
              <div className="aks-proof-stack">
                {data.selectableExperiences.length === 0 ? (
                  <Text tone="muted">No Experience objects are available yet.</Text>
                ) : (
                  data.selectableExperiences.map((experience) => {
                    const selected = data.selectedExperiences.find(
                      (relation) => relation.experience_id === experience.id,
                    );

                    return (
                      <div className="aks-admin-card" key={experience.id}>
                        <label>
                          <input
                            defaultChecked={selected !== undefined}
                            name="professionalExperience"
                            type="checkbox"
                            value={experience.id}
                          />
                          <span>
                            {experience.title_en ??
                              experience.title_fr ??
                              experience.id}
                          </span>
                        </label>
                        <Text size="sm" tone="muted">
                          {experience.summary_en ??
                            experience.summary_fr ??
                            'No summary yet.'}
                        </Text>
                        <label>
                          <span>Order</span>
                          <input
                            defaultValue={selected?.position ?? 999}
                            min={0}
                            name={`experience-position-${experience.id}`}
                            type="number"
                          />
                        </label>
                      </div>
                    );
                  })
                )}
              </div>
              <Button type="submit">Save professional journey</Button>
            </Form>
          </section>

          <section className="aks-admin-card">
            <Form className="aks-admin-form" method="post">
              <input name="_intent" type="hidden" value="representative-systems" />
              <Heading level={2} size="sm">
                Representative Systems
              </Heading>
              <Text size="sm" tone="muted">
                Select and order real System objects. Profile reuses their published
                localized title and summary; it does not copy project text.
              </Text>
              <div className="aks-proof-stack">
                {data.selectableSystems.length === 0 ? (
                  <Text tone="muted">No active Systems are available yet.</Text>
                ) : (
                  data.selectableSystems.map((system) => {
                    const selected = data.selectedSystems.find(
                      (relation) => relation.system_id === system.id,
                    );

                    return (
                      <div className="aks-admin-card" key={system.id}>
                        <label>
                          <input
                            defaultChecked={selected !== undefined}
                            name="representativeSystem"
                            type="checkbox"
                            value={system.id}
                          />
                          <span>
                            {system.title_en ?? system.title_fr ?? system.id}
                          </span>
                        </label>
                        <label>
                          <span>Order</span>
                          <input
                            defaultValue={selected?.position ?? 999}
                            min={0}
                            name={`position-${system.id}`}
                            type="number"
                          />
                        </label>
                      </div>
                    );
                  })
                )}
              </div>
              <Button type="submit">Save representative Systems</Button>
            </Form>
          </section>

          <section className="aks-admin-card">
            <div className="aks-proof-stack">
              <Heading level={2} size="sm">
                Source CV
              </Heading>
              <Text size="sm" tone="muted">
                Optional PDF artifact only. Profile links to it without reproducing
                the CV content.
              </Text>
              {data.sourceCv === null ? (
                <Text tone="muted">No source CV is currently linked.</Text>
              ) : (
                <div className="aks-proof-stack">
                  <Text tone="strong">{data.sourceCv.cv_original_filename}</Text>
                  <Text size="sm" tone="muted">
                    {data.sourceCv.cv_mime_type} · {data.sourceCv.cv_byte_size} bytes
                  </Text>
                  <div className="aks-proof-actions">
                    <Link href="/en/profile/cv">Open public CV</Link>
                    <Form method="post">
                      <input
                        name="_intent"
                        type="hidden"
                        value="remove-source-cv"
                      />
                      <Button emphasis="quiet" type="submit">
                        Remove source CV
                      </Button>
                    </Form>
                  </div>
                </div>
              )}

              <Form
                className="aks-admin-form"
                encType="multipart/form-data"
                method="post"
              >
                <input name="_intent" type="hidden" value="source-cv" />
                <label>
                  <span>CV PDF</span>
                  <input
                    accept="application/pdf"
                    name="file"
                    required
                    type="file"
                  />
                </label>
                <Text size="sm" tone="muted">
                  PDF only, maximum 10 MiB. Replacing the file updates the Profile
                  reference atomically before old media is cleaned up.
                </Text>
                <Button type="submit">
                  {data.sourceCv === null ? 'Upload source CV' : 'Replace source CV'}
                </Button>
              </Form>
            </div>
          </section>

          <section className="aks-admin-card">
            <div className="aks-proof-stack">
              <Heading level={2} size="sm">
                Portrait
              </Heading>
              {data.portrait === null ? (
                <Text tone="muted">No portrait is currently set.</Text>
              ) : (
                <div className="aks-proof-stack">
                  <Text tone="strong">{data.portrait.original_filename}</Text>
                  <Text size="sm" tone="muted">
                    {data.portrait.mime_type} · {data.portrait.byte_size} bytes
                  </Text>
                  <Text size="sm" tone="muted">
                    EN alt: {data.portrait.alt_en ?? '—'}
                  </Text>
                  <Text size="sm" tone="muted">
                    FR alt: {data.portrait.alt_fr ?? '—'}
                  </Text>
                  <Form method="post">
                    <input
                      name="_intent"
                      type="hidden"
                      value="remove-portrait"
                    />
                    <Button emphasis="quiet" type="submit">
                      Remove portrait
                    </Button>
                  </Form>
                </div>
              )}

              <Form
                className="aks-admin-form"
                encType="multipart/form-data"
                method="post"
              >
                <input name="_intent" type="hidden" value="portrait" />
                <label>
                  <span>Portrait image</span>
                  <input
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    name="file"
                    required
                    type="file"
                  />
                </label>
                <label>
                  <span>English alt text</span>
                  <input name="altEn" required type="text" />
                </label>
                <label>
                  <span>French alt text</span>
                  <input name="altFr" required type="text" />
                </label>
                <Text size="sm" tone="muted">
                  JPEG, PNG, WebP, or AVIF. Maximum 10 MiB. Replacing a portrait
                  updates the Profile reference atomically before old media is
                  cleaned up.
                </Text>
                <Button type="submit">
                  {data.portrait === null ? 'Upload portrait' : 'Replace portrait'}
                </Button>
              </Form>
            </div>
          </section>

          <section className="aks-admin-card">
            <div className="aks-proof-stack">
              <Heading level={2} size="sm">
                Recent Profile audit activity
              </Heading>
              {data.auditEvents.length === 0 ? (
                <Text size="sm" tone="muted">
                  No Profile mutations yet.
                </Text>
              ) : (
                <ol className="aks-admin-audit-list">
                  {data.auditEvents.map((event) => (
                    <li key={event.id}>
                      <Text tone="strong">{event.action}</Text>
                      <Text size="sm" tone="muted">
                        {event.actor_email} · {event.created_at}
                      </Text>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </section>
        </div>
      </Container>
    </section>
  );
}


export default function AdminProfile() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const publication =
    data.publications.find(
      (candidate) => candidate.locale === data.activeLocale,
    ) ?? null;

  return (
    <main className="aks-admin-profile-page">
      <header className="aks-admin-profile-header">
        <Container width="wide">
          <div className="aks-admin-profile-header-inner">
            <BrandSignature
              aria-label="AkikSystems home"
              className="aks-admin-profile-brand"
              href="/en"
              size="sm"
            />
            <nav
              aria-label="Administration breadcrumb"
              className="aks-admin-profile-breadcrumb"
            >
              <Link href="/admin">Administration</Link>
              <span aria-hidden="true">/</span>
              <span>Profile</span>
            </nav>
            <Text className="aks-admin-profile-operator" size="sm">
              {data.operatorEmail}
            </Text>
          </div>
        </Container>
      </header>

      {actionData ? (
        <Container width="wide">
          <Text
            className="aks-admin-profile-feedback"
            role={actionData.ok ? 'status' : 'alert'}
            size="sm"
            tone={actionData.ok ? 'strong' : 'muted'}
          >
            {actionData.message}
          </Text>
        </Container>
      ) : null}

      <AdminProfileInlineEditor
        locale={data.activeLocale}
        profile={data.draftProfile}
        publication={
          publication === null
            ? null
            : { published_at: publication.published_at }
        }
        systemReferences={data.draftSystemReferences}
      />

      <Container className="aks-admin-profile-management" width="wide">
        <details className="aks-admin-profile-management-details">
          <summary className="aks-admin-profile-management-summary">
            Structure, evidence & assets
          </summary>
          <Text
            className="aks-admin-profile-management-intro"
            size="sm"
            tone="muted"
          >
            Use these controls for structure and relationships that do not belong
            to the page copy itself: evidence assignments, ordering, languages,
            mobility, portrait, source CV and audit history.
          </Text>
          <ProfileAdvancedControls />
        </details>
      </Container>

      <footer className="aks-admin-profile-footer">
        <Container width="wide">
          <div className="aks-admin-profile-footer-inner">
            <span>© {new Date().getUTCFullYear()} AkikSystems</span>
            <span>Private system · Inline Profile editing</span>
          </div>
        </Container>
      </footer>
    </main>
  );
}
