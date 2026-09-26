import { Button, Container, Heading, Link, Text } from '@akiksystems/ui';
import { useState } from 'react';
import { useLoaderData } from 'react-router';

import { authClient } from '../lib/auth.client';
import { requireAdminSession } from '../lib/admin.server';

import type { Route } from './+types/admin';

export async function loader({ request }: Route.LoaderArgs) {
  const session = await requireAdminSession(request);

  return {
    email: session.user.email,
    twoFactorEnabled: Boolean(session.user.twoFactorEnabled),
  };
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
              <Link href="/admin/work-with-us">Work with us</Link>
              <Link href="/admin/writings">Writings</Link>
              <Link href="/admin/systems">Systems</Link>
              <Link href="/admin/learning">Learning</Link>
              <Link href="/admin/security">Security settings</Link>
              <Button disabled={pending} emphasis="quiet" onClick={signOut}>
                {pending ? 'Signing out…' : 'Sign out'}
              </Button>
            </div>
          </div>
        </section>
      </Container>
    </main>
  );
}
