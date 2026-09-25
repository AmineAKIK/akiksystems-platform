import {
  bootstrapSentinelSystemDraft,
  publishCommercialPageLocalization,
  writeAdminAuditEvent,
} from '@akiksystems/db';
import { Button, Container, Heading, Link, Text } from '@akiksystems/ui';
import { randomUUID } from 'node:crypto';
import { useState } from 'react';
import { Form, redirect, useActionData, useLoaderData } from 'react-router';

import { authClient } from '../lib/auth.client';
import { requireAdminSession } from '../lib/admin.server';
import { appDb } from '../lib/db.server';

import type { Route } from './+types/admin';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

function optionalField(form: FormData, name: string): string | null {
  const value = field(form, name);
  return value === '' ? null : value;
}

type CommercialAdminOperation = 'save' | 'publish';
type CommercialAdminLocale = 'en' | 'fr';

interface CommercialAdminCommand {
  operation: CommercialAdminOperation;
  locale: CommercialAdminLocale;
}

function parseCommercialAdminCommand(intent: string): CommercialAdminCommand | null {
  const match =
    /^(save|publish)-commercial-localization:(en|fr)$/.exec(intent);

  if (match === null) return null;

  return {
    operation: match[1] as CommercialAdminOperation,
    locale: match[2] as CommercialAdminLocale,
  };
}

async function ensureCommercialPage() {
  const existing = await appDb
    .selectFrom('work_with_us_pages')
    .select('id')
    .where('singleton_key', '=', 'public')
    .executeTakeFirst();

  if (existing !== undefined) return existing;

  const id = randomUUID();
  await appDb
    .insertInto('work_with_us_pages')
    .values({ id, singleton_key: 'public' })
    .onConflict((conflict) => conflict.column('singleton_key').doNothing())
    .execute();

  return appDb
    .selectFrom('work_with_us_pages')
    .select('id')
    .where('singleton_key', '=', 'public')
    .executeTakeFirstOrThrow();
}

function requiredSystemId(form: FormData): string {
  const systemId = field(form, 'systemId');

  if (!uuidPattern.test(systemId)) {
    throw new Response('System not found.', { status: 404 });
  }

  return systemId;
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await requireAdminSession(request);
  const db = appDb;

  const commercialPage = await ensureCommercialPage();

  const [commercialLocalizations, commercialPublications] = await Promise.all([
    db
      .selectFrom('work_with_us_localizations')
      .selectAll()
      .where('page_id', '=', commercialPage.id)
      .execute(),
    db
      .selectFrom('work_with_us_publications')
      .select(['locale', 'published_at', 'updated_at'])
      .where('page_id', '=', commercialPage.id)
      .execute(),
  ]);

  const systems = await db
    .selectFrom('systems')
    .leftJoin(
      'system_localizations as system_en',
      (join) =>
        join
          .onRef('system_en.system_id', '=', 'systems.id')
          .on('system_en.locale', '=', 'en'),
    )
    .select([
      'systems.id',
      'systems.lifecycle',
      'systems.editorial_position',
      'systems.featured',
      'system_en.slug as slug_en',
      'system_en.title as title_en',
    ])
    .orderBy('systems.editorial_position')
    .orderBy('systems.created_at')
    .orderBy('systems.id')
    .execute();

  return {
    email: session.user.email,
    twoFactorEnabled: Boolean(session.user.twoFactorEnabled),
    systems,
    commercial: {
      pageId: commercialPage.id,
      localizations: commercialLocalizations,
      publications: commercialPublications,
    },
  };
}

