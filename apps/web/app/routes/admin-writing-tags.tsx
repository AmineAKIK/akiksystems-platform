import {
  publishTagLocalization,
  unpublishTagLocalization,
  writeAdminAuditEvent,
} from '@akiksystems/db';
import type { PlatformLocale } from '@akiksystems/core';
import { Button, Container, Heading, Link, Text } from '@akiksystems/ui';
import { randomUUID } from 'node:crypto';
import { Form, useActionData, useLoaderData } from 'react-router';

import { requireAdminSession } from '../lib/admin.server';
import { appDb } from '../lib/db.server';

import type { Route } from './+types/admin-writing-tags';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const canonicalKeyPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

function nullableField(form: FormData, name: string): string | null {
  const value = field(form, name);
  return value === '' ? null : value;
}

function requiredTagId(form: FormData): string {
  const id = field(form, 'tagId');
  if (!uuidPattern.test(id)) {
    throw new Response('Tag not found.', { status: 404 });
  }
  return id;
}

function requiredLocale(form: FormData): PlatformLocale {
  const locale = field(form, 'locale');
  if (locale !== 'en' && locale !== 'fr') {
    throw new Response('Invalid locale.', { status: 400 });
  }
  return locale;
}

function requiredCanonicalKey(form: FormData): string {
  const canonicalKey = field(form, 'canonicalKey');
  if (!canonicalKeyPattern.test(canonicalKey)) {
    throw new Response(
      'Canonical Tag key must use lowercase letters, digits, and hyphens.',
      { status: 400 },
    );
  }
  return canonicalKey;
}

function publicHref(locale: PlatformLocale, slug: string): string {
  return locale === 'fr'
    ? `/fr/ecrits/tags/${slug}`
    : `/en/writings/tags/${slug}`;
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdminSession(request);

  const tags = await appDb
    .selectFrom('tags')
    .leftJoin('tag_localizations as en', (join) =>
      join
        .onRef('en.tag_id', '=', 'tags.id')
        .on('en.locale', '=', 'en'),
    )
    .leftJoin('tag_localizations as fr', (join) =>
      join
        .onRef('fr.tag_id', '=', 'tags.id')
        .on('fr.locale', '=', 'fr'),
    )
    .leftJoin('tag_publications as pub_en', (join) =>
      join
        .onRef('pub_en.tag_id', '=', 'tags.id')
        .on('pub_en.locale', '=', 'en'),
    )
    .leftJoin('tag_publications as pub_fr', (join) =>
      join
        .onRef('pub_fr.tag_id', '=', 'tags.id')
        .on('pub_fr.locale', '=', 'fr'),
    )
    .select([
      'tags.id',
      'tags.canonical_key',
      'en.slug as slug_en',
      'en.name as name_en',
      'en.editorial_state as editorial_state_en',
      'fr.slug as slug_fr',
      'fr.name as name_fr',
      'fr.editorial_state as editorial_state_fr',
      'pub_en.slug as published_slug_en',
      'pub_fr.slug as published_slug_fr',
    ])
    .orderBy('tags.canonical_key')
    .orderBy('tags.id')
    .execute();

  return { tags };
}

