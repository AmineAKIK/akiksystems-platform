import {
  systemLinkKinds,
  validateSystemPublicationReadiness,
  type PlatformLocale,
  type SystemLinkKind,
} from '@akiksystems/core';
import { createDatabase } from '@akiksystems/db';
import { Button, Container, Heading, Link, Text } from '@akiksystems/ui';
import { randomUUID } from 'node:crypto';
import { Form, useActionData, useLoaderData } from 'react-router';

import { requireAdminSession } from '../lib/admin.server';
import { authEnv } from '../lib/auth.server';

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
): Array<{ kind: SystemLinkKind; url: string }> {
  if (value.trim() === '') {
    return [];
  }

  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [rawKind, ...rawUrl] = line.split('|');
      const kind = (rawKind ?? '').trim().toLowerCase();
      const url = rawUrl.join('|').trim();

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
      };
    });
}

async function upsertLocalization(
  db: ReturnType<typeof createDatabase>,
  systemId: string,
  locale: PlatformLocale,
  values: {
    slug: string | null;
    title: string | null;
    summary: string | null;
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
      })
      .execute();
  } else {
    await db
      .updateTable('system_localizations')
      .set({
        slug: values.slug,
        title: values.title,
        summary: values.summary,
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
  const db = createDatabase(authEnv.DATABASE_URL);

  try {
    const system = await db
      .selectFrom('systems')
      .select(['id', 'lifecycle', 'archived_at', 'created_at', 'updated_at'])
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
    ] = await Promise.all([
      db
        .selectFrom('system_localizations')
        .select([
          'locale',
          'slug',
          'title',
          'summary',
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
        .select(['id', 'kind', 'url', 'position'])
        .where('system_id', '=', systemId)
        .orderBy('position')
        .execute(),
      db
        .selectFrom('system_assets')
        .select(({ fn }) => fn.countAll<number>().as('count'))
        .where('system_id', '=', systemId)
        .executeTakeFirstOrThrow(),
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
      presentationDocument: en?.presentation_document ?? null,
    });
    const frReadiness = validateSystemPublicationReadiness({
      slug: fr?.slug ?? null,
      title: fr?.title ?? null,
      summary: fr?.summary ?? null,
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
    };
  } finally {
    await db.destroy();
  }
}

export async function action({ request, params }: Route.ActionArgs) {
  await requireAdminSession(request);
  const systemId = requiredSystemId(params.systemId);
  const form = await request.formData();
  const intent = field(form, '_intent');
  const db = createDatabase(authEnv.DATABASE_URL);

  try {
    const system = await db
      .selectFrom('systems')
      .select('id')
      .where('id', '=', systemId)
      .executeTakeFirst();

    if (system === undefined) {
      throw new Response('System not found.', { status: 404 });
    }

    if (intent === 'identity') {
      const lifecycle = field(form, 'lifecycle');

      if (lifecycle !== 'active' && lifecycle !== 'archived') {
        return { ok: false, message: 'Invalid lifecycle.' };
      }

      await db
        .updateTable('systems')
        .set({
          lifecycle,
          archived_at: lifecycle === 'archived' ? new Date() : null,
          updated_at: new Date(),
        })
        .where('id', '=', systemId)
        .execute();

      return { ok: true, message: 'System identity updated.' };
    }

    if (intent === 'localization') {
      const locale = requiredFormLocale(form);
      const slug = nullableField(form, 'slug');
      const title = nullableField(form, 'title');
      const summary = nullableField(form, 'summary');

      if (slug !== null && !slugPattern.test(slug)) {
        return {
          ok: false,
          message: `${locale.toUpperCase()} slug is invalid.`,
        };
      }

      const current = await db
        .selectFrom('system_localizations')
        .select(['editorial_state', 'presentation_document'])
        .where('system_id', '=', systemId)
        .where('locale', '=', locale)
        .executeTakeFirst();

      if (current?.editorial_state === 'published') {
        const readiness = validateSystemPublicationReadiness({
          slug,
          title,
          summary,
          presentationDocument: current.presentation_document,
        });

        if (!readiness.ready) {
          return {
            ok: false,
            message: `${locale.toUpperCase()} is published and cannot become incomplete: ${readiness.errors.join(' ')}`,
          };
        }
      }

      await upsertLocalization(db, systemId, locale, {
        slug,
        title,
        summary,
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
          presentationDocument: localization.presentation_document,
        });

        if (!readiness.ready) {
          return {
            ok: false,
            message: `${locale.toUpperCase()} cannot publish: ${readiness.errors.join(' ')}`,
          };
        }

        if (localization.editorial_state === 'published') {
          return {
            ok: true,
            message: `${locale.toUpperCase()} is already published.`,
          };
        }

        await db
          .updateTable('system_localizations')
          .set({
            editorial_state: 'published',
            published_at: new Date(),
            updated_at: new Date(),
          })
          .where('system_id', '=', systemId)
          .where('locale', '=', locale)
          .execute();

        return {
          ok: true,
          message: `${locale.toUpperCase()} published independently.`,
        };
      }

      if (localization.editorial_state === 'draft') {
        return {
          ok: true,
          message: `${locale.toUpperCase()} is already draft.`,
        };
      }

      await db
        .updateTable('system_localizations')
        .set({
          editorial_state: 'draft',
          published_at: null,
          updated_at: new Date(),
        })
        .where('system_id', '=', systemId)
        .where('locale', '=', locale)
        .execute();

      return {
        ok: true,
        message: `${locale.toUpperCase()} unpublished independently.`,
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
      });

      return { ok: true, message: 'Professional context updated.' };
    }

    if (intent === 'links') {
      let links: Array<{ kind: SystemLinkKind; url: string }>;

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
              position,
            })
            .execute();
        }
      });

      return { ok: true, message: 'System links updated.' };
    }

    return { ok: false, message: 'Unsupported System operation.' };
  } finally {
    await db.destroy();
  }
}

