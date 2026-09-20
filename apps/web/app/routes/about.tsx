import { Container, Heading, Text } from '@akiksystems/ui';
import { Link, useParams } from 'react-router';

import { dictionaryFor, requireLocale } from '../i18n/locales';

export default function About() {
  const params = useParams();
  const locale = requireLocale(params.locale);
  const dictionary = dictionaryFor(locale);

  return (
    <main className="aks-proof-page">
      <Container>
        <div className="aks-proof-stack">
          <Text className="aks-proof-eyebrow" size="sm" tone="muted">
            {dictionary.about.eyebrow}
          </Text>
          <Heading level={1} size="md">
            {dictionary.about.title}
          </Heading>
          <Text size="lg" tone="muted">
            {dictionary.about.description}
          </Text>
          <Link className="aks-link" to={`/${locale}`}>
            {dictionary.about.homeLink}
          </Link>
        </div>
      </Container>
    </main>
  );
}
