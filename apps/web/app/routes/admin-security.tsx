import { Button, Container, Heading, Link, Text } from '@akiksystems/ui';
import { useState, type FormEvent } from 'react';
import { useLoaderData } from 'react-router';

import { authClient } from '../lib/auth.client';
import { requireAdminSession } from '../lib/admin.server';

import type { Route } from './+types/admin-security';

export async function loader({ request }: Route.LoaderArgs) {
  const session = await requireAdminSession(request);

  return {
    twoFactorEnabled: Boolean(session.user.twoFactorEnabled),
  };
}

interface Enrollment {
  totpURI: string;
  backupCodes: string[];
}

export default function AdminSecurity() {
  const data = useLoaderData<typeof loader>();
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function enableTwoFactor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError('');

    const result = await authClient.twoFactor.enable({
      password,
      method: 'totp',
      issuer: 'AkikSystems',
    });

    setPending(false);

    if (result.error || result.data?.method !== 'totp') {
      setError('Unable to begin two-factor enrollment.');
      return;
    }

    setEnrollment({
      totpURI: result.data.totpURI,
      backupCodes: result.data.backupCodes,
    });
    setPassword('');
  }

  async function verifyEnrollment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError('');

    const result = await authClient.twoFactor.verifyTotp({
      code,
      trustDevice: false,
    });

    setPending(false);

    if (result.error) {
      setError('The enrollment code is invalid or expired.');
      return;
    }

    window.location.reload();
  }

  return (
    <main className="aks-admin-shell">
      <Container>
        <section className="aks-admin-card">
          <div className="aks-proof-stack">
            <Text className="aks-proof-eyebrow" size="sm" tone="muted">
              Administration security
            </Text>
            <Heading level={1} size="md">
              Strong authentication
            </Heading>

            {data.twoFactorEnabled ? (
              <Text tone="strong">TOTP two-factor authentication is enabled.</Text>
            ) : enrollment === null ? (
              <>
                <Text tone="muted">
                  Enroll an authenticator app. Your password is required before a TOTP secret is
                  issued.
                </Text>
                <form className="aks-admin-form" onSubmit={enableTwoFactor}>
                  <label>
                    <span>Current password</span>
                    <input
                      autoComplete="current-password"
                      minLength={14}
                      onChange={(event) => setPassword(event.currentTarget.value)}
                      required
                      type="password"
                      value={password}
                    />
                  </label>
                  <Button disabled={pending} type="submit">
                    {pending ? 'Preparing…' : 'Enable TOTP'}
                  </Button>
                </form>
              </>
            ) : (
              <>
                <Text tone="muted">
                  Add this TOTP URI to your authenticator, store the backup codes safely, then
                  verify one code to activate 2FA.
                </Text>
                <code className="aks-admin-secret">{enrollment.totpURI}</code>
                <ul className="aks-admin-backup-codes">
                  {enrollment.backupCodes.map((backupCode) => (
                    <li key={backupCode}>
                      <code>{backupCode}</code>
                    </li>
                  ))}
                </ul>
                <form className="aks-admin-form" onSubmit={verifyEnrollment}>
                  <label>
                    <span>Verification code</span>
                    <input
                      autoComplete="one-time-code"
                      inputMode="numeric"
                      onChange={(event) => setCode(event.currentTarget.value)}
                      pattern="[0-9]{6}"
                      required
                      value={code}
                    />
                  </label>
                  <Button disabled={pending} type="submit">
                    {pending ? 'Verifying…' : 'Verify and activate'}
                  </Button>
                </form>
              </>
            )}

            {error ? (
              <Text role="alert" size="sm">
                {error}
              </Text>
            ) : null}

            <Link href="/admin">Back to administration</Link>
          </div>
        </section>
      </Container>
    </main>
  );
}