export default function AdminSystem() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  const technologyText = data.technologies
    .map((technology) => `${technology.slug} | ${technology.name}`)
    .join('\n');
  const linkText = data.links
    .map((link) => `${link.kind} | ${link.url}`)
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
                <Link href="/admin">Back to administration</Link>
                <Link href={`/admin/systems/${data.system.id}/presentation/en`}>
                  EN presentation ({presentationEnBlocks})
                </Link>
                <Link href={`/admin/systems/${data.system.id}/presentation/fr`}>
                  FR presentation ({presentationFrBlocks})
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
                <Button type="submit">Save identity</Button>
              </Form>
            </section>

            <section className="aks-admin-card">
              <div className="aks-proof-stack">
                <Heading level={2} size="sm">Publication readiness</Heading>

                <div className="aks-admin-readiness">
                  <Text size="sm" tone={data.enReadiness.ready ? 'strong' : 'muted'}>
                    EN · {data.en?.editorial_state ?? 'draft'} ·{' '}
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
                    FR · {data.fr?.editorial_state ?? 'draft'} ·{' '}
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
                  Publication is locale-scoped. EN and FR can independently be draft or published.
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
                <Form className="aks-admin-form aks-admin-fieldset" method="post">
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
                  <Button type="submit">Save EN only</Button>
                  <Text size="sm" tone={data.enReadiness.ready ? 'strong' : 'muted'}>
                    {data.en?.editorial_state ?? 'draft'} ·{' '}
                    {data.enReadiness.ready ? 'ready' : 'not ready'}
                  </Text>
                  <Form method="post">
                    <input
                      name="_intent"
                      type="hidden"
                      value={data.en?.editorial_state === 'published' ? 'unpublish' : 'publish'}
                    />
                    <input name="locale" type="hidden" value="en" />
                    <Button
                      disabled={
                        data.en?.editorial_state !== 'published' &&
                        !data.enReadiness.ready
                      }
                      emphasis="quiet"
                      type="submit"
                    >
                      {data.en?.editorial_state === 'published'
                        ? 'Unpublish EN'
                        : 'Publish EN'}
                    </Button>
                  </Form>
                </Form>

                <Form className="aks-admin-form aks-admin-fieldset" method="post">
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
                  <Button type="submit">Save FR only</Button>
                  <Text size="sm" tone={data.frReadiness.ready ? 'strong' : 'muted'}>
                    {data.fr?.editorial_state ?? 'draft'} ·{' '}
                    {data.frReadiness.ready ? 'ready' : 'not ready'}
                  </Text>
                  <Form method="post">
                    <input
                      name="_intent"
                      type="hidden"
                      value={data.fr?.editorial_state === 'published' ? 'unpublish' : 'publish'}
                    />
                    <input name="locale" type="hidden" value="fr" />
                    <Button
                      disabled={
                        data.fr?.editorial_state !== 'published' &&
                        !data.frReadiness.ready
                      }
                      emphasis="quiet"
                      type="submit"
                    >
                      {data.fr?.editorial_state === 'published'
                        ? 'Unpublish FR'
                        : 'Publish FR'}
                    </Button>
                  </Form>
                </Form>
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
              <Heading level={2} size="sm">Presentation & media</Heading>
              <div className="aks-admin-domain-grid">
                <article className="aks-admin-asset">
                  <div className="aks-proof-stack">
                    <Text tone="strong">English presentation</Text>
                    <Text size="sm" tone="muted">
                      {presentationEnBlocks} structured blocks
                    </Text>
                    <Link href={`/admin/systems/${data.system.id}/presentation/en`}>
                      Open editor
                    </Link>
                  </div>
                </article>
                <article className="aks-admin-asset">
                  <div className="aks-proof-stack">
                    <Text tone="strong">French presentation</Text>
                    <Text size="sm" tone="muted">
                      {presentationFrBlocks} structured blocks
                    </Text>
                    <Link href={`/admin/systems/${data.system.id}/presentation/fr`}>
                      Open editor
                    </Link>
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
