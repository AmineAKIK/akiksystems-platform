import type { PublishedWritingListItem } from '@akiksystems/db';
import { Container, Heading, Text } from '@akiksystems/ui';

import { destinationById } from '../i18n/global-destinations';
import type { Locale } from '../i18n/locales';
import { WritingsFeed } from './writings-feed';

export function WritingsOverview({
  locale,
  writings,
}: {
  locale: Locale;
  writings: PublishedWritingListItem[];
}) {
  const destination = destinationById('writings');

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

          <section
            className="aks-proof-stack"
            aria-labelledby="published-writings"
            data-unified-editorial-surface
          >
            <div className="aks-profile-section-heading">
              <Heading id="published-writings" level={2} size="sm">
                {locale === 'fr' ? 'Flux éditorial' : 'Editorial feed'}
              </Heading>
              <Text size="sm" tone="muted">
                {locale === 'fr'
                  ? 'Notes, articles et essais coexistent dans un seul flux vivant. La forme reste visible, sans créer trois blogs séparés.'
                  : 'Notes, articles, and essays coexist in one living feed. Form stays visible without creating three separate blogs.'}
              </Text>
            </div>

            <WritingsFeed
              emptyMessage={
                locale === 'fr'
                  ? 'Aucun écrit n’est encore publié.'
                  : 'No writing is published yet.'
              }
              locale={locale}
              writings={writings}
            />
          </section>

        </div>
      </Container>
    </main>
  );
}
