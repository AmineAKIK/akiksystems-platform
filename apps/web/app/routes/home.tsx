import { Button, Container, Heading, Link as UiLink, Text } from '@akiksystems/ui';
import { Link, useParams } from 'react-router';

import { dictionaryFor, requireLocale } from '../i18n/locales';

export default function Home() {
  const params = useParams();
  const locale = requireLocale(params.locale);
  const dictionary = dictionaryFor(locale);
  const alternateLocale = locale === 'en' ? 'fr' : 'en';

  return (
    <main className="aks-proof-page">
      <Container>
        <section className="aks-proof-panel">
          <div className="aks-proof-stack">
            <Text className="aks-proof-eyebrow" size="sm" tone="muted">
              {dictionary.home.eyebrow}
            </Text>
            <Heading level={1} size="lg">
              {dictionary.home.title}
            </Heading>
            <Text size="lg" tone="muted">
              {dictionary.home.description}
            </Text>
            <div className="aks-proof-actions">
              <Link className="aks-link" to={`/${locale}/about`}>
                {dictionary.home.aboutLink}
              </Link>
              <UiLink href={`/${alternateLocale}`}>
                {alternateLocale === 'fr' ? 'Français' : 'English'}
              </UiLink>
              <Button
                aria-label={locale === 'fr' ? 'Bouton de fondation UI' : 'UI foundation button'}
                emphasis="quiet"
              >
                {locale === 'fr' ? 'Fondation UI' : 'UI foundation'}
              </Button>
            </div>
          </div>
        </section>
      </Container>
    </main>
  );
}
