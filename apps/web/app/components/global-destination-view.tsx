import type { PublicSystemReference } from '@akiksystems/db';
import { Container, Heading, Text } from '@akiksystems/ui';

import {
  destinationById,
  type GlobalDestinationId,
} from '../i18n/global-destinations';
import type { Locale } from '../i18n/locales';
import { SystemReference } from './system-reference';

export interface GlobalDestinationViewProps {
  destinationId: GlobalDestinationId;
  locale: Locale;
  systemReferences?: PublicSystemReference[];
}

export function GlobalDestinationView({
  destinationId,
  locale,
  systemReferences = [],
}: GlobalDestinationViewProps) {
  const destination = destinationById(destinationId);

  return (
    <main className="aks-proof-page">
      <Container>
        <div className="aks-proof-stack">
          <Text size="sm" tone="muted">
            AkikSystems
          </Text>
          <Heading level={1} size="md">
            {destination.label[locale]}
          </Heading>
          <Text size="lg" tone="muted">
            {destination.description[locale]}
          </Text>
          {systemReferences.length > 0 ? (
            <section
              aria-labelledby={`${destinationId}-system-references`}
              className="aks-related-system-references"
            >
              <div className="aks-profile-section-heading">
                <Heading
                  id={`${destinationId}-system-references`}
                  level={2}
                  size="sm"
                >
                  {locale === 'fr' ? 'Systèmes liés' : 'Related Systems'}
                </Heading>
                <Text size="sm" tone="muted">
                  {locale === 'fr'
                    ? 'Références publiées réutilisant le même contrat de preuve.'
                    : 'Published references using the same evidence contract.'}
                </Text>
              </div>
              <div className="aks-system-reference-grid">
                {systemReferences.map((reference) => (
                  <SystemReference key={reference.id} reference={reference} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </Container>
    </main>
  );
}