export async function action({ request }: Route.ActionArgs) {
  const session = await requireAdminSession(request);
  const form = await request.formData();
  const intent = field(form, '_intent');

  if (intent === 'create-tag') {
    const canonicalKey = requiredCanonicalKey(form);
    const existing = await appDb
      .selectFrom('tags')
      .select('id')
      .where('canonical_key', '=', canonicalKey)
      .executeTakeFirst();

    if (existing !== undefined) {
      return {
        ok: false,
        message: 'A Tag with this canonical key already exists.',
      };
    }

    const tagId = randomUUID();
    await appDb.transaction().execute(async (transaction) => {
      await transaction
        .insertInto('tags')
        .values({
          id: tagId,
          canonical_key: canonicalKey,
        })
        .execute();

      await transaction
        .insertInto('tag_localizations')
        .values([
          { tag_id: tagId, locale: 'en' },
          { tag_id: tagId, locale: 'fr' },
        ])
        .execute();

      await writeAdminAuditEvent(transaction, {
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: 'tag.created',
        entityType: 'tag',
        entityId: tagId,
        metadata: { canonicalKey },
      });
    });

    return { ok: true, message: 'Tag created.' };
  }

  const tagId = requiredTagId(form);
  const tag = await appDb
    .selectFrom('tags')
    .select(['id', 'canonical_key'])
    .where('id', '=', tagId)
    .executeTakeFirst();

  if (tag === undefined) {
    throw new Response('Tag not found.', { status: 404 });
  }

  if (intent === 'save-tag-localization') {
    const locale = requiredLocale(form);
    const slug = nullableField(form, 'slug');
    const name = nullableField(form, 'name');

    await appDb.transaction().execute(async (transaction) => {
      await transaction
        .updateTable('tag_localizations')
        .set({
          slug,
          name,
          editorial_state: 'draft',
          published_at: null,
          updated_at: new Date(),
        })
        .where('tag_id', '=', tagId)
        .where('locale', '=', locale)
        .execute();

      await writeAdminAuditEvent(transaction, {
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: 'tag.localization_saved',
        entityType: 'tag',
        entityId: tagId,
        locale,
        metadata: {
          canonicalKey: tag.canonical_key,
          hasSlug: slug !== null,
          hasName: name !== null,
        },
      });
    });

    return {
      ok: true,
      message: `${locale.toUpperCase()} Tag draft saved.`,
    };
  }

  if (intent === 'publish-tag') {
    const locale = requiredLocale(form);
    await publishTagLocalization(appDb, { tagId, locale });
    await writeAdminAuditEvent(appDb, {
      actorUserId: session.user.id,
      actorEmail: session.user.email,
      action: 'tag.published',
      entityType: 'tag',
      entityId: tagId,
      locale,
      metadata: { canonicalKey: tag.canonical_key },
    });
    return {
      ok: true,
      message: `${locale.toUpperCase()} Tag published.`,
    };
  }

  if (intent === 'unpublish-tag') {
    const locale = requiredLocale(form);
    await unpublishTagLocalization(appDb, { tagId, locale });
    await writeAdminAuditEvent(appDb, {
      actorUserId: session.user.id,
      actorEmail: session.user.email,
      action: 'tag.unpublished',
      entityType: 'tag',
      entityId: tagId,
      locale,
      metadata: { canonicalKey: tag.canonical_key },
    });
    return {
      ok: true,
      message: `${locale.toUpperCase()} Tag unpublished.`,
    };
  }

  return { ok: false, message: 'Unknown Tag action.' };
}

export function meta() {
  return [
    { title: 'Writing tags · AkikSystems' },
    { name: 'robots', content: 'noindex, nofollow, noarchive, nosnippet' },
  ];
}

