import {
  publishCredentialLocalization,
  unpublishCredentialLocalization,
  writeAdminAuditEvent,
} from '@akiksystems/db';
import {
  credentialKinds,
  type CredentialKind,
  type PlatformLocale,
} from '@akiksystems/core';
import { Button, Container, Heading, Link, Text } from '@akiksystems/ui';
import { randomUUID } from 'node:crypto';
import { Form, useActionData, useLoaderData } from 'react-router';

import { requireAdminSession } from '../lib/admin.server';
import { appDb } from '../lib/db.server';

import type { Route } from './+types/admin-learning-credentials';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

function nullable(value: string): string | null {
  return value === '' ? null : value;
}

function optionalId(form: FormData, name: string): string | null {
  const value = field(form, name);
  if (value === '') return null;
  if (!uuidPattern.test(value)) {
    throw new Response('Invalid linked resource.', { status: 400 });
  }
  return value;
}

function requiredId(form: FormData): string {
  const id = field(form, 'credentialId');
  if (!uuidPattern.test(id)) {
    throw new Response('Credential not found.', { status: 404 });
  }
  return id;
}

function requiredLocale(form: FormData): PlatformLocale {
  const locale = field(form, 'locale');
  if (locale !== 'en' && locale !== 'fr') {
    throw new Response('Unsupported locale.', { status: 400 });
  }
  return locale;
}

function requiredKind(form: FormData): CredentialKind {
  const kind = field(form, 'kind');
  if (!credentialKinds.includes(kind as CredentialKind)) {
    throw new Response('Invalid Credential kind.', { status: 400 });
  }
  return kind as CredentialKind;
}

function verificationUrl(form: FormData): string | null {
  const value = field(form, 'verificationUrl');
  if (value === '') return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Response('Verification URL must be a valid HTTP(S) URL.', {
      status: 400,
    });
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Response('Verification URL must be a valid HTTP(S) URL.', {
      status: 400,
    });
  }
  return url.toString();
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdminSession(request);

  const [credentials, trainings, assets] = await Promise.all([
    appDb
      .selectFrom('credentials')
      .leftJoin('credential_localizations as en', (join) =>
        join
          .onRef('en.credential_id', '=', 'credentials.id')
          .on('en.locale', '=', 'en'),
      )
      .leftJoin('credential_localizations as fr', (join) =>
        join
          .onRef('fr.credential_id', '=', 'credentials.id')
          .on('fr.locale', '=', 'fr'),
      )
      .leftJoin('credential_publications as pub_en', (join) =>
        join
          .onRef('pub_en.credential_id', '=', 'credentials.id')
          .on('pub_en.locale', '=', 'en'),
      )
      .leftJoin('credential_publications as pub_fr', (join) =>
        join
          .onRef('pub_fr.credential_id', '=', 'credentials.id')
          .on('pub_fr.locale', '=', 'fr'),
      )
      .select([
        'credentials.id',
        'credentials.kind',
        'credentials.issuer',
        'credentials.issued_on',
        'credentials.training_id',
        'credentials.source_asset_id',
        'credentials.verification_url',
        'credentials.editorial_position',
        'en.slug as slug_en',
        'en.title as title_en',
        'en.summary as summary_en',
        'en.body as body_en',
        'fr.slug as slug_fr',
        'fr.title as title_fr',
        'fr.summary as summary_fr',
        'fr.body as body_fr',
        'pub_en.slug as published_slug_en',
        'pub_fr.slug as published_slug_fr',
      ])
      .orderBy('credentials.editorial_position')
      .orderBy('credentials.created_at')
      .execute(),
    appDb
      .selectFrom('trainings')
      .leftJoin('training_localizations as en', (join) =>
        join
          .onRef('en.training_id', '=', 'trainings.id')
          .on('en.locale', '=', 'en'),
      )
      .leftJoin('training_localizations as fr', (join) =>
        join
          .onRef('fr.training_id', '=', 'trainings.id')
          .on('fr.locale', '=', 'fr'),
      )
      .select([
        'trainings.id',
        'trainings.provider',
        'en.title as title_en',
        'fr.title as title_fr',
      ])
      .orderBy('trainings.editorial_position')
      .execute(),
    appDb
      .selectFrom('assets')
      .select(['id', 'original_filename', 'mime_type'])
      .orderBy('created_at', 'desc')
      .execute(),
  ]);

  return { assets, credentials, trainings };
}