export async function action({ request }: Route.ActionArgs) {
  const session = await requireAdminSession(request);
  const form = await request.formData();
  const intent = field(form, '_intent');
  const db = appDb;

  const commercialCommand = parseCommercialAdminCommand(intent);

  if (commercialCommand !== null) {
    const commercialPage = await ensureCommercialPage();
    const { locale, operation } = commercialCommand;

    if (operation === 'save') {
      const values = {
        title: optionalField(form, 'title'),
        introduction: optionalField(form, 'introduction'),
        situations_title: optionalField(form, 'situationsTitle'),
        situations_body: optionalField(form, 'situationsBody'),
        capabilities_title: optionalField(form, 'capabilitiesTitle'),
        capabilities_body: optionalField(form, 'capabilitiesBody'),
        collaboration_title: optionalField(form, 'collaborationTitle'),
        collaboration_body: optionalField(form, 'collaborationBody'),
        inquiry_title: optionalField(form, 'inquiryTitle'),
        inquiry_body: optionalField(form, 'inquiryBody'),
        privacy_note: optionalField(form, 'privacyNote'),
      };

      const publicCopy = Object.values(values)
        .filter((value) => value !== null)
        .join(' ');

      if (/\bcssov\b/i.test(publicCopy)) {
        return {
          scope: 'commercial' as const,
          ok: false,
          message:
            'Public collaboration copy must describe the practice directly without naming CSSOV.',
        };
      }

      await db.transaction().execute(async (transaction) => {
        await transaction
          .insertInto('work_with_us_localizations')
          .values({
            page_id: commercialPage.id,
            locale,
            ...values,
            editorial_state: 'draft',
            published_at: null,
          })
          .onConflict((conflict) =>
            conflict.columns(['page_id', 'locale']).doUpdateSet({
              ...values,
              editorial_state: 'draft',
              published_at: null,
              updated_at: new Date(),
            }),
          )
          .execute();

        await writeAdminAuditEvent(transaction, {
          actorUserId: session.user.id,
          actorEmail: session.user.email,
          action: 'work_with_us.localization_saved',
          entityType: 'work_with_us',
          entityId: commercialPage.id,
          locale,
          metadata: {
            publicSnapshotPreserved: true,
            structureOwnedByCode: true,
          },
        });
      });

      return {
        scope: 'commercial' as const,
        ok: true,
        message: `${locale.toUpperCase()} Work with us draft saved.`,
      };
    }

    try {
      await publishCommercialPageLocalization(db, commercialPage.id, locale);
    } catch (error) {
      return {
        scope: 'commercial' as const,
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : 'Commercial content could not be published.',
      };
    }

    await writeAdminAuditEvent(db, {
      actorUserId: session.user.id,
      actorEmail: session.user.email,
      action: 'work_with_us.published',
      entityType: 'work_with_us',
      entityId: commercialPage.id,
      locale,
      metadata: {
        snapshotVersion: 1,
      },
    });

    return {
      scope: 'commercial' as const,
      ok: true,
      message: `${locale.toUpperCase()} Work with us content published.`,
    };
  }

  if (intent.includes('commercial-localization')) {
    return {
      scope: 'commercial' as const,
      ok: false,
      message: 'Invalid Work with us administration command.',
    };
  }

  if (intent === 'move-system') {
    const systemId = requiredSystemId(form);
    const direction = field(form, 'direction');

    if (direction !== 'up' && direction !== 'down') {
      return { ok: false, message: 'Invalid move direction.' };
    }

    const ordered = await db
      .selectFrom('systems')
      .select(['id', 'editorial_position'])
      .orderBy('editorial_position')
      .orderBy('created_at')
      .orderBy('id')
      .execute();

    const currentIndex = ordered.findIndex(({ id }) => id === systemId);

    if (currentIndex === -1) {
      throw new Response('System not found.', { status: 404 });
    }

    const targetIndex =
      direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const target = ordered[targetIndex];
    const current = ordered[currentIndex];

    if (target === undefined || current === undefined) {
      return { ok: true, message: 'System is already at that boundary.' };
    }

    await db.transaction().execute(async (transaction) => {
      const temporaryPosition =
        Math.max(...ordered.map((system) => system.editorial_position)) + 1;

      await transaction
        .updateTable('systems')
        .set({
          editorial_position: temporaryPosition,
          updated_at: new Date(),
        })
        .where('id', '=', current.id)
        .execute();

      await transaction
        .updateTable('systems')
        .set({
          editorial_position: current.editorial_position,
          updated_at: new Date(),
        })
        .where('id', '=', target.id)
        .execute();

      await transaction
        .updateTable('systems')
        .set({
          editorial_position: target.editorial_position,
          updated_at: new Date(),
        })
        .where('id', '=', current.id)
        .execute();

      await writeAdminAuditEvent(transaction, {
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: 'system.editorial_order_changed',
        entityType: 'system',
        entityId: current.id,
        systemId: current.id,
        metadata: {
          direction,
          previousPosition: current.editorial_position,
          editorialPosition: target.editorial_position,
        },
      });
    });

    return { ok: true, message: 'System order updated.' };
  }

  if (intent === 'toggle-featured') {
    const systemId = requiredSystemId(form);
    const system = await db
      .selectFrom('systems')
      .select(['id', 'featured'])
      .where('id', '=', systemId)
      .executeTakeFirst();

    if (system === undefined) {
      throw new Response('System not found.', { status: 404 });
    }

    const featured = !system.featured;

    await db.transaction().execute(async (transaction) => {
      await transaction
        .updateTable('systems')
        .set({ featured, updated_at: new Date() })
        .where('id', '=', systemId)
        .execute();

      await writeAdminAuditEvent(transaction, {
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: 'system.prominence_changed',
        entityType: 'system',
        entityId: systemId,
        systemId,
        metadata: {
          previousFeatured: system.featured,
          featured,
        },
      });
    });

    return {
      ok: true,
      message: featured ? 'System marked as featured.' : 'Featured state removed.',
    };
  }

  if (intent !== 'create-sentinel') {
    return null;
  }

  const result = await bootstrapSentinelSystemDraft(db);

  if (result.created) {
    await writeAdminAuditEvent(db, {
      actorUserId: session.user.id,
      actorEmail: session.user.email,
      action: 'system.created',
      entityType: 'system',
      entityId: result.systemId,
      systemId: result.systemId,
      metadata: {
        initialLocales: ['en', 'fr'],
        initialSlug: 'sentinel',
        editorialPosition: result.editorialPosition,
        featured: false,
        source: 'admin',
      },
    });
  }

  return redirect(`/admin/systems/${result.systemId}`);
}