export default function AdminWritingTagsRoute() {
  const { tags } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <main className="aks-admin-shell">
      <Container>
        <div className="aks-proof-stack">
          <section className="aks-admin-card">
            <div className="aks-proof-stack">
              <Text className="aks-proof-eyebrow" size="sm" tone="muted">
                Private administration
              </Text>
              <Heading level={1} size="md">
                Writing tags
              </Heading>
              <Text tone="muted">
                Tags are deduplicated through one canonical key. Public slug and
                name remain independently localized and publishable in EN/FR.
              </Text>
              <Text size="sm" tone="muted">
                Tags describe and connect content for future search/filter use.
                They do not carry layout, styling, or page-builder controls.
              </Text>
              <div className="aks-proof-actions">
                <Link href="/admin/writings">Writings administration</Link>
                <Link href="/en/writings">Open Writings</Link>
              </div>
              {actionData?.message ? <Text>{actionData.message}</Text> : null}
            </div>
          </section>

          <section className="aks-admin-card">
            <div className="aks-proof-stack">
              <Heading level={2} size="sm">
                Create Tag
              </Heading>
              <Form method="post" className="aks-proof-stack">
                <input name="_intent" type="hidden" value="create-tag" />
                <label>
                  <span>Canonical key</span>
                  <input
                    name="canonicalKey"
                    pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                    placeholder="software-architecture"
                    required
                  />
                </label>
                <Text size="sm" tone="muted">
                  Stable, non-localized identifier used to prevent duplicate
                  concepts.
                </Text>
                <Button type="submit">Create Tag</Button>
              </Form>
            </div>
          </section>

          {tags.map((tag) => (
            <section className="aks-admin-card" key={tag.id}>
              <div className="aks-proof-stack">
                <Heading level={2} size="sm">
                  {tag.name_en ?? tag.name_fr ?? tag.canonical_key}
                </Heading>
                <Text size="sm" tone="muted">
                  Canonical key · {tag.canonical_key}
                </Text>

                {(['en', 'fr'] as const).map((locale) => {
                  const slug = locale === 'en' ? tag.slug_en : tag.slug_fr;
                  const name = locale === 'en' ? tag.name_en : tag.name_fr;
                  const editorialState =
                    locale === 'en'
                      ? tag.editorial_state_en
                      : tag.editorial_state_fr;
                  const publishedSlug =
                    locale === 'en'
                      ? tag.published_slug_en
                      : tag.published_slug_fr;

                  return (
                    <fieldset className="aks-admin-card" key={locale}>
                      <legend>{locale.toUpperCase()}</legend>
                      <Text size="sm" tone="muted">
                        Draft state · {editorialState ?? 'draft'} ·{' '}
                        {publishedSlug === null
                          ? 'No public snapshot'
                          : 'Public snapshot available'}
                      </Text>

                      <Form method="post" className="aks-proof-stack">
                        <input
                          name="_intent"
                          type="hidden"
                          value="save-tag-localization"
                        />
                        <input name="tagId" type="hidden" value={tag.id} />
                        <input name="locale" type="hidden" value={locale} />
                        <label>
                          <span>Slug</span>
                          <input
                            defaultValue={slug ?? ''}
                            name="slug"
                            placeholder={
                              locale === 'fr'
                                ? 'architecture-logicielle'
                                : 'software-architecture'
                            }
                          />
                        </label>
                        <label>
                          <span>Name</span>
                          <input defaultValue={name ?? ''} name="name" />
                        </label>
                        <Button type="submit">
                          Save {locale.toUpperCase()} Tag draft
                        </Button>
                      </Form>

                      <div className="aks-proof-actions">
                        <Form method="post">
                          <input
                            name="_intent"
                            type="hidden"
                            value="publish-tag"
                          />
                          <input name="tagId" type="hidden" value={tag.id} />
                          <input name="locale" type="hidden" value={locale} />
                          <Button emphasis="quiet" type="submit">
                            {publishedSlug === null
                              ? 'Publish'
                              : 'Publish update'}{' '}
                            {locale.toUpperCase()}
                          </Button>
                        </Form>

                        {publishedSlug !== null ? (
                          <>
                            <Form method="post">
                              <input
                                name="_intent"
                                type="hidden"
                                value="unpublish-tag"
                              />
                              <input name="tagId" type="hidden" value={tag.id} />
                              <input
                                name="locale"
                                type="hidden"
                                value={locale}
                              />
                              <Button emphasis="quiet" type="submit">
                                Unpublish {locale.toUpperCase()}
                              </Button>
                            </Form>
                            <Link href={publicHref(locale, publishedSlug)}>
                              Open public
                            </Link>
                          </>
                        ) : null}
                      </div>
                    </fieldset>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </Container>
    </main>
  );
}