export async function action({ request }: Route.ActionArgs) {
  const session = await requireAdminSession(request);
  const form = await request.formData();
  const intent = field(form, '_intent');

  if (intent === 'create') {
    const issuer = field(form, 'issuer');
    if (issuer === '') return { ok: false, message: 'Issuer is required.' };

    const kind = requiredKind(form);
    const trainingId = optionalId(form, 'trainingId');
    const sourceAssetId = optionalId(form, 'sourceAssetId');
    const url = verificationUrl(form);
    const issuedOn = nullable(field(form, 'issuedOn'));

    const last = await appDb
      .selectFrom('credentials')
      .select('editorial_position')
      .orderBy('editorial_position', 'desc')
      .executeTakeFirst();

    const id = randomUUID();
    const position = (last?.editorial_position ?? -1) + 1;

    await appDb.transaction().execute(async (transaction) => {
      await transaction
        .insertInto('credentials')
        .values({
          id,
          kind,
          issuer,
          issued_on: issuedOn,
          training_id: trainingId,
          source_asset_id: sourceAssetId,
          verification_url: url,
          editorial_position: position,
        })
        .execute();

      await transaction
        .insertInto('credential_localizations')
        .values([
          { credential_id: id, locale: 'en' },
          { credential_id: id, locale: 'fr' },
        ])
        .execute();

      await writeAdminAuditEvent(transaction, {
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: 'credential.created',
        entityType: 'credential',
        entityId: id,
        metadata: {
          kind,
          issuer,
          trainingId,
          sourceAssetId,
          hasVerificationUrl: url !== null,
        },
      });
    });

    return { ok: true, message: 'Credential created.' };
  }

  const credentialId = requiredId(form);

  if (intent === 'shared') {
    const issuer = field(form, 'issuer');
    if (issuer === '') return { ok: false, message: 'Issuer is required.' };

    const kind = requiredKind(form);
    const trainingId = optionalId(form, 'trainingId');
    const sourceAssetId = optionalId(form, 'sourceAssetId');
    const url = verificationUrl(form);
    const issuedOn = nullable(field(form, 'issuedOn'));

    await appDb.transaction().execute(async (transaction) => {
      await transaction
        .updateTable('credentials')
        .set({
          kind,
          issuer,
          issued_on: issuedOn,
          training_id: trainingId,
          source_asset_id: sourceAssetId,
          verification_url: url,
          updated_at: new Date(),
        })
        .where('id', '=', credentialId)
        .execute();

      await transaction
        .updateTable('credential_localizations')
        .set({
          editorial_state: 'draft',
          published_at: null,
          updated_at: new Date(),
        })
        .where('credential_id', '=', credentialId)
        .execute();

      await writeAdminAuditEvent(transaction, {
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: 'credential.shared_content_updated',
        entityType: 'credential',
        entityId: credentialId,
        metadata: {
          kind,
          issuer,
          trainingId,
          sourceAssetId,
          hasVerificationUrl: url !== null,
        },
      });
    });

    return {
      ok: true,
      message:
        'Shared Credential data saved. Public snapshots are unchanged until republished.',
    };
  }

  if (intent === 'localization') {
    const locale = requiredLocale(form);
    const slug = nullable(field(form, 'slug'));
    if (slug !== null && !slugPattern.test(slug)) {
      return { ok: false, message: 'Slug format is invalid.' };
    }

    await appDb
      .updateTable('credential_localizations')
      .set({
        slug,
        title: nullable(field(form, 'title')),
        summary: nullable(field(form, 'summary')),
        body: nullable(field(form, 'body')),
        editorial_state: 'draft',
        published_at: null,
        updated_at: new Date(),
      })
      .where('credential_id', '=', credentialId)
      .where('locale', '=', locale)
      .execute();

    await writeAdminAuditEvent(appDb, {
      actorUserId: session.user.id,
      actorEmail: session.user.email,
      action: 'credential.localization_updated',
      entityType: 'credential',
      entityId: credentialId,
      locale,
    });

    return {
      ok: true,
      message: locale.toUpperCase() + ' Credential draft saved.',
    };
  }

  if (intent === 'publish') {
    const locale = requiredLocale(form);
    try {
      await publishCredentialLocalization(appDb, { credentialId, locale });
    } catch (error) {
      return {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : 'Credential publication failed.',
      };
    }

    await writeAdminAuditEvent(appDb, {
      actorUserId: session.user.id,
      actorEmail: session.user.email,
      action: 'credential.published',
      entityType: 'credential',
      entityId: credentialId,
      locale,
    });

    return {
      ok: true,
      message: locale.toUpperCase() + ' Credential published.',
    };
  }

  if (intent === 'unpublish') {
    const locale = requiredLocale(form);
    await unpublishCredentialLocalization(appDb, { credentialId, locale });

    await writeAdminAuditEvent(appDb, {
      actorUserId: session.user.id,
      actorEmail: session.user.email,
      action: 'credential.unpublished',
      entityType: 'credential',
      entityId: credentialId,
      locale,
    });

    return {
      ok: true,
      message: locale.toUpperCase() + ' Credential unpublished.',
    };
  }

  return null;
}

