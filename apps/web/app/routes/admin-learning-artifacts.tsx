import {
  publishLearningArtifactLocalization,
  unpublishLearningArtifactLocalization,
  writeAdminAuditEvent,
} from '@akiksystems/db';
import { type PlatformLocale } from '@akiksystems/core';
import { Button, Container, Heading, Link, Text } from '@akiksystems/ui';
import { randomUUID } from 'node:crypto';
import { Form, useActionData, useLoaderData } from 'react-router';

import { requireAdminSession } from '../lib/admin.server';
import { appDb } from '../lib/db.server';

import type { Route } from './+types/admin-learning-artifacts';

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

function requiredId(form: FormData): string {
  const id = field(form, 'learningArtifactId');
  if (!uuidPattern.test(id)) {
    throw new Response('LearningArtifact not found.', { status: 404 });
  }
  return id;
}

function requiredTrainingId(form: FormData): string {
  const id = field(form, 'trainingId');
  if (!uuidPattern.test(id)) {
    throw new Response('A valid Training is required.', { status: 400 });
  }
  return id;
}

function optionalId(form: FormData, name: string): string | null {
  const value = field(form, name);
  if (value === '') return null;
  if (!uuidPattern.test(value)) {
    throw new Response('Invalid linked resource.', { status: 400 });
  }
  return value;
}

