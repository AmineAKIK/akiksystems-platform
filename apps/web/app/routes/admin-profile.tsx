import { writeAdminAuditEvent } from '@akiksystems/db';
import { Button, Container, Heading, Link, Text } from '@akiksystems/ui';
import { randomUUID } from 'node:crypto';
import { Form, useActionData, useLoaderData } from 'react-router';

import {
  assetExtensionForMimeType,
  deleteAssetObject,
  putAssetObject,
  validateAssetUpload,
} from '../lib/asset-storage.server';
import { requireAdminSession } from '../lib/admin.server';
import { appDb } from '../lib/db.server';

import type { Route } from './+types/admin-profile';

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
  await requireAdminSession(request);
  const profileId = await publicProfileId();

  const [
    profile,
    localizations,
    portrait,
    auditEvents,
    selectableSystems,
    selectedSystems,
    selectableExperiences,
    selectedExperiences,
  ] = await Promise.all([
    appDb
      .selectFrom('profiles')
      .select(['id', 'display_name', 'portrait_asset_id'])
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
      'principle_en.title as title_en',
      'principle_en.detail as detail_en',
      'principle_fr.title as title_fr',
      'principle_fr.detail as detail_fr',
    ])
    .where('profile_work_principles.profile_id', '=', profileId)
    .orderBy('profile_work_principles.position')
    .execute();

  return {
    profile,
    en: byLocale.get('en') ?? null,
    fr: byLocale.get('fr') ?? null,
    portrait: portrait ?? null,
    principles,
    selectableSystems,
    selectedSystems,
    selectableExperiences,
    selectedExperiences,
    auditEvents: auditEvents.map((event) => ({
      ...event,
      created_at: event.created_at.toISOString(),
    })),
  };
}

export async function action({ request }: Route.ActionArgs) {
  const session = await requireAdminSession(request);
  const profileId = await publicProfileId();
  const form = await request.formData();
  const intent = textField(form, '_intent');

  if (intent === 'identity') {
    const displayName = optionalText(form, 'displayName');
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

    await appDb.transaction().execute(async (transaction) => {
      await transaction
        .deleteFrom('profile_work_principles')
        .where('profile_id', '=', profileId)
        .execute();

      for (const [position, principle] of principles.entries()) {
        const principleId = randomUUID();

        await transaction
          .insertInto('profile_work_principles')
          .values({
            id: principleId,
            profile_id: profileId,
            position,
          })
          .execute();

        await transaction
          .insertInto('profile_work_principle_localizations')
          .values([
            {
              principle_id: principleId,
              locale: 'en',
              title: principle.enTitle,
              detail: principle.enDetail,
            },
            {
              principle_id: principleId,
              locale: 'fr',
              title: principle.frTitle,
              detail: principle.frDetail,
            },
          ])
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
        },
      });
    });

    return { ok: true, message: 'How I work updated.' };
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

    if (
      current.portrait_asset_id !== null &&
      current.portrait_storage_key !== null
    ) {
      try {
        await deleteAssetObject(current.portrait_storage_key);
        await appDb
          .deleteFrom('assets')
          .where('id', '=', current.portrait_asset_id)
          .execute();
      } catch {
        // The new portrait is already committed. Keep stale metadata/object for
        // retry rather than rolling back a valid public portrait.
      }
    }

    return { ok: true, message: 'Portrait updated.' };
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

    await deleteAssetObject(current.storage_key);

    await appDb.transaction().execute(async (transaction) => {
      await transaction
        .updateTable('profiles')
        .set({
          portrait_asset_id: null,
          updated_at: new Date(),
        })
        .where('id', '=', profileId)
        .executeTakeFirstOrThrow();

      await transaction.deleteFrom('assets').where('id', '=', current.id).execute();

      await writeAdminAuditEvent(transaction, {
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: 'profile.portrait_removed',
        entityType: 'profile',
        entityId: profileId,
        metadata: {
          storageObjectDeleted: true,
        },
      });
    });

    return { ok: true, message: 'Portrait removed.' };
  }

  return { ok: false, message: 'Unsupported Profile operation.' };
}

export default function AdminProfile() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <main className="aks-admin-shell">
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
            <Form className="aks-admin-form" method="post">
              <input name="_intent" type="hidden" value="identity" />
              <Heading level={2} size="sm">
                Identity & foundational copy
              </Heading>
              <label>
                <span>Display name</span>
                <input
                  defaultValue={data.profile.display_name ?? ''}
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
                      name="professionalTitleEn"
                      type="text"
                    />
                  </label>
                  <label>
                    <span>Introduction</span>
                    <textarea
                      defaultValue={data.en?.introduction ?? ''}
                      name="introductionEn"
                      rows={5}
                    />
                  </label>
                  <label>
                    <span>Foundational profile copy</span>
                    <textarea
                      defaultValue={data.en?.foundational_copy ?? ''}
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
                      name="professionalTitleFr"
                      type="text"
                    />
                  </label>
                  <label>
                    <span>Introduction</span>
                    <textarea
                      defaultValue={data.fr?.introduction ?? ''}
                      name="introductionFr"
                      rows={5}
                    />
                  </label>
                  <label>
                    <span>Texte fondateur du profil</span>
                    <textarea
                      defaultValue={data.fr?.foundational_copy ?? ''}
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
    </main>
  );
}
