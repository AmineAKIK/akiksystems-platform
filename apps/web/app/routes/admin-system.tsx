import {
  systemEvidencePolicies,
  systemLinkKinds,
  systemPresentationKinds,
  validateSystemPublicationReadiness,
  type PlatformLocale,
  type SystemLinkKind,
} from '@akiksystems/core';
import {
  markSystemDraft,
  publishSystemLocalization,
  unpublishSystemLocalization,
  writeAdminAuditEvent,
} from '@akiksystems/db';
import { Button, Container, Heading, Link, Text } from '@akiksystems/ui';
import { randomUUID } from 'node:crypto';
import { Form, useActionData, useLoaderData } from 'react-router';

import { requireAdminSession } from '../lib/admin.server';
import { appDb } from '../lib/db.server';

import type { Route } from './+types/admin-system';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function requiredSystemId(value: string | undefined): string {
  if (value === undefined || !uuidPattern.test(value)) {
    throw new Response('System not found.', { status: 404 });
  }

  return value;
}

function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

function nullableField(form: FormData, name: string): string | null {
  const value = field(form, name);
  return value === '' ? null : value;
}

function requiredFormLocale(form: FormData): PlatformLocale {
  const locale = field(form, 'locale');

  if (locale !== 'en' && locale !== 'fr') {
    throw new Response('Locale not found.', { status: 404 });
  }

  return locale;
}

function parseTechnologyLines(value: string): Array<{ slug: string; name: string }> {
  if (value.trim() === '') {
    return [];
  }

  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [rawSlug, ...rawName] = line.split('|');
      const slug = (rawSlug ?? '').trim().toLowerCase();
      const name = rawName.join('|').trim();

      if (!slugPattern.test(slug) || name === '') {
        throw new Error(
          `Technology line ${index + 1} must use "slug | Display name".`,
        );
      }

      return { slug, name };
    });
}

function parseLinkLines(
  value: string,
): Array<{
  kind: SystemLinkKind;
  url: string;
  labelEn: string | null;
  labelFr: string | null;
}> {
  if (value.trim() === '') {
    return [];
  }

  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [rawKind, rawUrl, rawLabelEn, rawLabelFr] = line.split('|');
      const kind = (rawKind ?? '').trim().toLowerCase();
      const url = (rawUrl ?? '').trim();
      const labelEn = rawLabelEn?.trim() || null;
      const labelFr = rawLabelFr?.trim() || null;

      if (!systemLinkKinds.includes(kind as SystemLinkKind)) {
        throw new Error(
          `Link line ${index + 1} has an unsupported type.`,
        );
      }

      let parsed: URL;
      try {
        parsed = new URL(url);
      } catch {
        throw new Error(`Link line ${index + 1} must contain a valid URL.`);
      }

      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error(
          `Link line ${index + 1} must use http:// or https://.`,
        );
      }

      return {
        kind: kind as SystemLinkKind,
        url,
        labelEn,
        labelFr,
      };
    });
}

