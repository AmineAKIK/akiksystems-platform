import {
  publishWritingLocalization,
  unpublishWritingLocalization,
  writeAdminAuditEvent,
} from '@akiksystems/db';
import {
  writingEditorialWeights,
  writingKinds,
  type PlatformLocale,
  type WritingEditorialWeight,
  type WritingKind,
} from '@akiksystems/core';
import { Button, Container, Heading, Link, Text } from '@akiksystems/ui';
import { randomUUID } from 'node:crypto';
import { Form, useActionData, useLoaderData } from 'react-router';

import { requireAdminSession } from '../lib/admin.server';
import { appDb } from '../lib/db.server';

import type { Route } from './+types/admin-writings';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

function nullableField(form: FormData, name: string): string | null {
  const value = field(form, name);
  return value === '' ? null : value;
}

function requiredWritingId(form: FormData): string {
  const id = field(form, 'writingId');
  if (!uuidPattern.test(id)) {
    throw new Response('Writing not found.', { status: 404 });
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

function requiredKind(form: FormData): WritingKind {
  const kind = field(form, 'kind') as WritingKind;
  if (!writingKinds.includes(kind)) {
    throw new Response('Invalid Writing kind.', { status: 400 });
  }
  return kind;
}

function requiredEditorialWeight(form: FormData): WritingEditorialWeight {
  const weight = field(form, 'editorialWeight') as WritingEditorialWeight;
  if (!writingEditorialWeights.includes(weight)) {
    throw new Response('Invalid editorial weight.', { status: 400 });
  }
  return weight;
}

function publicHref(locale: PlatformLocale, slug: string): string {
  return locale === 'fr'
    ? `/fr/ecrits/${slug}`
    : `/en/writings/${slug}`;
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdminSession(request);

  const writings = await appDb
    .selectFrom('writings')
    .leftJoin('writing_localizations as en', (join) =>
      join
        .onRef('en.writing_id', '=', 'writings.id')
        .on('en.locale', '=', 'en'),
    )
    .leftJoin('writing_localizations as fr', (join) =>
      join
        .onRef('fr.writing_id', '=', 'writings.id')
        .on('fr.locale', '=', 'fr'),
    )
    .leftJoin('writing_publications as pub_en', (join) =>
      join
        .onRef('pub_en.writing_id', '=', 'writings.id')
        .on('pub_en.locale', '=', 'en'),
    )
    .leftJoin('writing_publications as pub_fr', (join) =>
      join
        .onRef('pub_fr.writing_id', '=', 'writings.id')
        .on('pub_fr.locale', '=', 'fr'),
    )
    .select([
      'writings.id',
      'writings.kind',
      'writings.editorial_weight',
      'writings.editorial_position',
      'en.slug as slug_en',
      'en.title as title_en',
      'en.summary as summary_en',
      'en.body as body_en',
      'en.editorial_state as editorial_state_en',
      'fr.slug as slug_fr',
      'fr.title as title_fr',
      'fr.summary as summary_fr',
      'fr.body as body_fr',
      'fr.editorial_state as editorial_state_fr',
      'pub_en.slug as published_slug_en',
      'pub_fr.slug as published_slug_fr',
    ])
    .orderBy('writings.editorial_position')
    .orderBy('writings.created_at')
    .orderBy('writings.id')
    .execute();

  const [categories, writingCategories] = await Promise.all([
    appDb
      .selectFrom('categories')
      .leftJoin('category_localizations as en', (join) =>
        join
          .onRef('en.category_id', '=', 'categories.id')
          .on('en.locale', '=', 'en'),
      )
      .leftJoin('category_localizations as fr', (join) =>
        join
          .onRef('fr.category_id', '=', 'categories.id')
          .on('fr.locale', '=', 'fr'),
      )
      .select([
        'categories.id',
        'categories.editorial_position',
        'en.name as name_en',
        'fr.name as name_fr',
      ])
      .orderBy('categories.editorial_position')
      .orderBy('categories.created_at')
      .orderBy('categories.id')
      .execute(),
    appDb
      .selectFrom('writing_categories')
      .select(['writing_id', 'category_id', 'position'])
      .orderBy('writing_id')
      .orderBy('position')
      .execute(),
  ]);

  const categoryIdsByWriting = new Map<string, string[]>();
  for (const relation of writingCategories) {
    const categoryIds = categoryIdsByWriting.get(relation.writing_id) ?? [];
    categoryIds.push(relation.category_id);
    categoryIdsByWriting.set(relation.writing_id, categoryIds);
  }

  return {
    categories,
    writings: writings.map((writing) => ({
      ...writing,
      categoryIds: categoryIdsByWriting.get(writing.id) ?? [],
    })),
  };
}

export async function action({ request }: Route.ActionArgs) {
  const session = await requireAdminSession(request);
  const form = await request.formData();
  const intent = field(form, '_intent');
  const db = appDb;

  if (intent === 'create-writing') {
    const kind = requiredKind(form);
    const editorialWeight = requiredEditorialWeight(form);
    const writingId = randomUUID();
    const position = await db
      .selectFrom('writings')
      .select(({ fn }) => fn.max<number>('editorial_position').as('max_position'))
      .executeTakeFirst();

    await db.transaction().execute(async (transaction) => {
      await transaction
        .insertInto('writings')
        .values({
          id: writingId,
          kind,
          editorial_weight: editorialWeight,
          editorial_position: (position?.max_position ?? -1) + 1,
        })
        .execute();

      await transaction
        .insertInto('writing_localizations')
        .values([
          { writing_id: writingId, locale: 'en' },
          { writing_id: writingId, locale: 'fr' },
        ])
        .execute();

      await writeAdminAuditEvent(transaction, {
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: 'writing.created',
        entityType: 'writing',
        entityId: writingId,
        metadata: {
          kind,
          editorialWeight,
        },
      });
    });

    return { ok: true, message: 'Writing created.' };
  }

  const writingId = requiredWritingId(form);
  const writing = await db
    .selectFrom('writings')
    .select('id')
    .where('id', '=', writingId)
    .executeTakeFirst();

  if (writing === undefined) {
    throw new Response('Writing not found.', { status: 404 });
  }

  if (intent === 'save-categories') {
    const rawCategoryIds = form
      .getAll('categoryId')
      .filter((value): value is string => typeof value === 'string');
    if (rawCategoryIds.some((categoryId) => !uuidPattern.test(categoryId))) {
      throw new Response('Invalid Category selection.', { status: 400 });
    }

    const categoryIds = [...new Set(rawCategoryIds)];
    if (categoryIds.length > 0) {
      const existingCategories = await db
        .selectFrom('categories')
        .select('id')
        .where('id', 'in', categoryIds)
        .execute();
      if (existingCategories.length !== categoryIds.length) {
        throw new Response('Category not found.', { status: 404 });
      }
    }

    await db.transaction().execute(async (transaction) => {
      await transaction
        .deleteFrom('writing_categories')
        .where('writing_id', '=', writingId)
        .execute();

      if (categoryIds.length > 0) {
        await transaction
          .insertInto('writing_categories')
          .values(
            categoryIds.map((categoryId, position) => ({
              writing_id: writingId,
              category_id: categoryId,
              position,
            })),
          )
          .execute();
      }

      await transaction
        .updateTable('writing_localizations')
        .set({
          editorial_state: 'draft',
          published_at: null,
          updated_at: new Date(),
        })
        .where('writing_id', '=', writingId)
        .execute();

      await writeAdminAuditEvent(transaction, {
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: 'writing.categories_updated',
        entityType: 'writing',
        entityId: writingId,
        metadata: { categoryIds },
      });
    });

    return {
      ok: true,
      message: 'Writing categories saved as draft.',
    };
  }

  if (intent === 'update-settings') {
    const kind = requiredKind(form);
    const editorialWeight = requiredEditorialWeight(form);

    await db.transaction().execute(async (transaction) => {
      await transaction
        .updateTable('writings')
        .set({
          kind,
          editorial_weight: editorialWeight,
          updated_at: new Date(),
        })
        .where('id', '=', writingId)
        .execute();

      await transaction
        .updateTable('writing_localizations')
        .set({
          editorial_state: 'draft',
          published_at: null,
          updated_at: new Date(),
        })
        .where('writing_id', '=', writingId)
        .execute();

      await writeAdminAuditEvent(transaction, {
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: 'writing.settings_updated',
        entityType: 'writing',
        entityId: writingId,
        metadata: { kind, editorialWeight },
      });
    });

    return { ok: true, message: 'Writing settings saved as draft.' };
  }

  if (intent === 'save-localization') {
    const locale = requiredLocale(form);
    const slug = nullableField(form, 'slug');
    const title = nullableField(form, 'title');
    const summary = nullableField(form, 'summary');
    const body = nullableField(form, 'body');

    await db.transaction().execute(async (transaction) => {
      await transaction
        .updateTable('writing_localizations')
        .set({
          slug,
          title,
          summary,
          body,
          editorial_state: 'draft',
          published_at: null,
          updated_at: new Date(),
        })
        .where('writing_id', '=', writingId)
        .where('locale', '=', locale)
        .execute();

      await writeAdminAuditEvent(transaction, {
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: 'writing.localization_saved',
        entityType: 'writing',
        entityId: writingId,
        locale,
        metadata: {
          hasSlug: slug !== null,
          hasTitle: title !== null,
          hasSummary: summary !== null,
          hasBody: body !== null,
        },
      });
    });

    return {
      ok: true,
      message: `${locale.toUpperCase()} Writing draft saved.`,
    };
  }

  if (intent === 'publish') {
    const locale = requiredLocale(form);
    await publishWritingLocalization(db, { writingId, locale });
    await writeAdminAuditEvent(db, {
      actorUserId: session.user.id,
      actorEmail: session.user.email,
      action: 'writing.published',
      entityType: 'writing',
      entityId: writingId,
      locale,
    });
    return {
      ok: true,
      message: `${locale.toUpperCase()} Writing published.`,
    };
  }

  if (intent === 'unpublish') {
    const locale = requiredLocale(form);
    await unpublishWritingLocalization(db, { writingId, locale });
    await writeAdminAuditEvent(db, {
      actorUserId: session.user.id,
      actorEmail: session.user.email,
      action: 'writing.unpublished',
      entityType: 'writing',
      entityId: writingId,
      locale,
    });
    return {
      ok: true,
      message: `${locale.toUpperCase()} Writing unpublished.`,
    };
  }

  return { ok: false, message: 'Unknown Writing action.' };
}

export default function AdminWritingsRoute() {
  const data = useLoaderData<typeof loader>();
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
                Writings administration
              </Heading>
              <Text tone="muted">
                One Writing entity serves Notes, Articles, and Essays. Editorial
                weight is modeled now but visual prominence remains code-owned
                and is applied by later Writings work.
              </Text>
              <Text size="sm" tone="muted">
                AKS-101 uses plain text paragraphs only. Rich-content semantics
                and the editor arrive in AKS-105/106; this surface cannot build
                arbitrary page layouts.
              </Text>
              <div className="aks-proof-actions">
                <Link href="/admin">Administration</Link>
                <Link href="/admin/writings/categories">Manage categories</Link>
                <Link href="/en/writings">Open Writings</Link>
              </div>
              {actionData?.message ? <Text>{actionData.message}</Text> : null}
            </div>
          </section>

          <section className="aks-admin-card">
            <div className="aks-proof-stack">
              <Heading level={2} size="sm">
                Create Writing
              </Heading>
              <Form method="post" className="aks-proof-stack">
                <input name="_intent" type="hidden" value="create-writing" />
                <label>
                  <span>Kind</span>
                  <select defaultValue="note" name="kind">
                    {writingKinds.map((kind) => (
                      <option key={kind} value={kind}>
                        {kind.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Editorial weight</span>
                  <select defaultValue="normal" name="editorialWeight">
                    {writingEditorialWeights.map((weight) => (
                      <option key={weight} value={weight}>
                        {weight.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </label>
                <Button type="submit">Create Writing</Button>
              </Form>
            </div>
          </section>

          {data.writings.map((writing) => (
            <section className="aks-admin-card" key={writing.id}>
              <div className="aks-proof-stack">
                <Heading level={2} size="sm">
                  {writing.title_en ?? writing.title_fr ?? 'Untitled Writing'}
                </Heading>
                <Text size="sm" tone="muted">
                  {writing.kind.toUpperCase()} ·{' '}
                  {writing.editorial_weight.toUpperCase()} · Position{' '}
                  {writing.editorial_position + 1}
                </Text>

                <Form method="post" className="aks-proof-stack">
                  <input name="_intent" type="hidden" value="update-settings" />
                  <input name="writingId" type="hidden" value={writing.id} />
                  <label>
                    <span>Kind</span>
                    <select defaultValue={writing.kind} name="kind">
                      {writingKinds.map((kind) => (
                        <option key={kind} value={kind}>
                          {kind.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Editorial weight</span>
                    <select
                      defaultValue={writing.editorial_weight}
                      name="editorialWeight"
                    >
                      {writingEditorialWeights.map((weight) => (
                        <option key={weight} value={weight}>
                          {weight.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Button emphasis="quiet" type="submit">
                    Save Writing settings
                  </Button>
                </Form>

                <Form method="post" className="aks-proof-stack">
                  <input name="_intent" type="hidden" value="save-categories" />
                  <input name="writingId" type="hidden" value={writing.id} />
                  <fieldset className="aks-admin-card">
                    <legend>Categories</legend>
                    {data.categories.length === 0 ? (
                      <Text size="sm" tone="muted">
                        No Category exists yet. Create one from the Category
                        administration surface.
                      </Text>
                    ) : (
                      <div className="aks-proof-stack">
                        {data.categories.map((category) => (
                          <label key={category.id}>
                            <input
                              defaultChecked={writing.categoryIds.includes(
                                category.id,
                              )}
                              name="categoryId"
                              type="checkbox"
                              value={category.id}
                            />{' '}
                            {category.name_en ??
                              category.name_fr ??
                              'Untitled Category'}
                          </label>
                        ))}
                      </div>
                    )}
                    <Text size="sm" tone="muted">
                      Assignment order follows the controlled Category order.
                      Saving marks both Writing localizations as draft; existing
                      public snapshots remain unchanged until republished.
                    </Text>
                    <Button emphasis="quiet" type="submit">
                      Save categories
                    </Button>
                  </fieldset>
                </Form>

                <div className="aks-proof-stack">
                  {(['en', 'fr'] as const).map((locale) => {
                    const slug =
                      locale === 'en' ? writing.slug_en : writing.slug_fr;
                    const title =
                      locale === 'en' ? writing.title_en : writing.title_fr;
                    const summary =
                      locale === 'en' ? writing.summary_en : writing.summary_fr;
                    const body =
                      locale === 'en' ? writing.body_en : writing.body_fr;
                    const editorialState =
                      locale === 'en'
                        ? writing.editorial_state_en
                        : writing.editorial_state_fr;
                    const publishedSlug =
                      locale === 'en'
                        ? writing.published_slug_en
                        : writing.published_slug_fr;

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
                            value="save-localization"
                          />
                          <input
                            name="writingId"
                            type="hidden"
                            value={writing.id}
                          />
                          <input name="locale" type="hidden" value={locale} />
                          <label>
                            <span>Slug</span>
                            <input
                              defaultValue={slug ?? ''}
                              name="slug"
                              placeholder={
                                locale === 'fr'
                                  ? 'mon-ecrit'
                                  : 'my-writing'
                              }
                            />
                          </label>
                          <label>
                            <span>Title</span>
                            <input
                              defaultValue={title ?? ''}
                              name="title"
                            />
                          </label>
                          <label>
                            <span>Summary</span>
                            <textarea
                              defaultValue={summary ?? ''}
                              name="summary"
                              rows={3}
                            />
                          </label>
                          <label>
                            <span>Body</span>
                            <textarea
                              defaultValue={body ?? ''}
                              name="body"
                              rows={8}
                            />
                          </label>
                          <Text size="sm" tone="muted">
                            Separate paragraphs with a blank line. The public
                            renderer emits controlled paragraph semantics only.
                          </Text>
                          <Button type="submit">
                            Save {locale.toUpperCase()} draft
                          </Button>
                        </Form>

                        <div className="aks-proof-actions">
                          <Form method="post">
                            <input name="_intent" type="hidden" value="publish" />
                            <input
                              name="writingId"
                              type="hidden"
                              value={writing.id}
                            />
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
                                  value="unpublish"
                                />
                                <input
                                  name="writingId"
                                  type="hidden"
                                  value={writing.id}
                                />
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
              </div>
            </section>
          ))}
        </div>
      </Container>
    </main>
  );
}
