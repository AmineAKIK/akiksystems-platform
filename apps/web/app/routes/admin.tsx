import { Button, Container, Heading, Link, Text } from '@akiksystems/ui';
import { createDatabase } from '@akiksystems/db';
import { randomUUID } from 'node:crypto';
import { useState } from 'react';
import { Form, redirect, useLoaderData } from 'react-router';

import { authClient } from '../lib/auth.client';
import { requireAdminSession } from '../lib/admin.server';
import { authEnv } from '../lib/auth.server';

import type { Route } from './+types/admin';

export async function loader({ request }: Route.LoaderArgs) {
  const session = await requireAdminSession(request);
  const db = createDatabase(authEnv.DATABASE_URL);

  try {
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
        'system_en.title as title_en',
      ])
      .orderBy('systems.created_at')
      .execute();

    return {
      email: session.user.email,
      twoFactorEnabled: Boolean(session.user.twoFactorEnabled),
      systems,
    };
  } finally {
    await db.destroy();
  }
}

export async function action({ request }: Route.ActionArgs) {
  await requireAdminSession(request);
  const form = await request.formData();
  const intent = form.get('_intent');

  if (intent !== 'create-sentinel') {
    return null;
  }

  const db = createDatabase(authEnv.DATABASE_URL);

  try {
    const existing = await db
      .selectFrom('systems')
      .select('id')
      .orderBy('created_at')
      .executeTakeFirst();

    if (existing !== undefined) {
      return redirect(`/admin/systems/${existing.id}`);
    }

    const systemId = randomUUID();

    await db.transaction().execute(async (transaction) => {
      await transaction
        .insertInto('systems')
        .values({ id: systemId })
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
          },
          {
            system_id: systemId,
            locale: 'fr',
            slug: 'sentinel',
            title: 'Sentinel',
            summary: null,
          },
        ])
        .execute();
    });

    return redirect(`/admin/systems/${systemId}`);
  } finally {
    await db.destroy();
  }
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
                Two-factor authentication: {data.twoFactorEnabled ? 'enabled' : 'available'}
              </Text>
              <div className="aks-proof-actions">
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
              {data.systems.length === 0 ? (
                <>
                  <Text tone="muted">
                    Create Sentinel to start the L1 vertical slice with a stable
                    System identity and independent EN/FR content.
                  </Text>
                  <Form method="post">
                    <input
                      name="_intent"
                      type="hidden"
                      value="create-sentinel"
                    />
                    <Button type="submit">Create Sentinel</Button>
                  </Form>
                </>
              ) : (
                <div className="aks-admin-asset-list">
                  {data.systems.map((system) => (
                    <article className="aks-admin-asset" key={system.id}>
                      <div className="aks-proof-stack">
                        <Text tone="strong">
                          {system.title_en ?? 'Untitled System'}
                        </Text>
                        <Text size="sm" tone="muted">
                          {system.id} · {system.lifecycle}
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