async function upsertLocalization(
  db: typeof appDb,
  systemId: string,
  locale: PlatformLocale,
  values: {
    slug: string | null;
    title: string | null;
    summary: string | null;
    proofRole: string | null;
    proofMaturity: string | null;
    proofDemoNature: string | null;
    proofDataNature: string | null;
    proofLimits: string | null;
  },
) {
  const existing = await db
    .selectFrom('system_localizations')
    .select('system_id')
    .where('system_id', '=', systemId)
    .where('locale', '=', locale)
    .executeTakeFirst();

  if (existing === undefined) {
    await db
      .insertInto('system_localizations')
      .values({
        system_id: systemId,
        locale,
        slug: values.slug,
        title: values.title,
        summary: values.summary,
        proof_role: values.proofRole,
        proof_maturity: values.proofMaturity,
        proof_demo_nature: values.proofDemoNature,
        proof_data_nature: values.proofDataNature,
        proof_limits: values.proofLimits,
      })
      .execute();
  } else {
    await db
      .updateTable('system_localizations')
      .set({
        slug: values.slug,
        title: values.title,
        summary: values.summary,
        proof_role: values.proofRole,
        proof_maturity: values.proofMaturity,
        proof_demo_nature: values.proofDemoNature,
        proof_data_nature: values.proofDataNature,
        proof_limits: values.proofLimits,
        updated_at: new Date(),
      })
      .where('system_id', '=', systemId)
      .where('locale', '=', locale)
      .execute();
  }
}

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireAdminSession(request);
  const systemId = requiredSystemId(params.systemId);
  const db = appDb;

    const system = await db
      .selectFrom('systems')
      .select([
        'id',
        'lifecycle',
        'presentation_kind',
        'evidence_policy',
        'archived_at',
        'created_at',
        'updated_at',
      ])
      .where('id', '=', systemId)
      .executeTakeFirst();

    if (system === undefined) {
      throw new Response('System not found.', { status: 404 });
    }

    const [
      localizations,
      technologies,
      experiences,
      links,
      assetCount,
      auditEvents,
      publications,
    ] = await Promise.all([
      db
        .selectFrom('system_localizations')
        .select([
          'locale',
          'slug',
          'title',
          'summary',
          'proof_role',
          'proof_maturity',
          'proof_demo_nature',
          'proof_data_nature',
          'proof_limits',
          'editorial_state',
          'published_at',
          'presentation_document',
        ])
        .where('system_id', '=', systemId)
        .execute(),
      db
        .selectFrom('system_technologies')
        .innerJoin(
          'technologies',
          'technologies.id',
          'system_technologies.technology_id',
        )
        .select([
          'technologies.id',
          'technologies.slug',
          'technologies.name',
          'system_technologies.position',
        ])
        .where('system_technologies.system_id', '=', systemId)
        .orderBy('system_technologies.position')
        .execute(),
      db
        .selectFrom('system_experiences')
        .innerJoin(
          'experiences',
          'experiences.id',
          'system_experiences.experience_id',
        )
        .leftJoin(
          'experience_localizations as experience_en',
          (join) =>
            join
              .onRef(
                'experience_en.experience_id',
                '=',
                'experiences.id',
              )
              .on('experience_en.locale', '=', 'en'),
        )
        .leftJoin(
          'experience_localizations as experience_fr',
          (join) =>
            join
              .onRef(
                'experience_fr.experience_id',
                '=',
                'experiences.id',
              )
              .on('experience_fr.locale', '=', 'fr'),
        )
        .select([
          'experiences.id',
          'system_experiences.relation_kind',
          'experience_en.title as title_en',
          'experience_en.summary as summary_en',
          'experience_fr.title as title_fr',
          'experience_fr.summary as summary_fr',
        ])
        .where('system_experiences.system_id', '=', systemId)
        .execute(),
      db
        .selectFrom('system_links')
        .select(['id', 'kind', 'url', 'label_en', 'label_fr', 'position'])
        .where('system_id', '=', systemId)
        .orderBy('position')
        .execute(),
      db
        .selectFrom('system_assets')
        .select(({ fn }) => fn.countAll<number>().as('count'))
        .where('system_id', '=', systemId)
        .executeTakeFirstOrThrow(),
      db
        .selectFrom('admin_audit_events')
        .select([
          'id',
          'actor_email',
          'action',
          'entity_type',
          'entity_id',
          'locale',
          'metadata',
          'created_at',
        ])
        .where('system_id', '=', systemId)
        .orderBy('created_at', 'desc')
        .limit(20)
        .execute(),
      db
        .selectFrom('system_publications')
        .select(['locale', 'published_at'])
        .where('system_id', '=', systemId)
        .execute(),
    ]);

    const byLocale = new Map(
      localizations.map((localization) => [localization.locale, localization]),
    );

    const en = byLocale.get('en') ?? null;
    const fr = byLocale.get('fr') ?? null;

    const enReadiness = validateSystemPublicationReadiness({
      slug: en?.slug ?? null,
      title: en?.title ?? null,
      summary: en?.summary ?? null,
      proofRole: en?.proof_role ?? null,
      proofMaturity: en?.proof_maturity ?? null,
      proofDemoNature: en?.proof_demo_nature ?? null,
      proofDataNature: en?.proof_data_nature ?? null,
      proofLimits: en?.proof_limits ?? null,
      presentationDocument: en?.presentation_document ?? null,
    });
    const frReadiness = validateSystemPublicationReadiness({
      slug: fr?.slug ?? null,
      title: fr?.title ?? null,
      summary: fr?.summary ?? null,
      proofRole: fr?.proof_role ?? null,
      proofMaturity: fr?.proof_maturity ?? null,
      proofDemoNature: fr?.proof_demo_nature ?? null,
      proofDataNature: fr?.proof_data_nature ?? null,
      proofLimits: fr?.proof_limits ?? null,
      presentationDocument: fr?.presentation_document ?? null,
    });

    return {
      system,
      en,
      fr,
      enReadiness,
      frReadiness,
      technologies,
      experience: experiences[0] ?? null,
      links,
      assetCount: Number(assetCount.count),
      publicationState: {
        en: publications.some((publication) => publication.locale === 'en'),
        fr: publications.some((publication) => publication.locale === 'fr'),
      },
      auditEvents: auditEvents.map((event) => ({
        ...event,
        created_at: event.created_at.toISOString(),
      })),
    };
}

