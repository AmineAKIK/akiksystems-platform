import type { PlatformLocale } from '@akiksystems/core';
import { Heading, Text } from '@akiksystems/ui';

export interface SystemProofTransparencyData {
  role: string;
  maturity: string;
  demoNature: string;
  dataNature: string;
  limits: string;
}

export function SystemProofTransparency({
  locale,
  transparency,
}: {
  locale: PlatformLocale;
  transparency: SystemProofTransparencyData;
}) {
  const labels =
    locale === 'fr'
      ? {
          title: 'Transparence de preuve',
          role: 'Rôle',
          maturity: 'Maturité',
          demoNature: 'Nature de la démo',
          dataNature: 'Nature des données',
          limits: 'Limites',
        }
      : {
          title: 'Proof transparency',
          role: 'Role',
          maturity: 'Maturity',
          demoNature: 'Demo nature',
          dataNature: 'Data nature',
          limits: 'Limits',
        };

  const items = [
    [labels.role, transparency.role],
    [labels.maturity, transparency.maturity],
    [labels.demoNature, transparency.demoNature],
    [labels.dataNature, transparency.dataNature],
    [labels.limits, transparency.limits],
  ] as const;

  return (
    <section
      aria-labelledby="system-proof-transparency-title"
      className="aks-system-proof-transparency"
    >
      <Text className="aks-proof-eyebrow" size="sm" tone="muted">
        {locale === 'fr' ? 'Lecture honnête' : 'Honest reading'}
      </Text>
      <Heading id="system-proof-transparency-title" level={2} size="sm">
        {labels.title}
      </Heading>
      <dl className="aks-system-proof-transparency-grid">
        {items.map(([label, value]) => (
          <div className="aks-system-proof-transparency-item" key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
