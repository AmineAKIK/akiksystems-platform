import {
  publishTrainingLocalization,
  unpublishTrainingLocalization,
  writeAdminAuditEvent,
} from '@akiksystems/db';
import {
  trainingStates,
  type PlatformLocale,
  type TrainingState,
} from '@akiksystems/core';
import { Button, Container, Heading, Link, Text } from '@akiksystems/ui';
import { randomUUID } from 'node:crypto';
import { Form, useActionData, useLoaderData } from 'react-router';

import { requireAdminSession } from '../lib/admin.server';
import { appDb } from '../lib/db.server';

import type { Route } from './+types/admin-learning-trainings';

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
  const id = field(form, 'trainingId');
  if (!uuidPattern.test(id)) {
    throw new Response('Training not found.', { status: 404 });
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

function requiredState(form: FormData): TrainingState {
  const state = field(form, 'state');
  if (!trainingStates.includes(state as TrainingState)) {
    throw new Response('Invalid Training state.', { status: 400 });
  }
  return state as TrainingState;
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdminSession(request);

  const trainings = await appDb
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
    .leftJoin('training_publications as pub_en', (join) =>
      join
        .onRef('pub_en.training_id', '=', 'trainings.id')
        .on('pub_en.locale', '=', 'en'),
    )
    .leftJoin('training_publications as pub_fr', (join) =>
      join
        .onRef('pub_fr.training_id', '=', 'trainings.id')
        .on('pub_fr.locale', '=', 'fr'),
    )
    .select([
      'trainings.id',
      'trainings.provider',
      'trainings.state',
      'trainings.start_date',
      'trainings.end_date',
      'trainings.editorial_position',
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
    .orderBy('trainings.editorial_position')
    .orderBy('trainings.created_at')
    .execute();

  return { trainings };
}

export async function action({ request }: Route.ActionArgs) {
  const session = await requireAdminSession(request);
  const form = await request.formData();
  const intent = field(form, '_intent');

  if (intent === 'create') {
    const provider = field(form, 'provider');
    if (provider === '') {
      return { ok: false, message: 'Provider is required.' };
    }

    const state = requiredState(form);
    const startDate = nullable(field(form, 'startDate'));
    const endDate = nullable(field(form, 'endDate'));

    if (startDate !== null && endDate !== null && endDate < startDate) {
      return { ok: false, message: 'End date cannot be before start date.' };
    }

    const last = await appDb
      .selectFrom('trainings')
      .select('editorial_position')
      .orderBy('editorial_position', 'desc')
      .executeTakeFirst();

    const id = randomUUID();
    const position = (last?.editorial_position ?? -1) + 1;

    await appDb.transaction().execute(async (transaction) => {
      await transaction
        .insertInto('trainings')
        .values({
          id,
          provider,
          state,
          start_date: startDate,
          end_date: endDate,
          editorial_position: position,
        })
        .execute();

      await transaction
        .insertInto('training_localizations')
        .values([
          { training_id: id, locale: 'en' },
          { training_id: id, locale: 'fr' },
        ])
        .execute();

      await writeAdminAuditEvent(transaction, {
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: 'training.created',
        entityType: 'training',
        entityId: id,
        metadata: { provider, state, editorialPosition: position },
      });
    });

    return { ok: true, message: 'Training created.' };
  }

  const trainingId = requiredId(form);

  if (intent === 'shared') {
    const provider = field(form, 'provider');
    if (provider === '') {
      return { ok: false, message: 'Provider is required.' };
    }

    const state = requiredState(form);
    const startDate = nullable(field(form, 'startDate'));
    const endDate = nullable(field(form, 'endDate'));

    if (startDate !== null && endDate !== null && endDate < startDate) {
      return { ok: false, message: 'End date cannot be before start date.' };
    }

    await appDb.transaction().execute(async (transaction) => {
      await transaction
        .updateTable('trainings')
        .set({
          provider,
          state,
          start_date: startDate,
          end_date: endDate,
          updated_at: new Date(),
        })
        .where('id', '=', trainingId)
        .execute();

      await transaction
        .updateTable('training_localizations')
        .set({
          editorial_state: 'draft',
          published_at: null,
          updated_at: new Date(),
        })
        .where('training_id', '=', trainingId)
        .execute();

      await writeAdminAuditEvent(transaction, {
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: 'training.shared_content_updated',
        entityType: 'training',
        entityId: trainingId,
        metadata: { provider, state },
      });
    });

    return {
      ok: true,
      message:
        'Shared Training context saved. Public snapshots are unchanged until republished.',
    };
  }

  if (intent === 'localization') {
    const locale = requiredLocale(form);
    const slug = nullable(field(form, 'slug'));
    if (slug !== null && !slugPattern.test(slug)) {
      return { ok: false, message: 'Slug is invalid.' };
    }

    await appDb.transaction().execute(async (transaction) => {
      await transaction
        .updateTable('training_localizations')
        .set({
          slug,
          title: nullable(field(form, 'title')),
          summary: nullable(field(form, 'summary')),
          body: nullable(field(form, 'body')),
          editorial_state: 'draft',
          published_at: null,
          updated_at: new Date(),
        })
        .where('training_id', '=', trainingId)
        .where('locale', '=', locale)
        .execute();

      await writeAdminAuditEvent(transaction, {
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: 'training.localization_saved',
        entityType: 'training',
        entityId: trainingId,
        locale,
        metadata: { slug: slug ?? '' },
      });
    });

    return {
      ok: true,
      message: `${locale.toUpperCase()} Training draft saved.`,
    };
  }

  if (intent === 'publish') {
    const locale = requiredLocale(form);
    try {
      await publishTrainingLocalization(appDb, { trainingId, locale });
    } catch (error) {
      return {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : 'Training publication failed.',
      };
    }

    await writeAdminAuditEvent(appDb, {
      actorUserId: session.user.id,
      actorEmail: session.user.email,
      action: 'training.published',
      entityType: 'training',
      entityId: trainingId,
      locale,
    });

    return {
      ok: true,
      message: `${locale.toUpperCase()} Training published.`,
    };
  }

  if (intent === 'unpublish') {
    const locale = requiredLocale(form);
    await unpublishTrainingLocalization(appDb, { trainingId, locale });

    await writeAdminAuditEvent(appDb, {
      actorUserId: session.user.id,
      actorEmail: session.user.email,
      action: 'training.unpublished',
      entityType: 'training',
      entityId: trainingId,
      locale,
    });

    return {
      ok: true,
      message: `${locale.toUpperCase()} Training unpublished.`,
    };
  }

  if (intent === 'move') {
    const direction = field(form, 'direction');
    if (direction !== 'up' && direction !== 'down') {
      return { ok: false, message: 'Invalid move direction.' };
    }

    const ordered = await appDb
      .selectFrom('trainings')
      .select(['id', 'editorial_position'])
      .orderBy('editorial_position')
      .orderBy('created_at')
      .execute();

    const index = ordered.findIndex((row) => row.id === trainingId);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (index < 0 || targetIndex < 0 || targetIndex >= ordered.length) {
      return { ok: true, message: 'Training is already at that boundary.' };
    }

    const current = ordered[index]!;
    const target = ordered[targetIndex]!;

    await appDb.transaction().execute(async (transaction) => {
      await transaction
        .updateTable('trainings')
        .set({
          editorial_position: target.editorial_position,
          updated_at: new Date(),
        })
        .where('id', '=', current.id)
        .execute();

      await transaction
        .updateTable('trainings')
        .set({
          editorial_position: current.editorial_position,
          updated_at: new Date(),
        })
        .where('id', '=', target.id)
        .execute();

      await writeAdminAuditEvent(transaction, {
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: 'training.editorial_order_changed',
        entityType: 'training',
        entityId: trainingId,
        metadata: { direction },
      });
    });

    return { ok: true, message: 'Training order updated.' };
  }

  return null;
}

export default function AdminLearningTrainingsRoute() {
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
                Training administration
              </Heading>
              <Text tone="muted">
                Training is context. Credentials and LearningArtifacts remain
                separate connected evidence objects.
              </Text>
              <div className="aks-proof-actions">
                <Link href="/admin/learning">Learning hub</Link>
                <Link href="/admin/learning/credentials">Credentials</Link>
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
                Create Training
              </Heading>
              <label>
                <span>Provider</span>
                <input name="provider" required />
              </label>
              <label>
                <span>State</span>
                <select defaultValue="planned" name="state">
                  {trainingStates.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </label>
              <div className="aks-admin-domain-grid">
                <label>
                  <span>Start date</span>
                  <input name="startDate" type="date" />
                </label>
                <label>
                  <span>End date</span>
                  <input name="endDate" type="date" />
                </label>
              </div>
              <Button type="submit">Create Training</Button>
            </Form>
          </section>

          {data.trainings.map((training, index) => (
            <section className="aks-admin-card" key={training.id}>
              <div className="aks-proof-stack">
                <Heading level={2} size="sm">
                  {training.title_en ??
                    training.title_fr ??
                    'Untitled Training'}
                </Heading>
                <Text size="sm" tone="muted">
                  {training.id}
                </Text>

                <Form className="aks-admin-form" method="post">
                  <input name="_intent" type="hidden" value="shared" />
                  <input
                    name="trainingId"
                    type="hidden"
                    value={training.id}
                  />
                  <label>
                    <span>Provider</span>
                    <input
                      defaultValue={training.provider}
                      name="provider"
                      required
                    />
                  </label>
                  <label>
                    <span>State</span>
                    <select defaultValue={training.state} name="state">
                      {trainingStates.map((state) => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="aks-admin-domain-grid">
                    <label>
                      <span>Start date</span>
                      <input
                        defaultValue={training.start_date ?? ''}
                        name="startDate"
                        type="date"
                      />
                    </label>
                    <label>
                      <span>End date</span>
                      <input
                        defaultValue={training.end_date ?? ''}
                        name="endDate"
                        type="date"
                      />
                    </label>
                  </div>
                  <Button type="submit">Save shared context</Button>
                </Form>

                <div className="aks-proof-actions">
                  <Form method="post">
                    <input name="_intent" type="hidden" value="move" />
                    <input
                      name="trainingId"
                      type="hidden"
                      value={training.id}
                    />
                    <input name="direction" type="hidden" value="up" />
                    <Button
                      disabled={index === 0}
                      emphasis="quiet"
                      type="submit"
                    >
                      Move up
                    </Button>
                  </Form>
                  <Form method="post">
                    <input name="_intent" type="hidden" value="move" />
                    <input
                      name="trainingId"
                      type="hidden"
                      value={training.id}
                    />
                    <input name="direction" type="hidden" value="down" />
                    <Button
                      disabled={index === data.trainings.length - 1}
                      emphasis="quiet"
                      type="submit"
                    >
                      Move down
                    </Button>
                  </Form>
                </div>

                {(['en', 'fr'] as const).map((locale) => {
                  const slug =
                    locale === 'en' ? training.slug_en : training.slug_fr;
                  const title =
                    locale === 'en' ? training.title_en : training.title_fr;
                  const summary =
                    locale === 'en'
                      ? training.summary_en
                      : training.summary_fr;
                  const body =
                    locale === 'en' ? training.body_en : training.body_fr;
                  const publishedSlug =
                    locale === 'en'
                      ? training.published_slug_en
                      : training.published_slug_fr;

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
                          name="trainingId"
                          type="hidden"
                          value={training.id}
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
                          <span>Editorial context</span>
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
                            name="trainingId"
                            type="hidden"
                            value={training.id}
                          />
                          <input
                            name="locale"
                            type="hidden"
                            value={locale}
                          />
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
                                name="trainingId"
                                type="hidden"
                                value={training.id}
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
                                  ? `/fr/apprentissage/${publishedSlug}`
                                  : `/en/learning/${publishedSlug}`
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