export async function action({ request, params }: Route.ActionArgs) {
  const session = await requireAdminSession(request);
  const systemId = requiredSystemId(params.systemId);
  const form = await request.formData();
  const intent = field(form, '_intent');
  const db = appDb;

    const system = await db
      .selectFrom('systems')
      .select(['id', 'lifecycle', 'presentation_kind', 'evidence_policy'])
      .where('id', '=', systemId)
      .executeTakeFirst();

    if (system === undefined) {
      throw new Response('System not found.', { status: 404 });
    }

    if (intent === 'identity') {
      const lifecycle = field(form, 'lifecycle');
      const presentationKind = field(form, 'presentationKind');
      const evidencePolicy = field(form, 'evidencePolicy');

      if (lifecycle !== 'active' && lifecycle !== 'archived') {
        return { ok: false, message: 'Invalid lifecycle.' };
      }
      if (!systemPresentationKinds.includes(presentationKind as never)) {
        return { ok: false, message: 'Invalid presentation kind.' };
      }
      if (!systemEvidencePolicies.includes(evidencePolicy as never)) {
        return { ok: false, message: 'Invalid evidence policy.' };
      }

      await db.transaction().execute(async (transaction) => {
        await transaction
          .updateTable('systems')
          .set({
            lifecycle,
            presentation_kind: presentationKind as typeof system.presentation_kind,
            evidence_policy: evidencePolicy as typeof system.evidence_policy,
            archived_at: lifecycle === 'archived' ? new Date() : null,
            updated_at: new Date(),
          })
          .where('id', '=', systemId)
          .execute();

        if (
          system.presentation_kind !== presentationKind ||
          system.evidence_policy !== evidencePolicy
        ) {
          await markSystemDraft(transaction, { systemId });
        }

        await writeAdminAuditEvent(transaction, {
          actorUserId: session.user.id,
          actorEmail: session.user.email,
          action:
            lifecycle === 'archived'
              ? 'system.archived'
              : system.lifecycle === 'archived'
                ? 'system.restored'
                : 'system.lifecycle_updated',
          entityType: 'system',
          entityId: systemId,
          systemId,
          metadata: {
            previousLifecycle: system.lifecycle,
            lifecycle,
            previousPresentationKind: system.presentation_kind,
            presentationKind,
            previousEvidencePolicy: system.evidence_policy,
            evidencePolicy,
          },
        });
      });

      return { ok: true, message: 'System identity updated.' };
    }

    if (intent === 'localization') {
      const locale = requiredFormLocale(form);
      const slug = nullableField(form, 'slug');
      const title = nullableField(form, 'title');
      const summary = nullableField(form, 'summary');
      const proofRole = nullableField(form, 'proofRole');
      const proofMaturity = nullableField(form, 'proofMaturity');
      const proofDemoNature = nullableField(form, 'proofDemoNature');
      const proofDataNature = nullableField(form, 'proofDataNature');
      const proofLimits = nullableField(form, 'proofLimits');

      if (slug !== null && !slugPattern.test(slug)) {
        return {
          ok: false,
          message: `${locale.toUpperCase()} slug is invalid.`,
        };
      }

      const current = await db
        .selectFrom('system_localizations')
        .select([
          'editorial_state',
          'presentation_document',
          'proof_role',
          'proof_maturity',
          'proof_demo_nature',
          'proof_data_nature',
          'proof_limits',
        ])
        .where('system_id', '=', systemId)
        .where('locale', '=', locale)
        .executeTakeFirst();

      await markSystemDraft(db, { systemId, locale });
      await upsertLocalization(db, systemId, locale, {
        slug,
        title,
        summary,
        proofRole,
        proofMaturity,
        proofDemoNature,
        proofDataNature,
        proofLimits,
      });

      await writeAdminAuditEvent(db, {
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: 'system.localization_updated',
        entityType: 'system_localization',
        entityId: `${systemId}:${locale}`,
        systemId,
        locale,
        metadata: {
          fields: [
            'slug',
            'title',
            'summary',
            'proofRole',
            'proofMaturity',
            'proofDemoNature',
            'proofDataNature',
            'proofLimits',
          ],
          editorialState: current?.editorial_state ?? 'draft',
        },
      });

      return {
        ok: true,
        message: `${locale.toUpperCase()} content updated independently.`,
      };
    }

    if (intent === 'publish' || intent === 'unpublish') {
      const locale = requiredFormLocale(form);

      const localization = await db
        .selectFrom('system_localizations')
        .select([
          'slug',
          'title',
          'summary',
          'proof_role',
          'proof_maturity',
          'proof_demo_nature',
          'proof_data_nature',
          'proof_limits',
          'presentation_document',
          'editorial_state',
        ])
        .where('system_id', '=', systemId)
        .where('locale', '=', locale)
        .executeTakeFirst();

      if (localization === undefined) {
        return {
          ok: false,
          message: `${locale.toUpperCase()} localization does not exist.`,
        };
      }

      if (intent === 'publish') {
        const readiness = validateSystemPublicationReadiness({
          slug: localization.slug,
          title: localization.title,
          summary: localization.summary,
          proofRole: localization.proof_role,
          proofMaturity: localization.proof_maturity,
          proofDemoNature: localization.proof_demo_nature,
          proofDataNature: localization.proof_data_nature,
          proofLimits: localization.proof_limits,
          presentationDocument: localization.presentation_document,
        });

        if (!readiness.ready) {
          return {
            ok: false,
            message: `${locale.toUpperCase()} cannot publish: ${readiness.errors.join(' ')}`,
          };
        }

        await publishSystemLocalization(db, { systemId, locale });
        await writeAdminAuditEvent(db, {
          actorUserId: session.user.id,
          actorEmail: session.user.email,
          action: 'system.localization_published',
          entityType: 'system_localization',
          entityId: `${systemId}:${locale}`,
          systemId,
          locale,
          metadata: {
            previousState: localization.editorial_state,
            publicationModel: 'snapshot',
          },
        });

        return {
          ok: true,
          message: `${locale.toUpperCase()} public snapshot published.`,
        };
      }

      await unpublishSystemLocalization(db, { systemId, locale });
      await writeAdminAuditEvent(db, {
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: 'system.localization_unpublished',
        entityType: 'system_localization',
        entityId: `${systemId}:${locale}`,
        systemId,
        locale,
        metadata: {
          previousState: localization.editorial_state,
          publicationModel: 'snapshot',
        },
      });

      return {
        ok: true,
        message: `${locale.toUpperCase()} public snapshot removed.`,
      };
    }

    if (intent === 'technologies') {
      let technologies: Array<{ slug: string; name: string }>;

      try {
        technologies = parseTechnologyLines(field(form, 'technologies'));
      } catch (error) {
        return {
          ok: false,
          message: error instanceof Error ? error.message : 'Invalid technologies.',
        };
      }

      await db.transaction().execute(async (transaction) => {
        await transaction
          .deleteFrom('system_technologies')
          .where('system_id', '=', systemId)
          .execute();

        for (const [position, technology] of technologies.entries()) {
          const existing = await transaction
            .selectFrom('technologies')
            .select('id')
            .where('slug', '=', technology.slug)
            .executeTakeFirst();

          const technologyId = existing?.id ?? randomUUID();

          if (existing === undefined) {
            await transaction
              .insertInto('technologies')
              .values({
                id: technologyId,
                slug: technology.slug,
                name: technology.name,
              })
              .execute();
          } else {
            await transaction
              .updateTable('technologies')
              .set({
                name: technology.name,
                updated_at: new Date(),
              })
              .where('id', '=', technologyId)
              .execute();
          }

          await transaction
            .insertInto('system_technologies')
            .values({
              system_id: systemId,
              technology_id: technologyId,
              position,
            })
            .execute();
        }

        await markSystemDraft(transaction, { systemId });

        await writeAdminAuditEvent(transaction, {
          actorUserId: session.user.id,
          actorEmail: session.user.email,
          action: 'system.technologies_updated',
          entityType: 'system',
          entityId: systemId,
          systemId,
          metadata: {
            technologyCount: technologies.length,
            technologySlugs: technologies.map((technology) => technology.slug),
          },
        });
      });

      return { ok: true, message: 'Technology stack updated.' };
    }

    if (intent === 'experience') {
      const titleEn = field(form, 'experienceTitleEn');
      const titleFr = field(form, 'experienceTitleFr');

      if (titleEn === '' || titleFr === '') {
        return {
          ok: false,
          message: 'Experience requires both EN and FR titles.',
        };
      }

      const linked = await db
        .selectFrom('system_experiences')
        .select('experience_id')
        .where('system_id', '=', systemId)
        .where('relation_kind', '=', 'origin_context')
        .executeTakeFirst();

      const experienceId = linked?.experience_id ?? randomUUID();

      await db.transaction().execute(async (transaction) => {
        if (linked === undefined) {
          await transaction
            .insertInto('experiences')
            .values({ id: experienceId })
            .execute();

          await transaction
            .insertInto('system_experiences')
            .values({
              system_id: systemId,
              experience_id: experienceId,
              relation_kind: 'origin_context',
            })
            .execute();
        }

        for (const locale of ['en', 'fr'] as const) {
          const existing = await transaction
            .selectFrom('experience_localizations')
            .select('experience_id')
            .where('experience_id', '=', experienceId)
            .where('locale', '=', locale)
            .executeTakeFirst();

          const title =
            locale === 'en'
              ? titleEn
              : titleFr;
          const summary =
            locale === 'en'
              ? nullableField(form, 'experienceSummaryEn')
              : nullableField(form, 'experienceSummaryFr');

          if (existing === undefined) {
            await transaction
              .insertInto('experience_localizations')
              .values({
                experience_id: experienceId,
                locale,
                title,
                summary,
              })
              .execute();
          } else {
            await transaction
              .updateTable('experience_localizations')
              .set({
                title,
                summary,
                updated_at: new Date(),
              })
              .where('experience_id', '=', experienceId)
              .where('locale', '=', locale)
              .execute();
          }
        }

        await markSystemDraft(transaction, { systemId });

        await writeAdminAuditEvent(transaction, {
          actorUserId: session.user.id,
          actorEmail: session.user.email,
          action: 'system.origin_context_updated',
          entityType: 'experience',
          entityId: experienceId,
          systemId,
          metadata: {
            relationKind: 'origin_context',
            locales: ['en', 'fr'],
          },
        });
      });

      return { ok: true, message: 'Professional context updated.' };
    }

    if (intent === 'links') {
      let links: Array<{
        kind: SystemLinkKind;
        url: string;
        labelEn: string | null;
        labelFr: string | null;
      }>;

      try {
        links = parseLinkLines(field(form, 'links'));
      } catch (error) {
        return {
          ok: false,
          message: error instanceof Error ? error.message : 'Invalid links.',
        };
      }

      await db.transaction().execute(async (transaction) => {
        await transaction
          .deleteFrom('system_links')
          .where('system_id', '=', systemId)
          .execute();

        for (const [position, link] of links.entries()) {
          await transaction
            .insertInto('system_links')
            .values({
              id: randomUUID(),
              system_id: systemId,
              kind: link.kind,
              url: link.url,
              label_en: link.labelEn,
              label_fr: link.labelFr,
              position,
            })
            .execute();
        }

        await markSystemDraft(transaction, { systemId });

        await writeAdminAuditEvent(transaction, {
          actorUserId: session.user.id,
          actorEmail: session.user.email,
          action: 'system.links_updated',
          entityType: 'system',
          entityId: systemId,
          systemId,
          metadata: {
            linkCount: links.length,
            linkKinds: links.map((link) => link.kind),
          },
        });
      });

      return { ok: true, message: 'System links updated.' };
    }

    return { ok: false, message: 'Unsupported System operation.' };
}

