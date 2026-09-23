import {
  publishCategoryLocalization,
  unpublishCategoryLocalization,
  writeAdminAuditEvent,
} from '@akiksystems/db';
import type { PlatformLocale } from '@akiksystems/core';
import { Button, Container, Heading, Link, Text } from '@akiksystems/ui';
import { randomUUID } from 'node:crypto';
import { Form, useActionData, useLoaderData } from 'react-router';

import { requireAdminSession } from '../lib/admin.server';
import { appDb } from '../lib/db.server';

import type { Route } from './+types/admin-writing-categories';

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

function requiredCategoryId(form: FormData): string {
  const id = field(form, 'categoryId');
  if (!uuidPattern.test(id)) {
    throw new Response('Category not found.', { status: 404 });
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

function publicHref(locale: PlatformLocale, slug: string): string {
  return locale === 'fr'
    ? `/fr/ecrits/categories/${slug}`
    : `/en/writings/categories/${slug}`;
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdminSession(request);

  const categories = await appDb
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
    .leftJoin('category_publications as pub_en', (join) =>
      join
        .onRef('pub_en.category_id', '=', 'categories.id')
        .on('pub_en.locale', '=', 'en'),
    )
    .leftJoin('category_publications as pub_fr', (join) =>
      join
        .onRef('pub_fr.category_id', '=', 'categories.id')
        .on('pub_fr.locale', '=', 'fr'),
    )
    .select([
      'categories.id',
      'categories.editorial_position',
      'en.slug as slug_en',
      'en.name as name_en',
      'en.description as description_en',
      'en.editorial_state as editorial_state_en',
      'fr.slug as slug_fr',
      'fr.name as name_fr',
      'fr.description as description_fr',
      'fr.editorial_state as editorial_state_fr',
      'pub_en.slug as published_slug_en',
      'pub_fr.slug as published_slug_fr',
    ])
    .orderBy('categories.editorial_position')
    .orderBy('categories.created_at')
    .orderBy('categories.id')
    .execute();

  return { categories };
}

export async function action({ request }: Route.ActionArgs) {
  const session = await requireAdminSession(request);
  const form = await request.formData();
  const intent = field(form, '_intent');

  if (intent === 'create-category') {
    const categoryId = randomUUID();
    const position = await appDb
      .selectFrom('categories')
      .select(({ fn }) => fn.max<number>('editorial_position').as('max_position'))
      .executeTakeFirst();

    await appDb.transaction().execute(async (transaction) => {
      await transaction
        .insertInto('categories')
        .values({
          id: categoryId,
          editorial_position: (position?.max_position ?? -1) + 1,
        })
        .execute();

      await transaction
        .insertInto('category_localizations')
        .values([
          { category_id: categoryId, locale: 'en' },
          { category_id: categoryId, locale: 'fr' },
        ])
        .execute();

      await writeAdminAuditEvent(transaction, {
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: 'category.created',
        entityType: 'category',
        entityId: categoryId,
      });
    });

    return { ok: true, message: 'Category created.' };
  }

  const categoryId = requiredCategoryId(form);
  const category = await appDb
    .selectFrom('categories')
    .select('id')
    .where('id', '=', categoryId)
    .executeTakeFirst();

  if (category === undefined) {
    throw new Response('Category not found.', { status: 404 });
  }

  if (intent === 'save-category-localization') {
    const locale = requiredLocale(form);
    const slug = nullableField(form, 'slug');
    const name = nullableField(form, 'name');
    const description = nullableField(form, 'description');

    await appDb.transaction().execute(async (transaction) => {
      await transaction
        .updateTable('category_localizations')
        .set({
          slug,
          name,
          description,
          editorial_state: 'draft',
          published_at: null,
          updated_at: new Date(),
        })
        .where('category_id', '=', categoryId)
        .where('locale', '=', locale)
        .execute();

      await writeAdminAuditEvent(transaction, {
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: 'category.localization_saved',
        entityType: 'category',
        entityId: categoryId,
        locale,
        metadata: {
          hasSlug: slug !== null,
          hasName: name !== null,
          hasDescription: description !== null,
        },
      });
    });

    return {
      ok: true,
      message: `${locale.toUpperCase()} Category draft saved.`,
    };
  }

  if (intent === 'publish-category') {
    const locale = requiredLocale(form);
    await publishCategoryLocalization(appDb, { categoryId, locale });
    await writeAdminAuditEvent(appDb, {
      actorUserId: session.user.id,
      actorEmail: session.user.email,
      action: 'category.published',
      entityType: 'category',
      entityId: categoryId,
      locale,
    });
    return {
      ok: true,
      message: `${locale.toUpperCase()} Category published.`,
    };
  }

  if (intent === 'unpublish-category') {
    const locale = requiredLocale(form);
    await unpublishCategoryLocalization(appDb, { categoryId, locale });
    await writeAdminAuditEvent(appDb, {
      actorUserId: session.user.id,
      actorEmail: session.user.email,
      action: 'category.unpublished',
      entityType: 'category',
      entityId: categoryId,
      locale,
    });
    return {
      ok: true,
      message: `${locale.toUpperCase()} Category unpublished.`,
    };
  }

  return { ok: false, message: 'Unknown Category action.' };
}

export default function AdminWritingCategoriesRoute() {
  const { categories } = useLoaderData<typeof loader>();
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
                Writing categories
              </Heading>
              <Text tone="muted">
                Categories are reusable editorial taxonomy. Identity and ordering
                are shared; slug, name, description, and publication remain
                independent in EN and FR.
              </Text>
              <Text size="sm" tone="muted">
                Categories classify content only. They do not carry layout,
                styling, or page-builder controls.
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
                Create Category
              </Heading>
              <Form method="post">
                <input name="_intent" type="hidden" value="create-category" />
                <Button type="submit">Create Category</Button>
              </Form>
            </div>
          </section>

          {categories.map((category) => (
            <section className="aks-admin-card" key={category.id}>
              <div className="aks-proof-stack">
                <Heading level={2} size="sm">
                  {category.name_en ?? category.name_fr ?? 'Untitled Category'}
                </Heading>
                <Text size="sm" tone="muted">
                  Category position {category.editorial_position + 1}
                </Text>

                {(['en', 'fr'] as const).map((locale) => {
                  const slug =
                    locale === 'en' ? category.slug_en : category.slug_fr;
                  const name =
                    locale === 'en' ? category.name_en : category.name_fr;
                  const description =
                    locale === 'en'
                      ? category.description_en
                      : category.description_fr;
                  const editorialState =
                    locale === 'en'
                      ? category.editorial_state_en
                      : category.editorial_state_fr;
                  const publishedSlug =
                    locale === 'en'
                      ? category.published_slug_en
                      : category.published_slug_fr;

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
                          value="save-category-localization"
                        />
                        <input
                          name="categoryId"
                          type="hidden"
                          value={category.id}
                        />
                        <input name="locale" type="hidden" value={locale} />
                        <label>
                          <span>Slug</span>
                          <input
                            defaultValue={slug ?? ''}
                            name="slug"
                            placeholder={
                              locale === 'fr'
                                ? 'pratique-ingenierie'
                                : 'engineering-practice'
                            }
                          />
                        </label>
                        <label>
                          <span>Name</span>
                          <input defaultValue={name ?? ''} name="name" />
                        </label>
                        <label>
                          <span>Description</span>
                          <textarea
                            defaultValue={description ?? ''}
                            name="description"
                            rows={3}
                          />
                        </label>
                        <Button type="submit">
                          Save {locale.toUpperCase()} Category draft
                        </Button>
                      </Form>

                      <div className="aks-proof-actions">
                        <Form method="post">
                          <input
                            name="_intent"
                            type="hidden"
                            value="publish-category"
                          />
                          <input
                            name="categoryId"
                            type="hidden"
                            value={category.id}
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
                                value="unpublish-category"
                              />
                              <input
                                name="categoryId"
                                type="hidden"
                                value={category.id}
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
            </section>
          ))}
        </div>
      </Container>
    </main>
  );
}
