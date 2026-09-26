import {
  BrandMark,
  BrandSignature,
  Button,
  Container,
  Heading,
  Link,
  Text,
} from '@akiksystems/ui';
import { useState } from 'react';
import { useLoaderData } from 'react-router';

import { authClient } from '../lib/auth.client';
import { requireAdminSession } from '../lib/admin.server';

import type { Route } from './+types/admin';

const adminDestinations = [
  {
    index: '01',
    href: '/admin/profile',
    label: 'Professional identity',
    description: 'Profile, portrait, CV and positioning.',
  },
  {
    index: '02',
    href: '/admin/work-with-us',
    label: 'Work with us',
    description: 'Collaboration page and inquiry inbox.',
  },
  {
    index: '03',
    href: '/admin/writings',
    label: 'Writings',
    description: 'Articles, essays, notes and taxonomy.',
  },
  {
    index: '04',
    href: '/admin/systems',
    label: 'Systems',
    description: 'Products, projects and presentations.',
  },
  {
    index: '05',
    href: '/admin/learning',
    label: 'Learning',
    description: 'Training, credentials and evidence.',
  },
  {
    index: '06',
    href: '/admin/security',
    label: 'Security',
    description: '2FA, recovery and session controls.',
  },
] as const;

export async function loader({ request }: Route.LoaderArgs) {
  const session = await requireAdminSession(request);

  return {
    email: session.user.email,
    twoFactorEnabled: Boolean(session.user.twoFactorEnabled),
  };
}

export async function action({ request }: Route.ActionArgs) {
  await requireAdminSession(request);
  return null;
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
    <main className="aks-admin-dashboard">
      <header className="aks-admin-dashboard-header">
        <Container width="wide">
          <div className="aks-admin-dashboard-header-inner">
            <BrandSignature
              aria-label="AkikSystems home"
              className="aks-admin-dashboard-brand"
              href="/en"
              size="sm"
            />
            <div
              aria-label="Private administration"
              className="aks-admin-dashboard-context"
            >
              <span aria-hidden="true" className="aks-admin-dashboard-status-dot" />
              <span>Private administration</span>
            </div>
          </div>
        </Container>
      </header>

      <Container className="aks-admin-dashboard-stage" width="wide">
        <div aria-hidden="true" className="aks-admin-dashboard-watermark">
          <BrandMark />
        </div>

        <section
          aria-labelledby="admin-dashboard-title"
          className="aks-admin-dashboard-intro"
        >
          <Text className="aks-admin-dashboard-eyebrow" size="sm">
            Control plane
          </Text>
          <Heading id="admin-dashboard-title" level={1} size="lg">
            Administration
          </Heading>
          <Text className="aks-admin-dashboard-lead" tone="muted">
            Operate AkikSystems content, product and security surfaces from one
            private workspace.
          </Text>

          <dl className="aks-admin-dashboard-session">
            <div>
              <dt>Operator</dt>
              <dd>{data.email}</dd>
            </div>
            <div>
              <dt>Two-factor</dt>
              <dd>{data.twoFactorEnabled ? 'Enabled' : 'Available'}</dd>
            </div>
          </dl>

          <Button
            className="aks-admin-dashboard-signout"
            disabled={pending}
            emphasis="quiet"
            onClick={signOut}
          >
            {pending ? 'Signing out…' : 'Sign out'}
          </Button>
        </section>

        <section
          aria-labelledby="admin-workspaces-title"
          className="aks-admin-dashboard-workspaces"
        >
          <div className="aks-admin-dashboard-workspaces-heading">
            <div>
              <Text className="aks-admin-dashboard-eyebrow" size="sm">
                Administration domains
              </Text>
              <Heading id="admin-workspaces-title" level={2} size="sm">
                Workspaces
              </Heading>
            </div>
            <span className="aks-admin-dashboard-count">
              {String(adminDestinations.length).padStart(2, '0')} modules
            </span>
          </div>

          <nav
            aria-label="AkikSystems administration domains"
            className="aks-admin-dashboard-grid"
          >
            {adminDestinations.map((destination) => (
              <Link
                aria-label={destination.label}
                className="aks-admin-dashboard-module"
                href={destination.href}
                key={destination.href}
              >
                <span className="aks-admin-dashboard-module-index">
                  {destination.index}
                </span>
                <span className="aks-admin-dashboard-module-body">
                  <strong>{destination.label}</strong>
                  <span>{destination.description}</span>
                </span>
              </Link>
            ))}
          </nav>
        </section>
      </Container>

      <footer className="aks-admin-dashboard-footer">
        <Container width="wide">
          <div className="aks-admin-dashboard-footer-inner">
            <span>© {new Date().getUTCFullYear()} AkikSystems</span>
            <span>Private system · Access restricted</span>
          </div>
        </Container>
      </footer>
    </main>
  );
}
