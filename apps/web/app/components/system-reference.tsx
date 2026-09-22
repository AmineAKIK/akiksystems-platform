import type { PublicSystemReference } from '@akiksystems/db';
import { Heading, Link, Text } from '@akiksystems/ui';

export function SystemReference({
  reference,
  variant = 'card',
  label,
}: {
  reference: PublicSystemReference;
  variant?: 'card' | 'inline';
  label?: string;
}) {
  if (variant === 'inline') {
    return (
      <span className="aks-system-reference-inline">
        {label !== undefined ? (
          <Text className="aks-system-reference-inline-label" size="sm" tone="muted">
            {label}
          </Text>
        ) : null}
        <Link href={reference.href}>{reference.title}</Link>
        <Text size="sm" tone="muted">
          {reference.proofTransparency.maturity}
        </Text>
      </span>
    );
  }

  return (
    <article className="aks-system-reference" data-system-id={reference.id}>
      {label !== undefined ? (
        <Text className="aks-proof-eyebrow" size="sm" tone="muted">
          {label}
        </Text>
      ) : null}
      <Heading level={3} size="sm">
        {reference.title}
      </Heading>
      <Text tone="muted">{reference.summary}</Text>
      <dl className="aks-system-reference-meta">
        <div>
          <dt>{reference.locale === 'fr' ? 'Rôle' : 'Role'}</dt>
          <dd>{reference.proofTransparency.role}</dd>
        </div>
        <div>
          <dt>{reference.locale === 'fr' ? 'Maturité' : 'Maturity'}</dt>
          <dd>{reference.proofTransparency.maturity}</dd>
        </div>
      </dl>
      <Link href={reference.href}>
        {reference.locale === 'fr' ? 'Inspecter le système' : 'Inspect System'}
      </Link>
    </article>
  );
}
