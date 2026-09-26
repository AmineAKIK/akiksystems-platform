import {
  BrandMark,
  BrandSignature,
  Button,
  Container,
  Heading,
  Text,
} from '@akiksystems/ui';
import { useState, type FormEvent } from 'react';
import { redirect } from 'react-router';

import { authClient } from '../lib/auth.client';
import { getAdminSession } from '../lib/admin.server';

import type { Route } from './+types/admin-login';

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getAdminSession(request);

  if (session !== null) {
    throw redirect('/admin');
  }

  return null;
}

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError('');

    const result = await authClient.signIn.email({
      email,
      password,
    });

    setPending(false);

    if (result.error) {
      setError('Authentication failed.');
      return;
    }

    if (result.data && 'twoFactorRedirect' in result.data && result.data.twoFactorRedirect) {
      return;
    }

    window.location.assign('/admin');
  }

  return (
    <main className="aks-admin-login-shell">
      <header className="aks-admin-login-header">
        <Container width="wide">
          <div className="aks-admin-login-header-inner">
            <BrandSignature
              aria-label="AkikSystems home"
              className="aks-admin-login-brand"
              href="/en"
              size="sm"
            />
            <div
              aria-label="Private administration"
              className="aks-admin-login-context"
            >
              <span aria-hidden="true" className="aks-admin-login-status-dot" />
              <span>Private administration</span>
            </div>
          </div>
        </Container>
      </header>

      <Container className="aks-admin-login-stage" width="wide">
        <div aria-hidden="true" className="aks-admin-login-watermark">
          <BrandMark />
        </div>

        <section
          aria-labelledby="admin-login-title"
          className="aks-admin-login-card"
        >
          <div className="aks-admin-login-card-heading">
            <Text className="aks-admin-login-eyebrow" size="sm">
              Restricted workspace
            </Text>
            <Heading id="admin-login-title" level={1} size="md">
              Administrator sign in
            </Heading>
            <Text className="aks-admin-login-intro" tone="muted">
              Access is limited to the single configured AkikSystems administrator.
            </Text>
          </div>

          <form className="aks-admin-login-form" onSubmit={submit}>
            <label className="aks-admin-login-field">
              <span>Email</span>
              <input
                autoCapitalize="none"
                autoComplete="username"
                inputMode="email"
                onChange={(event) => setEmail(event.currentTarget.value)}
                required
                spellCheck={false}
                type="email"
                value={email}
              />
            </label>

            <label className="aks-admin-login-field">
              <span>Password</span>
              <input
                autoComplete="current-password"
                minLength={14}
                onChange={(event) => setPassword(event.currentTarget.value)}
                required
                type="password"
                value={password}
              />
            </label>

            {error ? (
              <Text className="aks-admin-login-error" role="alert" size="sm">
                {error}
              </Text>
            ) : null}

            <Button
              className="aks-admin-login-submit"
              disabled={pending}
              type="submit"
            >
              {pending ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <div aria-hidden="true" className="aks-admin-login-card-meta">
            <span>AKS / ADMIN</span>
            <span>Single-user access</span>
          </div>
        </section>
      </Container>

      <footer className="aks-admin-login-footer">
        <Container width="wide">
          <div className="aks-admin-login-footer-inner">
            <span>© {new Date().getUTCFullYear()} AkikSystems</span>
            <span>Private system · Access restricted</span>
          </div>
        </Container>
      </footer>
    </main>
  );
}
