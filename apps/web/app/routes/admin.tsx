import { publishCommercialPageLocalization, writeAdminAuditEvent } from '@akiksystems/db';
import { Button, Container, Heading, Link, Text } from '@akiksystems/ui';
import { randomUUID } from 'node:crypto';
import { useState } from 'react';
import { Form, redirect, useLoaderData } from 'react-router';

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

function requiredCommercialLocale(form: FormData): 'en' | 'fr' {
  const locale = field(form, 'locale');
  if (locale !== 'en' && locale !== 'fr') {
    throw new Response('Invalid commercial-page locale.', { status: 400 });
  }
  return locale;
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

  if (
    intent === 'save-commercial-localization' ||
    intent === 'publish-commercial-localization'
  ) {
    const commercialPage = await ensureCommercialPage();
    const locale = requiredCommercialLocale(form);

    if (intent === 'save-commercial-localization') {
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
        ok: true,
        message: `${locale.toUpperCase()} Work with us draft saved.`,
      };
    }

    try {
      await publishCommercialPageLocalization(db, commercialPage.id, locale);
    } catch (error) {
      return {
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
      ok: true,
      message: `${locale.toUpperCase()} Work with us content published.`,
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

  const existing = await db
    .selectFrom('systems')
    .select('id')
    .orderBy('editorial_position')
    .orderBy('created_at')
    .executeTakeFirst();

  if (existing !== undefined) {
    return redirect(`/admin/systems/${existing.id}`);
  }

  const systemId = randomUUID();

  await db.transaction().execute(async (transaction) => {
    await transaction
      .insertInto('systems')
      .values({ id: systemId, editorial_position: 0 })
      .execute();

    await transaction
      .insertInto('system_localizations')
      .values([
        {
          system_id: systemId,
          locale: 'en',
          slug: 'sentinel',
          title: 'Sentinel',
          summary: null,
          proof_role: 'Industrial-context software system',
          proof_maturity: 'Inspectable implementation',
          proof_demo_nature: 'No separate public demo',
          proof_data_nature: 'Real-world context; no customer data exposed',
          proof_limits: 'Origin context alone is not evidence of current deployment or publicly exposed operational data.',
        },
        {
          system_id: systemId,
          locale: 'fr',
          slug: 'sentinel',
          title: 'Sentinel',
          summary: null,
          proof_role: 'Système logiciel issu d un contexte industriel',
          proof_maturity: 'Implémentation inspectable',
          proof_demo_nature: 'Aucune démo publique séparée',
          proof_data_nature: 'Contexte réel ; aucune donnée client exposée',
          proof_limits: 'Le contexte d origine ne constitue pas à lui seul une preuve de déploiement actuel ou de données opérationnelles publiques.',
        },
      ])
      .execute();

    await writeAdminAuditEvent(transaction, {
      actorUserId: session.user.id,
      actorEmail: session.user.email,
      action: 'system.created',
      entityType: 'system',
      entityId: systemId,
      systemId,
      metadata: {
        initialLocales: ['en', 'fr'],
        initialSlug: 'sentinel',
        editorialPosition: 0,
        featured: false,
      },
    });
  });

  return redirect(`/admin/systems/${systemId}`);
}

export default function Admin() {
  const data = useLoaderData<typeof loader>();
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
                          value="save-commercial-localization"
                        />
                        <input name="locale" type="hidden" value={locale} />
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
                        <Button type="submit">
                          Save {locale.toUpperCase()} draft
                        </Button>
                      </Form>

                      <Form method="post">
                        <input
                          name="_intent"
                          type="hidden"
                          value="publish-commercial-localization"
                        />
                        <input name="locale" type="hidden" value={locale} />
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
              {data.systems.length === 0 ? (
                <>
                  <Text tone="muted">
                    Create Sentinel to start the System library with a stable
                    identity and independent EN/FR content.
                  </Text>
                  <Form method="post">
                    <input name="_intent" type="hidden" value="create-sentinel" />
                    <Button type="submit">Create Sentinel</Button>
                  </Form>
                </>
              ) : (
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
              )}
            </div>
          </section>
        </div>
      </Container>
    </main>
  );
}
