import { BrandSignature, Button, Container, Heading, Text } from '@akiksystems/ui';
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
    <main className="aks-admin-shell">
      <Container>
        <section className="aks-admin-card" aria-labelledby="admin-login-title">
          <div className="aks-proof-stack">
            <BrandSignature
              aria-label="AkikSystems home"
              href="/en"
              size="sm"
            />
            <Text className="aks-proof-eyebrow" size="sm" tone="muted">
              Private administration
            </Text>
            <Heading id="admin-login-title" level={1} size="md">
              Administrator sign in
            </Heading>
            <Text tone="muted">
              Access is limited to the single configured AkikSystems administrator.
            </Text>
            <form className="aks-admin-form" onSubmit={submit}>
              <label>
                <span>Email</span>
                <input
                  autoComplete="username"
                  inputMode="email"
                  onChange={(event) => setEmail(event.currentTarget.value)}
                  required
                  type="email"
                  value={email}
                />
              </label>
              <label>
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
                <Text role="alert" size="sm">
                  {error}
                </Text>
              ) : null}
              <Button disabled={pending} type="submit">
                {pending ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>
          </div>
        </section>
      </Container>
    </main>
  );
}