export default function AdminLearningCredentialsRoute() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <main className="aks-admin-shell">
      <Container>
        <div className="aks-proof-stack">
          <section className="aks-admin-card">
            <div className="aks-proof-stack">
              <Text className="aks-proof-eyebrow" size="sm" tone="muted">
                L5 · Learning
              </Text>
              <Heading level={1} size="md">
                Credential administration
              </Heading>
              <Text tone="muted">
                Credentials are evidence objects. They can connect to a Training,
                a source document, a verification URL, or any combination of
                those without becoming Training content.
              </Text>
              <div className="aks-proof-actions">
                <Link href="/admin/learning">Training administration</Link>
                <Link href="/admin/learning/artifacts">LearningArtifacts</Link>
                <Link href="/en/learning">Public Learning</Link>
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
              <input name="_intent" type="hidden" value="create" />
              <Heading level={2} size="sm">
                Create Credential
              </Heading>
              <label>
                <span>Kind</span>
                <select defaultValue="certification" name="kind">
                  {credentialKinds.map((kind) => (
                    <option key={kind} value={kind}>
                      {kind}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Issuer</span>
                <input name="issuer" required />
              </label>
              <label>
                <span>Issued on</span>
                <input name="issuedOn" type="date" />
              </label>
              <label>
                <span>Connected Training (optional)</span>
                <select defaultValue="" name="trainingId">
                  <option value="">No Training</option>
                  {data.trainings.map((training) => (
                    <option key={training.id} value={training.id}>
                      {training.title_en ??
                        training.title_fr ??
                        training.provider}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Source document (optional)</span>
                <select defaultValue="" name="sourceAssetId">
                  <option value="">No source document</option>
                  {data.assets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.original_filename} · {asset.mime_type}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Verification URL (optional)</span>
                <input name="verificationUrl" type="url" />
              </label>
              <Button type="submit">Create Credential</Button>
            </Form>
          </section>

          {data.credentials.map((credential) => (
            <section className="aks-admin-card" key={credential.id}>
              <div className="aks-proof-stack">
                <Heading level={2} size="sm">
                  {credential.title_en ??
                    credential.title_fr ??
                    'Untitled Credential'}
                </Heading>
                <Text size="sm" tone="muted">
                  {credential.kind} · {credential.issuer} · {credential.id}
                </Text>

                <Form className="aks-admin-form" method="post">
                  <input name="_intent" type="hidden" value="shared" />
                  <input
                    name="credentialId"
                    type="hidden"
                    value={credential.id}
                  />
                  <label>
                    <span>Kind</span>
                    <select defaultValue={credential.kind} name="kind">
                      {credentialKinds.map((kind) => (
                        <option key={kind} value={kind}>
                          {kind}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Issuer</span>
                    <input
                      defaultValue={credential.issuer}
                      name="issuer"
                      required
                    />
                  </label>
                  <label>
                    <span>Issued on</span>
                    <input
                      defaultValue={credential.issued_on ?? ''}
                      name="issuedOn"
                      type="date"
                    />
                  </label>
                  <label>
                    <span>Connected Training</span>
                    <select
                      defaultValue={credential.training_id ?? ''}
                      name="trainingId"
                    >
                      <option value="">No Training</option>
                      {data.trainings.map((training) => (
                        <option key={training.id} value={training.id}>
                          {training.title_en ??
                            training.title_fr ??
                            training.provider}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Source document</span>
                    <select
                      defaultValue={credential.source_asset_id ?? ''}
                      name="sourceAssetId"
                    >
                      <option value="">No source document</option>
                      {data.assets.map((asset) => (
                        <option key={asset.id} value={asset.id}>
                          {asset.original_filename} · {asset.mime_type}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Verification URL</span>
                    <input
                      defaultValue={credential.verification_url ?? ''}
                      name="verificationUrl"
                      type="url"
                    />
                  </label>
                  <Button type="submit">Save shared evidence data</Button>
                </Form>

                {(['en', 'fr'] as const).map((locale) => {
                  const slug =
                    locale === 'en' ? credential.slug_en : credential.slug_fr;
                  const title =
                    locale === 'en'
                      ? credential.title_en
                      : credential.title_fr;
                  const summary =
                    locale === 'en'
                      ? credential.summary_en
                      : credential.summary_fr;
                  const body =
                    locale === 'en' ? credential.body_en : credential.body_fr;
                  const publishedSlug =
                    locale === 'en'
                      ? credential.published_slug_en
                      : credential.published_slug_fr;

                  return (
                    <fieldset className="aks-admin-fieldset" key={locale}>
                      <legend>{locale.toUpperCase()}</legend>
                      <Form className="aks-admin-form" method="post">
                        <input
                          name="_intent"
                          type="hidden"
                          value="localization"
                        />
                        <input
                          name="credentialId"
                          type="hidden"
                          value={credential.id}
                        />
                        <input name="locale" type="hidden" value={locale} />
                        <label>
                          <span>Slug</span>
                          <input defaultValue={slug ?? ''} name="slug" />
                        </label>
                        <label>
                          <span>Title</span>
                          <input defaultValue={title ?? ''} name="title" />
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
                          <span>Inspection detail</span>
                          <textarea
                            defaultValue={body ?? ''}
                            name="body"
                            rows={6}
                          />
                        </label>
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
                            name="credentialId"
                            type="hidden"
                            value={credential.id}
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
                                name="credentialId"
                                type="hidden"
                                value={credential.id}
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
                              href={
                                locale === 'fr'
                                  ? '/fr/apprentissage/justificatifs/' + publishedSlug
                                  : '/en/learning/credentials/' + publishedSlug
                              }
                            >
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
