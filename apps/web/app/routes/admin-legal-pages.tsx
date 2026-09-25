import {
  isLegalPageKey,
  legalPageKeys,
  parseLegalPageDraftDocument,
  publishLegalPageLocalization,
  unpublishLegalPageLocalization,
  writeAdminAuditEvent,
} from '@akiksystems/db';
import type { PlatformLocale } from '@akiksystems/core';
import { Button, Container, Heading, Link, Text } from '@akiksystems/ui';
import { Form, useActionData, useLoaderData } from 'react-router';

import { WritingBodyEditor } from '../components/writing-body-editor';
import {
  legalPageDefinition,
  legalPageHref,
} from '../i18n/legal-pages';
import { requireAdminSession } from '../lib/admin.server';
import { appDb } from '../lib/db.server';
import {
  parseWritingEditorDocumentJson,
  writingEditorDocumentForDraft,
} from '../lib/writing-editor';

import type { Route } from './+types/admin-legal-pages';

function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

function requiredLocale(form: FormData): PlatformLocale {
  const locale = field(form, 'locale');
  if (locale !== 'en' && locale !== 'fr') {
    throw new Response('Invalid locale.', { status: 400 });
  }
  return locale;
}

function requiredPageKey(form: FormData) {
  const pageKey = field(form, 'pageKey');
  if (!isLegalPageKey(pageKey)) {
    throw new Response('Legal page not found.', { status: 404 });
  }
  return pageKey;
}

function requiredEditorDocument(form: FormData) {
  const value = form.get('editorDocument');
  if (typeof value !== 'string') {
    throw new Response('Legal page editor document is required.', {
      status: 400,
    });
  }

  const writingDocument = parseWritingEditorDocumentJson(value);
  const document =
    writingDocument === null
      ? null
      : parseLegalPageDraftDocument(writingDocument);

  if (document === null) {
    throw new Response(
      'Legal pages support paragraphs, headings, lists, quotations and callouts only.',
      { status: 400 },
    );
  }

  return document;
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdminSession(request);

  const [pages, localizations, publications] = await Promise.all([
    appDb.selectFrom('legal_pages').select(['id', 'page_key']).execute(),
    appDb
      .selectFrom('legal_page_localizations')
      .select([
        'page_id',
        'locale',
        'title',
        'editor_document',
        'editorial_state',
        'published_at',
      ])
      .execute(),
    appDb
      .selectFrom('legal_page_publications')
      .select(['page_id', 'locale', 'published_at', 'updated_at'])
      .execute(),
  ]);

  return {
    pages: legalPageKeys.map((pageKey) => {
      const page = pages.find((candidate) => candidate.page_key === pageKey);
      if (page === undefined) {
        throw new Error(`Missing structural legal page: ${pageKey}`);
      }

      return {
        id: page.id,
        pageKey,
        localizations: localizations.filter(
          (localization) => localization.page_id === page.id,
        ),
        publications: publications.filter(
          (publication) => publication.page_id === page.id,
        ),
      };
    }),
  };
}

export async function action({ request }: Route.ActionArgs) {
  const session = await requireAdminSession(request);
  const form = await request.formData();
  const intent = field(form, '_intent');
  const pageKey = requiredPageKey(form);
  const locale = requiredLocale(form);

  const page = await appDb
    .selectFrom('legal_pages')
    .select('id')
    .where('page_key', '=', pageKey)
    .executeTakeFirst();

  if (page === undefined) {
    throw new Response('Legal page not found.', { status: 404 });
  }

  if (intent === 'save-localization') {
    const title = field(form, 'title');
    if (title.length > 180) {
      return {
        ok: false,
        message: 'Legal page title must be 180 characters or fewer.',
      };
    }

    const document = requiredEditorDocument(form);

    await appDb.transaction().execute(async (transaction) => {
      await transaction
        .updateTable('legal_page_localizations')
        .set({
          title: title === '' ? null : title,
          editor_document: document as unknown as Record<string, unknown>,
          editorial_state: 'draft',
          published_at: null,
          updated_at: new Date(),
        })
        .where('page_id', '=', page.id)
        .where('locale', '=', locale)
        .execute();

      await writeAdminAuditEvent(transaction, {
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: 'legal_page.localization_saved',
        entityType: 'legal_page',
        entityId: page.id,
        locale,
        metadata: {
          pageKey,
          publicSnapshotPreserved: true,
          structureOwnedByCode: true,
        },
      });
    });

    return {
      ok: true,
      message: `${locale.toUpperCase()} ${pageKey} draft saved.`,
    };
  }

  if (intent === 'publish') {
    try {
      await publishLegalPageLocalization(appDb, { pageKey, locale });
    } catch (error) {
      return {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : 'Legal page could not be published.',
      };
    }

    await writeAdminAuditEvent(appDb, {
      actorUserId: session.user.id,
      actorEmail: session.user.email,
      action: 'legal_page.published',
      entityType: 'legal_page',
      entityId: page.id,
      locale,
      metadata: {
        pageKey,
        snapshotVersion: 1,
      },
    });

    return {
      ok: true,
      message: `${locale.toUpperCase()} ${pageKey} published.`,
    };
  }

  if (intent === 'unpublish') {
    await unpublishLegalPageLocalization(appDb, { pageKey, locale });

    await writeAdminAuditEvent(appDb, {
      actorUserId: session.user.id,
      actorEmail: session.user.email,
      action: 'legal_page.unpublished',
      entityType: 'legal_page',
      entityId: page.id,
      locale,
      metadata: { pageKey },
    });

    return {
      ok: true,
      message: `${locale.toUpperCase()} ${pageKey} unpublished.`,
    };
  }

  throw new Response('Unsupported legal-page operation.', { status: 400 });
}

