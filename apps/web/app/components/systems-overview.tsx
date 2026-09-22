import type { PublishedSystemListItem } from '@akiksystems/db';
import { Container, Heading, Text } from '@akiksystems/ui';
import { Link as RouterLink } from 'react-router';

import { destinationById } from '../i18n/global-destinations';
import type { Locale } from '../i18n/locales';

export interface SystemsOverviewProps {
  locale: Locale;
  systems: PublishedSystemListItem[];
}

const copy = {
  en: {
    eyebrow: 'Systems · AkikSystems',
    intro: 'Inspectable software systems, presented with only the context needed to understand what each one is.',
    empty: 'No Systems are published in English yet.',
    inspect: 'Inspect system',
    featured: 'Featured',
  },
  fr: {
    eyebrow: 'Systèmes · AkikSystems',
    intro: 'Des systèmes logiciels inspectables, présentés avec uniquement le contexte nécessaire pour comprendre chacun d’eux.',
    empty: 'Aucun système n’est encore publié en français.',
    inspect: 'Inspecter le système',
    featured: 'Mis en avant',
  },
} as const;

export function SystemsOverview({ locale, systems }: SystemsOverviewProps) {
  const destination = destinationById('systems');
  const labels = copy[locale];

  return (
    <main className="aks-systems-overview">
      <Container width="wide">
        <div className="aks-systems-overview-stack">
          <header className="aks-systems-overview-header">
            <Text className="aks-proof-eyebrow" size="sm" tone="muted">
              {labels.eyebrow}
            </Text>
            <Heading level={1} size="lg">
              {destination.label[locale]}
            </Heading>
            <Text className="aks-systems-overview-intro" size="lg" tone="muted">
              {labels.intro}
            </Text>
          </header>

          {systems.length === 0 ? (
            <section className="aks-systems-empty" aria-live="polite">
              <Text tone="muted">{labels.empty}</Text>
            </section>
          ) : (
            <ol className="aks-systems-list">
              {systems.map((system, index) => (
                <li className="aks-systems-item" key={system.id}>
                  <RouterLink
                    className="aks-systems-entry"
                    data-featured={system.featured ? 'true' : 'false'}
                    prefetch="intent"
                    to={`/${locale}/systems/${system.slug}`}
                    viewTransition
                  >
                    <span aria-hidden="true" className="aks-systems-index">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="aks-systems-copy">
                      <span className="aks-systems-title-row">
                        <span className="aks-systems-title">{system.title}</span>
                        {system.featured ? (
                          <span className="aks-systems-featured">{labels.featured}</span>
                        ) : null}
                      </span>
                      <span className="aks-systems-summary">{system.summary}</span>
                    </span>
                    <span className="aks-systems-inspect">
                      {labels.inspect}
                      <span aria-hidden="true"> ↗</span>
                    </span>
                  </RouterLink>
                </li>
              ))}
            </ol>
          )}
        </div>
      </Container>
    </main>
  );
}