function auditActionLabel(action: string): string {
  const labels: Record<string, string> = {
    'system.created': 'System created',
    'system.archived': 'System archived',
    'system.restored': 'System restored',
    'system.lifecycle_updated': 'Lifecycle updated',
    'system.localization_updated': 'Localized content updated',
    'system.localization_published': 'Localization published',
    'system.localization_unpublished': 'Localization unpublished',
    'system.technologies_updated': 'Technology stack updated',
    'system.origin_context_updated': 'Origin context updated',
    'system.links_updated': 'Links updated',
    'system.presentation_updated': 'Presentation updated',
    'system.asset_uploaded': 'Asset uploaded',
    'system.asset_deleted': 'Asset deleted',
  };

  return labels[action] ?? action;
}

export default function AdminSystem() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  const technologyText = data.technologies
    .map((technology) => `${technology.slug} | ${technology.name}`)
    .join('\n');
  const linkText = data.links
    .map(
      (link) =>
        `${link.kind} | ${link.url} | ${link.label_en ?? ''} | ${link.label_fr ?? ''}`,
    )
    .join('\n');

  const presentationEnBlocks = data.en?.presentation_document?.blocks.length ?? 0;
  const presentationFrBlocks = data.fr?.presentation_document?.blocks.length ?? 0;

  return (
    <main className="aks-admin-shell">
      <Container>
        <div className="aks-proof-stack">
          <section className="aks-admin-card">
            <div className="aks-proof-stack">
              <Text className="aks-proof-eyebrow" size="sm" tone="muted">
                System workspace
              </Text>
              <Heading level={1} size="md">
                {data.en?.title ?? data.fr?.title ?? 'Sentinel'}
              </Heading>
              <Text tone="muted">
                Manage one System as a coherent domain object: identity,
                bilingual content, stack, context, links, presentation and media.
              </Text>
              <div className="aks-proof-actions">
                <Link href="/admin/systems">Back to Systems</Link>
                <Link href={`/admin/systems/${data.system.id}/presentation/en`}>
                  EN presentation ({presentationEnBlocks})
                </Link>
                <Link href={`/admin/systems/${data.system.id}/preview/en`}>
                  Preview EN
                </Link>
                <Link href={`/admin/systems/${data.system.id}/presentation/fr`}>
                  FR presentation ({presentationFrBlocks})
                </Link>
                <Link href={`/admin/systems/${data.system.id}/preview/fr`}>
                  Preview FR
                </Link>
                <Link href={`/admin/systems/${data.system.id}/assets`}>
                  Media ({data.assetCount})
                </Link>
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

          <div className="aks-admin-domain-grid">
            <section className="aks-admin-card">
              <Form className="aks-admin-form" method="post">
                <input name="_intent" type="hidden" value="identity" />
                <Heading level={2} size="sm">Identity</Heading>
                <Text size="sm" tone="muted">{data.system.id}</Text>
                <label>
                  <span>Lifecycle</span>
                  <select defaultValue={data.system.lifecycle} name="lifecycle">
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                  </select>
                </label>
                <label>
                  <span>Presentation kind</span>
                  <select
                    defaultValue={data.system.presentation_kind}
                    name="presentationKind"
                  >
                    {systemPresentationKinds.map((kind) => (
                      <option key={kind} value={kind}>{kind}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Evidence policy</span>
                  <select
                    defaultValue={data.system.evidence_policy}
                    name="evidencePolicy"
                  >
                    {systemEvidencePolicies.map((policy) => (
                      <option key={policy} value={policy}>{policy}</option>
                    ))}
                  </select>
                </label>
                <Text size="sm" tone="muted">
                  Changing presentation or evidence policy creates unpublished
                  draft changes. Existing public snapshots stay unchanged until
                  each locale is republished.
                </Text>
                <Button type="submit">Save identity</Button>
              </Form>
            </section>

            <section className="aks-admin-card">
              <div className="aks-proof-stack">
                <Heading level={2} size="sm">Publication readiness</Heading>

                <div className="aks-admin-readiness">
                  <Text size="sm" tone={data.enReadiness.ready ? 'strong' : 'muted'}>
                    EN · draft {data.en?.editorial_state ?? 'draft'} · public{' '}
                    {data.publicationState.en ? 'published' : 'not published'} ·{' '}
                    {data.enReadiness.ready ? 'ready to publish' : 'not ready'}
                  </Text>
                  {!data.enReadiness.ready ? (
                    <ul>
                      {data.enReadiness.errors.map((error) => (
                        <li key={error}>
                          <Text size="sm">{error}</Text>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>

                <div className="aks-admin-readiness">
                  <Text size="sm" tone={data.frReadiness.ready ? 'strong' : 'muted'}>
                    FR · draft {data.fr?.editorial_state ?? 'draft'} · public{' '}
                    {data.publicationState.fr ? 'published' : 'not published'} ·{' '}
                    {data.frReadiness.ready ? 'ready to publish' : 'not ready'}
                  </Text>
                  {!data.frReadiness.ready ? (
                    <ul>
                      {data.frReadiness.errors.map((error) => (
                        <li key={error}>
                          <Text size="sm">{error}</Text>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>

                <Text size="sm" tone="muted">
                  Publication is locale-scoped and snapshot-based. Draft edits
                  never change the public version until Publish replaces that
                  locale's snapshot.
                </Text>
              </div>
            </section>
          </div>

          <section className="aks-admin-card">
            <div className="aks-proof-stack">
              <Heading level={2} size="sm">Localized content & publication</Heading>
              <Text size="sm" tone="muted">
                Each locale saves and publishes independently. Editing FR never
                writes EN, and editing EN never writes FR.
              </Text>

              <div className="aks-admin-domain-grid">
                <div className="aks-admin-fieldset">
                  <Form className="aks-admin-form" method="post">
                    <input name="_intent" type="hidden" value="localization" />
                    <input name="locale" type="hidden" value="en" />
                    <Heading level={3} size="sm">English</Heading>
                    <label>
                      <span>Slug</span>
                      <input defaultValue={data.en?.slug ?? ''} name="slug" />
                    </label>
                    <label>
                      <span>Title</span>
                      <input defaultValue={data.en?.title ?? ''} name="title" />
                    </label>
                    <label>
                      <span>Summary</span>
                      <textarea
                        defaultValue={data.en?.summary ?? ''}
                        name="summary"
                        rows={5}
                      />
                    </label>
                    <label>
                      <span>Role</span>
                      <input defaultValue={data.en?.proof_role ?? ''} name="proofRole" />
                    </label>
                    <label>
                      <span>Maturity</span>
                      <input defaultValue={data.en?.proof_maturity ?? ''} name="proofMaturity" />
                    </label>
                    <label>
                      <span>Demo nature</span>
                      <input defaultValue={data.en?.proof_demo_nature ?? ''} name="proofDemoNature" />
                    </label>
                    <label>
                      <span>Data nature</span>
                      <input defaultValue={data.en?.proof_data_nature ?? ''} name="proofDataNature" />
                    </label>
                    <label>
                      <span>Relevant limits</span>
                      <textarea defaultValue={data.en?.proof_limits ?? ''} name="proofLimits" rows={4} />
                    </label>
                    <Button type="submit">Save EN only</Button>
                  </Form>
                  <div className="aks-proof-stack">
                    <Text size="sm" tone={data.enReadiness.ready ? 'strong' : 'muted'}>
                      {data.en?.editorial_state ?? 'draft'} ·{' '}
                      {data.enReadiness.ready ? 'ready' : 'not ready'}
                    </Text>
                    <div className="aks-proof-actions">
                      <Form method="post">
                        <input name="_intent" type="hidden" value="publish" />
                        <input name="locale" type="hidden" value="en" />
                        <Button
                          disabled={!data.enReadiness.ready}
                          emphasis="quiet"
                          type="submit"
                        >
                          {data.publicationState.en
                            ? 'Publish EN update'
                            : 'Publish EN'}
                        </Button>
                      </Form>
                      {data.publicationState.en ? (
                        <Form method="post">
                          <input name="_intent" type="hidden" value="unpublish" />
                          <input name="locale" type="hidden" value="en" />
                          <Button emphasis="quiet" type="submit">
                            Unpublish EN
                          </Button>
                        </Form>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="aks-admin-fieldset">
                  <Form className="aks-admin-form" method="post">
                    <input name="_intent" type="hidden" value="localization" />
                    <input name="locale" type="hidden" value="fr" />
                    <Heading level={3} size="sm">Français</Heading>
                    <label>
                      <span>Slug</span>
                      <input defaultValue={data.fr?.slug ?? ''} name="slug" />
                    </label>
                    <label>
                      <span>Titre</span>
                      <input defaultValue={data.fr?.title ?? ''} name="title" />
                    </label>
                    <label>
                      <span>Résumé</span>
                      <textarea
                        defaultValue={data.fr?.summary ?? ''}
                        name="summary"
                        rows={5}
                      />
                    </label>
                    <label>
                      <span>Rôle</span>
                      <input defaultValue={data.fr?.proof_role ?? ''} name="proofRole" />
                    </label>
                    <label>
                      <span>Maturité</span>
                      <input defaultValue={data.fr?.proof_maturity ?? ''} name="proofMaturity" />
                    </label>
                    <label>
                      <span>Nature de la démo</span>
                      <input defaultValue={data.fr?.proof_demo_nature ?? ''} name="proofDemoNature" />
                    </label>
                    <label>
                      <span>Nature des données</span>
                      <input defaultValue={data.fr?.proof_data_nature ?? ''} name="proofDataNature" />
                    </label>
                    <label>
                      <span>Limites pertinentes</span>
                      <textarea defaultValue={data.fr?.proof_limits ?? ''} name="proofLimits" rows={4} />
                    </label>
                    <Button type="submit">Save FR only</Button>
                  </Form>
                  <div className="aks-proof-stack">
                    <Text size="sm" tone={data.frReadiness.ready ? 'strong' : 'muted'}>
                      {data.fr?.editorial_state ?? 'draft'} ·{' '}
                      {data.frReadiness.ready ? 'ready' : 'not ready'}
                    </Text>
                    <div className="aks-proof-actions">
                      <Form method="post">
                        <input name="_intent" type="hidden" value="publish" />
                        <input name="locale" type="hidden" value="fr" />
                        <Button
                          disabled={!data.frReadiness.ready}
                          emphasis="quiet"
                          type="submit"
                        >
                          {data.publicationState.fr
                            ? 'Publish FR update'
                            : 'Publish FR'}
                        </Button>
                      </Form>
                      {data.publicationState.fr ? (
                        <Form method="post">
                          <input name="_intent" type="hidden" value="unpublish" />
                          <input name="locale" type="hidden" value="fr" />
                          <Button emphasis="quiet" type="submit">
                            Unpublish FR
                          </Button>
                        </Form>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="aks-admin-card">
            <Form className="aks-admin-form" method="post">
              <input name="_intent" type="hidden" value="technologies" />
              <Heading level={2} size="sm">Technologies</Heading>
              <Text size="sm" tone="muted">
                One ordered technology per line: slug | Display name
              </Text>
              <textarea
                defaultValue={technologyText}
                name="technologies"
                rows={8}
              />
              <Button type="submit">Save technology stack</Button>
            </Form>
          </section>

          <section className="aks-admin-card">
            <Form className="aks-admin-form" method="post">
              <input name="_intent" type="hidden" value="experience" />
              <Heading level={2} size="sm">Origin context</Heading>
              <div className="aks-admin-domain-grid">
                <fieldset className="aks-admin-fieldset">
                  <legend>English</legend>
                  <label>
                    <span>Experience title</span>
                    <input
                      defaultValue={data.experience?.title_en ?? 'Marelli'}
                      name="experienceTitleEn"
                    />
                  </label>
                  <label>
                    <span>Summary</span>
                    <textarea
                      defaultValue={data.experience?.summary_en ?? ''}
                      name="experienceSummaryEn"
                      rows={4}
                    />
                  </label>
                </fieldset>
                <fieldset className="aks-admin-fieldset">
                  <legend>Français</legend>
                  <label>
                    <span>Titre de l’expérience</span>
                    <input
                      defaultValue={data.experience?.title_fr ?? 'Marelli'}
                      name="experienceTitleFr"
                    />
                  </label>
                  <label>
                    <span>Résumé</span>
                    <textarea
                      defaultValue={data.experience?.summary_fr ?? ''}
                      name="experienceSummaryFr"
                      rows={4}
                    />
                  </label>
                </fieldset>
              </div>
              <Button type="submit">Save origin context</Button>
            </Form>
          </section>

          <section className="aks-admin-card">
            <Form className="aks-admin-form" method="post">
              <input name="_intent" type="hidden" value="links" />
              <Heading level={2} size="sm">External links</Heading>
              <Text size="sm" tone="muted">
                One ordered link per line: live|repository|demo|documentation | https://...
              </Text>
              <textarea defaultValue={linkText} name="links" rows={8} />
              <Button type="submit">Save links</Button>
            </Form>
          </section>

          <section className="aks-admin-card">
            <div className="aks-proof-stack">
              <Heading level={2} size="sm">Recent audit activity</Heading>
              <Text size="sm" tone="muted">
                Significant admin mutations only. Editorial payloads and secrets
                are deliberately excluded.
              </Text>
              {data.auditEvents.length === 0 ? (
                <Text size="sm" tone="muted">No audit events yet.</Text>
              ) : (
                <ol className="aks-admin-audit-list">
                  {data.auditEvents.map((event) => (
                    <li key={event.id}>
                      <div className="aks-proof-stack">
                        <Text tone="strong">{auditActionLabel(event.action)}</Text>
                        <Text size="sm" tone="muted">
                          {event.locale ? `${event.locale.toUpperCase()} · ` : ''}
                          {event.entity_type} · {event.actor_email} · {event.created_at}
                        </Text>
                        <code className="aks-admin-audit-metadata">
                          {JSON.stringify(event.metadata)}
                        </code>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </section>

          <section className="aks-admin-card">
            <div className="aks-proof-stack">
              <Heading level={2} size="sm">Presentation & media</Heading>
              <div className="aks-admin-domain-grid">
                <article className="aks-admin-asset">
                  <div className="aks-proof-stack">
                    <Text tone="strong">English presentation</Text>
                    <Text size="sm" tone="muted">
                      {presentationEnBlocks} structured blocks
                    </Text>
                    <div className="aks-proof-actions">
                      <Link href={`/admin/systems/${data.system.id}/presentation/en`}>
                        Open editor
                      </Link>
                      <Link href={`/admin/systems/${data.system.id}/preview/en`}>
                        Preview
                      </Link>
                    </div>
                  </div>
                </article>
                <article className="aks-admin-asset">
                  <div className="aks-proof-stack">
                    <Text tone="strong">French presentation</Text>
                    <Text size="sm" tone="muted">
                      {presentationFrBlocks} structured blocks
                    </Text>
                    <div className="aks-proof-actions">
                      <Link href={`/admin/systems/${data.system.id}/presentation/fr`}>
                        Open editor
                      </Link>
                      <Link href={`/admin/systems/${data.system.id}/preview/fr`}>
                        Preview
                      </Link>
                    </div>
                  </div>
                </article>
                <article className="aks-admin-asset">
                  <div className="aks-proof-stack">
                    <Text tone="strong">Contextual media</Text>
                    <Text size="sm" tone="muted">
                      {data.assetCount} linked assets
                    </Text>
                    <Link href={`/admin/systems/${data.system.id}/assets`}>
                      Manage media
                    </Link>
                  </div>
                </article>
              </div>
            </div>
          </section>
        </div>
      </Container>
    </main>
  );
}
