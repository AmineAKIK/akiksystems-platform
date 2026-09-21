import { BrandMark, Container, Heading, Text } from '@akiksystems/ui';
import { Link as RouterLink, useParams } from 'react-router';

import {
  destinationHref,
  globalDestinations,
} from '../i18n/global-destinations';
import {
  dictionaryFor,
  requireLocale,
  type Locale,
} from '../i18n/locales';

export interface HomePortalProps {
  locale: Locale;
}

export function HomePortal({ locale }: HomePortalProps) {
  const dictionary = dictionaryFor(locale);

  return (
    <main className="aks-home">
      <Container width="wide">
        <section aria-labelledby="aks-home-title" className="aks-home-portal">
          <div className="aks-home-intro">
            <Text className="aks-home-eyebrow" size="sm" tone="muted">
              {dictionary.home.eyebrow}
            </Text>

            <div className="aks-home-identity">
              <BrandMark className="aks-home-brand-mark" />
              <Heading id="aks-home-title" level={1} size="lg">
                AkikSystems
              </Heading>
            </div>

            <Text className="aks-home-tagline" size="lg" tone="strong">
              {dictionary.home.title}
            </Text>
            <Text className="aks-home-description" tone="muted">
              {dictionary.home.description}
            </Text>
          </div>

          <nav
            aria-label={dictionary.home.destinationsLabel}
            className="aks-home-orbit"
          >
            <div aria-hidden="true" className="aks-home-core">
              <BrandMark className="aks-home-core-mark" />
              <span>{dictionary.home.coreLabel}</span>
            </div>

            {globalDestinations.map((destination, index) => (
              <RouterLink
                className="aks-home-door"
                data-destination={destination.id}
                key={destination.id}
                prefetch="intent"
                to={destinationHref(destination.id, locale)}
                viewTransition
              >
                <span aria-hidden="true" className="aks-home-door-index">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="aks-home-door-copy">
                  <span className="aks-home-door-label">
                    {destination.label[locale]}
                  </span>
                  <span className="aks-home-door-description">
                    {destination.description[locale]}
                  </span>
                </span>
                <span aria-hidden="true" className="aks-home-door-arrow">
                  ↗
                </span>
              </RouterLink>
            ))}
          </nav>
        </section>
      </Container>
    </main>
  );
}

export default function Home() {
  const params = useParams();
  const locale = requireLocale(params.locale);

  return <HomePortal locale={locale} />;
}