function requiredLocale(form: FormData): PlatformLocale {
  const locale = field(form, 'locale');
  if (locale !== 'en' && locale !== 'fr') {
    throw new Response('Unsupported locale.', { status: 400 });
  }
  return locale;
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdminSession(request);

  const [learningArtifacts, trainings, systems, assets] = await Promise.all([
    appDb
      .selectFrom('learning_artifacts')
      .leftJoin('learning_artifact_localizations as en', (join) =>
        join
          .onRef('en.learning_artifact_id', '=', 'learning_artifacts.id')
          .on('en.locale', '=', 'en'),
      )
      .leftJoin('learning_artifact_localizations as fr', (join) =>
        join
          .onRef('fr.learning_artifact_id', '=', 'learning_artifacts.id')
          .on('fr.locale', '=', 'fr'),
      )
      .leftJoin('learning_artifact_publications as pub_en', (join) =>
        join
          .onRef(
            'pub_en.learning_artifact_id',
            '=',
            'learning_artifacts.id',
          )
          .on('pub_en.locale', '=', 'en'),
      )
      .leftJoin('learning_artifact_publications as pub_fr', (join) =>
        join
          .onRef(
            'pub_fr.learning_artifact_id',
            '=',
            'learning_artifacts.id',
          )
          .on('pub_fr.locale', '=', 'fr'),
      )
      .select([
        'learning_artifacts.id',
        'learning_artifacts.training_id',
        'learning_artifacts.system_id',
        'learning_artifacts.source_asset_id',
        'learning_artifacts.editorial_position',
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
      .orderBy('learning_artifacts.editorial_position')
      .orderBy('learning_artifacts.created_at')
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
      .selectFrom('systems')
      .leftJoin('system_localizations as en', (join) =>
        join
          .onRef('en.system_id', '=', 'systems.id')
          .on('en.locale', '=', 'en'),
      )
      .leftJoin('system_localizations as fr', (join) =>
        join
          .onRef('fr.system_id', '=', 'systems.id')
          .on('fr.locale', '=', 'fr'),
      )
      .select([
        'systems.id',
        'en.title as title_en',
        'fr.title as title_fr',
      ])
      .where('systems.lifecycle', '=', 'active')
      .orderBy('systems.editorial_position')
      .execute(),
    appDb
      .selectFrom('assets')
      .select(['id', 'original_filename', 'mime_type'])
      .orderBy('created_at', 'desc')
      .execute(),
  ]);

  return { assets, learningArtifacts, systems, trainings };
}

export async function action({ request }: Route.ActionArgs) {
  const session = await requireAdminSession(request);
  const form = await request.formData();
  const intent = field(form, '_intent');

  if (intent === 'create') {
    const trainingId = requiredTrainingId(form);
    const systemId = optionalId(form, 'systemId');
    const sourceAssetId = optionalId(form, 'sourceAssetId');

    const last = await appDb
      .selectFrom('learning_artifacts')
      .select('editorial_position')
      .orderBy('editorial_position', 'desc')
      .executeTakeFirst();

    const id = randomUUID();
    const position = (last?.editorial_position ?? -1) + 1;

    await appDb.transaction().execute(async (transaction) => {
      await transaction
        .insertInto('learning_artifacts')
        .values({
          id,
          training_id: trainingId,
          system_id: systemId,
          source_asset_id: sourceAssetId,
          editorial_position: position,
        })
        .execute();

      await transaction
        .insertInto('learning_artifact_localizations')
        .values([
          { learning_artifact_id: id, locale: 'en' },
          { learning_artifact_id: id, locale: 'fr' },
        ])
        .execute();

      await writeAdminAuditEvent(transaction, {
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: 'learning_artifact.created',
        entityType: 'learning_artifact',
        entityId: id,
        metadata: {
          trainingId,
          systemId,
          sourceAssetId,
          editorialPosition: position,
        },
      });
    });

    return { ok: true, message: 'LearningArtifact created.' };
  }

  const learningArtifactId = requiredId(form);

  if (intent === 'shared') {
    const trainingId = requiredTrainingId(form);
    const systemId = optionalId(form, 'systemId');
    const sourceAssetId = optionalId(form, 'sourceAssetId');

    await appDb.transaction().execute(async (transaction) => {
      await transaction
        .updateTable('learning_artifacts')
        .set({
          training_id: trainingId,
          system_id: systemId,
          source_asset_id: sourceAssetId,
          updated_at: new Date(),
        })
        .where('id', '=', learningArtifactId)
        .execute();

      await transaction
        .updateTable('learning_artifact_localizations')
        .set({
          editorial_state: 'draft',
          published_at: null,
          updated_at: new Date(),
        })
        .where('learning_artifact_id', '=', learningArtifactId)
        .execute();

      await writeAdminAuditEvent(transaction, {
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: 'learning_artifact.shared_context_updated',
        entityType: 'learning_artifact',
        entityId: learningArtifactId,
        metadata: { trainingId, systemId, sourceAssetId },
      });
    });

    return {
      ok: true,
      message:
        'LearningArtifact relationships saved. Public snapshots are unchanged until republished.',
    };
  }

  if (intent === 'localization') {
    const locale = requiredLocale(form);
    const slug = nullable(field(form, 'slug'));
    if (slug !== null && !slugPattern.test(slug)) {
      return { ok: false, message: 'Slug format is invalid.' };
    }

    await appDb
      .updateTable('learning_artifact_localizations')
      .set({
        slug,
        title: nullable(field(form, 'title')),
        summary: nullable(field(form, 'summary')),
        body: nullable(field(form, 'body')),
        editorial_state: 'draft',
        published_at: null,
        updated_at: new Date(),
      })
      .where('learning_artifact_id', '=', learningArtifactId)
      .where('locale', '=', locale)
      .execute();

    await writeAdminAuditEvent(appDb, {
      actorUserId: session.user.id,
      actorEmail: session.user.email,
      action: 'learning_artifact.localization_updated',
      entityType: 'learning_artifact',
      entityId: learningArtifactId,
      locale,
    });

    return {
      ok: true,
      message: locale.toUpperCase() + ' LearningArtifact draft saved.',
    };
  }

  if (intent === 'publish') {
    const locale = requiredLocale(form);
    try {
      await publishLearningArtifactLocalization(appDb, {
        learningArtifactId,
        locale,
      });
    } catch (error) {
      return {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : 'LearningArtifact publication failed.',
      };
    }

    await writeAdminAuditEvent(appDb, {
      actorUserId: session.user.id,
      actorEmail: session.user.email,
      action: 'learning_artifact.published',
      entityType: 'learning_artifact',
      entityId: learningArtifactId,
      locale,
    });

    return {
      ok: true,
      message: locale.toUpperCase() + ' LearningArtifact published.',
    };
  }

  if (intent === 'unpublish') {
    const locale = requiredLocale(form);
    await unpublishLearningArtifactLocalization(appDb, {
      learningArtifactId,
      locale,
    });

    await writeAdminAuditEvent(appDb, {
      actorUserId: session.user.id,
      actorEmail: session.user.email,
      action: 'learning_artifact.unpublished',
      entityType: 'learning_artifact',
      entityId: learningArtifactId,
      locale,
    });

    return {
      ok: true,
      message: locale.toUpperCase() + ' LearningArtifact unpublished.',
    };
  }

  return null;
}

export default function AdminLearningArtifactsRoute() {
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
                LearningArtifact administration
              </Heading>
              <Text tone="muted">
                LearningArtifacts are first-class evidence. Training remains
                their required context; System and source-document links are
                optional evidence relationships.
              </Text>
              <div className="aks-proof-actions">
                <Link href="/admin/learning">Learning hub</Link>
                <Link href="/admin/learning/trainings">Trainings</Link>
                <Link href="/admin/learning/credentials">Credentials</Link>
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
                Create LearningArtifact
              </Heading>
              <label>
                <span>Training</span>
                <select name="trainingId" required>
                  <option value="">Select Training</option>
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
                <span>Connected System (optional)</span>
                <select defaultValue="" name="systemId">
                  <option value="">No System</option>
                  {data.systems.map((system) => (
                    <option key={system.id} value={system.id}>
                      {system.title_en ?? system.title_fr ?? system.id}
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
              <Button type="submit">Create LearningArtifact</Button>
            </Form>
          </section>

          {data.learningArtifacts.map((artifact) => (
            <section className="aks-admin-card" key={artifact.id}>
              <div className="aks-proof-stack">
                <Heading level={2} size="sm">
                  {artifact.title_en ??
                    artifact.title_fr ??
                    'Untitled LearningArtifact'}
                </Heading>
                <Text size="sm" tone="muted">
                  {artifact.id}
                </Text>
                <Text size="sm" tone="muted">
                  EN {artifact.published_slug_en === null ? 'Draft' : 'Published'} · FR{' '}
                  {artifact.published_slug_fr === null ? 'Draft' : 'Published'} · Training connected ·{' '}
                  {artifact.system_id === null ? 'No System' : 'System connected'} ·{' '}
                  {artifact.source_asset_id === null ? 'No source document' : 'Source attached'}
                </Text>

                <Form className="aks-admin-form" method="post">
                  <input name="_intent" type="hidden" value="shared" />
                  <input
                    name="learningArtifactId"
                    type="hidden"
                    value={artifact.id}
                  />
                  <label>
                    <span>Training</span>
                    <select
                      defaultValue={artifact.training_id}
                      name="trainingId"
                      required
                    >
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
                    <span>Connected System</span>
                    <select
                      defaultValue={artifact.system_id ?? ''}
                      name="systemId"
                    >
                      <option value="">No System</option>
                      {data.systems.map((system) => (
                        <option key={system.id} value={system.id}>
                          {system.title_en ?? system.title_fr ?? system.id}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Source document</span>
                    <select
                      defaultValue={artifact.source_asset_id ?? ''}
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
                  <Button type="submit">Save evidence relationships</Button>
                </Form>

                {(['en', 'fr'] as const).map((locale) => {
                  const slug =
                    locale === 'en' ? artifact.slug_en : artifact.slug_fr;
                  const title =
                    locale === 'en' ? artifact.title_en : artifact.title_fr;
                  const summary =
                    locale === 'en'
                      ? artifact.summary_en
                      : artifact.summary_fr;
                  const body =
                    locale === 'en' ? artifact.body_en : artifact.body_fr;
                  const publishedSlug =
                    locale === 'en'
                      ? artifact.published_slug_en
                      : artifact.published_slug_fr;

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
                          name="learningArtifactId"
                          type="hidden"
                          value={artifact.id}
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
                            rows={8}
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
                            name="learningArtifactId"
                            type="hidden"
                            value={artifact.id}
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
                                name="learningArtifactId"
                                type="hidden"
                                value={artifact.id}
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
                                  ? '/fr/apprentissage/preuves/' + publishedSlug
                                  : '/en/learning/artifacts/' + publishedSlug
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