export default function Admin() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const sentinelSystem = data.systems.find(
    (system) => system.slug_en === 'sentinel',
  );
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    await authClient.signOut();
    window.location.assign('/admin/login');
  }

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
                AkikSystems administration
              </Heading>
              <Text tone="muted">
                Authenticated as {data.email}. Domain-specific administration
                stays separate from the public experience.
              </Text>
              <Text size="sm" tone={data.twoFactorEnabled ? 'strong' : 'muted'}>
                Two-factor authentication:{' '}
                {data.twoFactorEnabled ? 'enabled' : 'available'}
              </Text>
              <div className="aks-proof-actions">
                <Link href="/admin/profile">Professional identity</Link>
                <Link href="/admin/learning">Learning</Link>
                <Link href="/admin/writings">Writings</Link>
                <Link href="/admin/security">Security settings</Link>
                <Button disabled={pending} emphasis="quiet" onClick={signOut}>
                  {pending ? 'Signing out…' : 'Sign out'}
                </Button>
              </div>
            </div>
          </section>

          <section className="aks-admin-card" id="admin-work-with-us">
            <div className="aks-proof-stack">
              <Text className="aks-proof-eyebrow" size="sm" tone="muted">
                L7 · Work with us
              </Text>
              <Heading level={2} size="sm">
                Localized page copy
              </Heading>
              <Text tone="muted">
                The public section order remains code-defined. This surface edits
                localized copy and publishes each locale independently.
              </Text>
              {actionData !== undefined &&
              actionData !== null &&
              'scope' in actionData &&
              actionData.scope === 'commercial' ? (
                <Text
                  role={actionData.ok === false ? 'alert' : 'status'}
                  size="sm"
                  tone={actionData.ok === false ? 'muted' : 'strong'}
                >
                  {actionData.message}
                </Text>
              ) : null}

              {(['en', 'fr'] as const).map((locale) => {
                const localized = data.commercial.localizations.find(
                  (candidate) => candidate.locale === locale,
                );
                const publication = data.commercial.publications.find(
                  (candidate) => candidate.locale === locale,
                );

                return (
                  <div className="aks-admin-card" key={locale}>
                    <div className="aks-proof-stack">
                      <Heading level={3} size="sm">
                        {locale === 'en' ? 'English' : 'Français'}
                      </Heading>
                      <Text size="sm" tone="muted">
                        {localized?.editorial_state ?? 'not started'} ·{' '}
                        {publication === undefined
                          ? 'No public snapshot'
                          : 'Public snapshot available'}
                      </Text>

                      <Form className="aks-admin-form" method="post">
                        <input
                          name="_intent"
                          type="hidden"
                          value={`save-commercial-localization:${locale}`}
                        />
                        <label>
                          <span>Page title</span>
                          <input
                            defaultValue={localized?.title ?? ''}
                            maxLength={140}
                            name="title"
                            required
                            type="text"
                          />
                        </label>
                        <label>
                          <span>Introduction</span>
                          <textarea
                            defaultValue={localized?.introduction ?? ''}
                            maxLength={700}
                            name="introduction"
                            required
                            rows={4}
                          />
                        </label>
                        <label>
                          <span>Open situations heading</span>
                          <input
                            defaultValue={localized?.situations_title ?? ''}
                            name="situationsTitle"
                            required
                            type="text"
                          />
                        </label>
                        <label>
                          <span>Open situations copy</span>
                          <textarea
                            defaultValue={localized?.situations_body ?? ''}
                            name="situationsBody"
                            required
                            rows={6}
                          />
                        </label>
                        <Text size="sm" tone="muted">
                          Keep this open to organizations and individuals. Do not
                          ask visitors to choose a service, budget, deadline, or
                          project type here.
                        </Text>
                        <label>
                          <span>Capabilities heading</span>
                          <input
                            defaultValue={localized?.capabilities_title ?? ''}
                            name="capabilitiesTitle"
                            required
                            type="text"
                          />
                        </label>
                        <label>
                          <span>Capabilities copy</span>
                          <textarea
                            defaultValue={localized?.capabilities_body ?? ''}
                            name="capabilitiesBody"
                            required
                            rows={8}
                          />
                        </label>
                        <Text size="sm" tone="muted">
                          Describe concrete abilities that can be combined. Do not
                          turn them into a catalogue, pricing grid, or project
                          qualification step.
                        </Text>
                        <label>
                          <span>Collaboration heading</span>
                          <input
                            defaultValue={localized?.collaboration_title ?? ''}
                            name="collaborationTitle"
                            required
                            type="text"
                          />
                        </label>
                        <label>
                          <span>Collaboration copy</span>
                          <textarea
                            defaultValue={localized?.collaboration_body ?? ''}
                            name="collaborationBody"
                            required
                            rows={7}
                          />
                        </label>
                        <Text size="sm" tone="muted">
                          Explain the understand-first, frame-after-contact
                          sequence directly. Keep the first exchange human and do
                          not name internal methodology.
                        </Text>
                        <Button type="submit">
                          Save {locale.toUpperCase()} draft
                        </Button>
                      </Form>

                      <Form method="post">
                        <input
                          name="_intent"
                          type="hidden"
                          value={`publish-commercial-localization:${locale}`}
                        />
                        <Button
                          disabled={
                            localized?.title === null ||
                            localized?.title === undefined ||
                            localized?.introduction === null ||
                            localized?.introduction === undefined
                          }
                          emphasis="quiet"
                          type="submit"
                        >
                          Publish {locale.toUpperCase()}
                        </Button>
                      </Form>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="aks-admin-card">
            <div className="aks-proof-stack">
              <Heading level={2} size="sm">
                Systems
              </Heading>
              <Text tone="muted">
                Order and prominence are shared System-level editorial controls,
                independent from EN/FR publication state.
              </Text>
              {sentinelSystem === undefined ? (
                <>
                  <Text tone="muted">
                    Sentinel has not been initialized yet. Create its stable
                    bilingual identity without affecting existing reference
                    Systems.
                  </Text>
                  <Form method="post">
                    <input name="_intent" type="hidden" value="create-sentinel" />
                    <Button type="submit">Create Sentinel</Button>
                  </Form>
                </>
              ) : null}

              {data.systems.length > 0 ? (
                <div className="aks-admin-asset-list">
                  {data.systems.map((system, index) => (
                    <article className="aks-admin-asset" key={system.id}>
                      <div className="aks-proof-stack">
                        <Text tone="strong">
                          {system.title_en ?? 'Untitled System'}
                        </Text>
                        <Text size="sm" tone="muted">
                          Position {system.editorial_position + 1} ·{' '}
                          {system.featured ? 'Featured' : 'Standard'} ·{' '}
                          {system.lifecycle}
                        </Text>
                        <div className="aks-proof-actions">
                          <Form method="post">
                            <input name="_intent" type="hidden" value="move-system" />
                            <input name="systemId" type="hidden" value={system.id} />
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
                            <input name="_intent" type="hidden" value="move-system" />
                            <input name="systemId" type="hidden" value={system.id} />
                            <input name="direction" type="hidden" value="down" />
                            <Button
                              disabled={index === data.systems.length - 1}
                              emphasis="quiet"
                              type="submit"
                            >
                              Move down
                            </Button>
                          </Form>
                          <Form method="post">
                            <input
                              name="_intent"
                              type="hidden"
                              value="toggle-featured"
                            />
                            <input name="systemId" type="hidden" value={system.id} />
                            <Button emphasis="quiet" type="submit">
                              {system.featured ? 'Remove featured' : 'Mark featured'}
                            </Button>
                          </Form>
                        </div>
                        <Text size="sm" tone="muted">
                          {system.id}
                        </Text>
                        <div className="aks-proof-actions">
                          <Link href={`/admin/systems/${system.id}`}>
                            Open System workspace
                          </Link>
                          <Link href={`/admin/systems/${system.id}/presentation/en`}>
                            EN presentation
                          </Link>
                          <Link href={`/admin/systems/${system.id}/presentation/fr`}>
                            FR presentation
                          </Link>
                          <Link href={`/admin/systems/${system.id}/assets`}>
                            Contextual media
                          </Link>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <Text tone="muted">No System has been initialized yet.</Text>
              )}
            </div>
          </section>
        </div>
      </Container>
    </main>
  );
}
