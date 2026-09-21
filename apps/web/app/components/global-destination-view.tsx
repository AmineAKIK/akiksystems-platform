import { Container, Heading, Text } from '@akiksystems/ui';

import {
  destinationById,
  type GlobalDestinationId,
} from '../i18n/global-destinations';
import type { Locale } from '../i18n/locales';

export interface GlobalDestinationViewProps {
  destinationId: GlobalDestinationId;
  locale: Locale;
}

export function GlobalDestinationView({
  destinationId,
  locale,
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
        </div>
      </Container>
    </main>
  );
}