export default function AdminLegalPages() {
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
                Legal, privacy & cookies
              </Heading>
              <Text tone="muted">
                Routes and page identities are code-defined. Localized titles
                and bodies remain administrator-owned drafts until each locale
                is explicitly published.
              </Text>
              <div className="aks-proof-actions">
                <Link href="/admin">Back to administration</Link>
              </div>
              {actionData?.message ? (
                <Text
                  role="status"
                  tone={actionData.ok ? 'strong' : 'muted'}
                >
                  {actionData.message}
                </Text>
              ) : null}
            </div>
          </section>

          {data.pages.map((page) => {
            const definition = legalPageDefinition(page.pageKey);

            return (
              <section
                className="aks-admin-card"
                data-legal-page-key={page.pageKey}
                key={page.pageKey}
              >
                <div className="aks-proof-stack">
                  <Text className="aks-proof-eyebrow" size="sm" tone="muted">
                    Managed public page
                  </Text>
                  <Heading level={2} size="sm">
                    {definition.label.en} / {definition.label.fr}
                  </Heading>

                  {(['en', 'fr'] as const).map((locale) => {
                    const localization = page.localizations.find(
                      (candidate) => candidate.locale === locale,
                    );
                    const publication = page.publications.find(
                      (candidate) => candidate.locale === locale,
                    );
                    const document = writingEditorDocumentForDraft(
                      localization?.editor_document,
                      null,
                    );

                    return (
                      <fieldset
                        className="aks-admin-card"
                        data-legal-page-locale={locale}
                        key={locale}
                      >
                        <legend>
                          {locale === 'en' ? 'English' : 'Français'}
                        </legend>
                        <div className="aks-proof-stack">
                          <Text size="sm" tone="muted">
                            {localization?.editorial_state ?? 'draft'} ·{' '}
                            {publication === undefined
                              ? 'No public snapshot'
                              : 'Public snapshot available'}
                          </Text>

                          <Form className="aks-admin-form" method="post">
                            <input
                              name="_intent"
                              type="hidden"
                              value="save-localization"
                            />
                            <input
                              name="pageKey"
                              type="hidden"
                              value={page.pageKey}
                            />
                            <input
                              name="locale"
                              type="hidden"
                              value={locale}
                            />
                            <label>
                              <span>Page title</span>
                              <input
                                defaultValue={localization?.title ?? ''}
                                maxLength={180}
                                name="title"
                                type="text"
                              />
                            </label>
                            <WritingBodyEditor
                              allowCode={false}
                              allowMedia={false}
                              assets={[]}
                              initialDocument={document}
                              label={
                                locale === 'fr'
                                  ? 'Corps de la page'
                                  : 'Page body'
                              }
                              locale={locale}
                            />
                            <Button type="submit">
                              Save {locale.toUpperCase()} draft
                            </Button>
                          </Form>

                          <div className="aks-proof-actions">
                            <Form method="post">
                              <input
                                name="_intent"
                                type="hidden"
                                value="publish"
                              />
                              <input
                                name="pageKey"
                                type="hidden"
                                value={page.pageKey}
                              />
                              <input
                                name="locale"
                                type="hidden"
                                value={locale}
                              />
                              <Button emphasis="quiet" type="submit">
                                {publication === undefined
                                  ? 'Publish'
                                  : 'Publish update'}{' '}
                                {locale.toUpperCase()}
                              </Button>
                            </Form>

                            {publication !== undefined ? (
                              <>
                                <Form method="post">
                                  <input
                                    name="_intent"
                                    type="hidden"
                                    value="unpublish"
                                  />
                                  <input
                                    name="pageKey"
                                    type="hidden"
                                    value={page.pageKey}
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
                                <Link
                                  href={legalPageHref(page.pageKey, locale)}
                                >
                                  Open public
                                </Link>
                              </>
                            ) : null}
                          </div>
                        </div>
                      </fieldset>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </Container>
    </main>
  );
}
