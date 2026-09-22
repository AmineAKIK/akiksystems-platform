import { writeAdminAuditEvent } from '@akiksystems/db';
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
  };
}

export async function action({ request }: Route.ActionArgs) {
  const session = await requireAdminSession(request);
  const form = await request.formData();
  const intent = field(form, '_intent');
  const db = appDb;

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
      await transaction
        .updateTable('systems')
        .set({
          editorial_position: target.editorial_position,
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
                <Link href="/admin/security">Security settings</Link>
                <Button disabled={pending} emphasis="quiet" onClick={signOut}>
                  {pending ? 'Signing out…' : 'Sign out'}
                </Button>
              </div>
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
