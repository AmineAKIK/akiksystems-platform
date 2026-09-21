import { Button, Container, Heading, Text } from '@akiksystems/ui';
import { useState, type FormEvent } from 'react';

import { authClient } from '../lib/auth.client';

export default function AdminTwoFactor() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError('');

    const result = await authClient.twoFactor.verifyTotp({
      code,
      trustDevice: false,
    });

    setPending(false);

    if (result.error) {
      setError('The verification code is invalid or expired.');
      return;
    }

    window.location.assign('/admin');
  }

  return (
    <main className="aks-admin-shell">
      <Container>
        <section className="aks-admin-card" aria-labelledby="admin-two-factor-title">
          <div className="aks-proof-stack">
            <Text className="aks-proof-eyebrow" size="sm" tone="muted">
              Strong authentication
            </Text>
            <Heading id="admin-two-factor-title" level={1} size="md">
              Verify authenticator code
            </Heading>
            <form className="aks-admin-form" onSubmit={submit}>
              <label>
                <span>6-digit code</span>
                <input
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  onChange={(event) => setCode(event.currentTarget.value)}
                  pattern="[0-9]{6}"
                  required
                  value={code}
                />
              </label>
              {error ? (
                <Text role="alert" size="sm">
                  {error}
                </Text>
              ) : null}
              <Button disabled={pending} type="submit">
                {pending ? 'Verifying…' : 'Verify'}
              </Button>
            </form>
          </div>
        </section>
      </Container>
    </main>
  );
}
