import type {
  PublishedWritingListItem,
  PublicSystemReference,
} from '@akiksystems/db';
import { Container, Heading, Link, Text } from '@akiksystems/ui';

import { destinationById } from '../i18n/global-destinations';
import type { Locale } from '../i18n/locales';
import { SystemReference } from './system-reference';

function writingHref(locale: Locale, slug: string): string {
  return locale === 'fr'
    ? `/fr/ecrits/${slug}`
    : `/en/writings/${slug}`;
}

function categoryHref(locale: Locale, slug: string): string {
  return locale === 'fr'
    ? `/fr/ecrits/categories/${slug}`
    : `/en/writings/categories/${slug}`;
}

function kindLabel(kind: PublishedWritingListItem['kind'], locale: Locale): string {
  if (kind === 'note') return locale === 'fr' ? 'Note' : 'Note';
  if (kind === 'article') return locale === 'fr' ? 'Article' : 'Article';
  return locale === 'fr' ? 'Essai' : 'Essay';
}

function weightLabel(
  weight: PublishedWritingListItem['editorialWeight'],
  locale: Locale,
): string {
  if (weight === 'major') return locale === 'fr' ? 'Poids majeur' : 'Major weight';
  if (weight === 'featured') {
    return locale === 'fr' ? 'Mis en avant' : 'Featured weight';
  }
  return locale === 'fr' ? 'Poids normal' : 'Normal weight';
}

export function WritingsOverview({
  locale,
  writings,
  systemReferences,
}: {
  locale: Locale;
  writings: PublishedWritingListItem[];
  systemReferences: PublicSystemReference[];
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

          <section className="aks-proof-stack" aria-labelledby="published-writings">
            <div className="aks-profile-section-heading">
              <Heading id="published-writings" level={2} size="sm">
                {locale === 'fr' ? 'Écrits publiés' : 'Published writings'}
              </Heading>
              <Text size="sm" tone="muted">
                {locale === 'fr'
                  ? 'Notes, articles et essais partagent un même modèle éditorial et des routes autonomes.'
                  : 'Notes, articles, and essays share one editorial model and autonomous routes.'}
              </Text>
            </div>

            {writings.length === 0 ? (
              <Text tone="muted">
                {locale === 'fr'
                  ? 'Aucun écrit n’est encore publié.'
                  : 'No writing is published yet.'}
              </Text>
            ) : (
              <div className="aks-proof-stack">
                {writings.map((writing) => (
                  <article className="aks-admin-card" key={writing.writingId}>
                    <div className="aks-proof-stack">
                      <Text className="aks-proof-eyebrow" size="sm" tone="muted">
                        {kindLabel(writing.kind, locale)}
                      </Text>
                      <Heading level={3} size="sm">
                        {writing.title}
                      </Heading>
                      <Text>{writing.summary}</Text>
                      <Text size="sm" tone="muted">
                        {weightLabel(writing.editorialWeight, locale)}
                      </Text>
                      <Link href={writingHref(locale, writing.slug)}>
                        {locale === 'fr' ? 'Lire' : 'Read'}
                      </Link>
                      {writing.categories.length > 0 ? (
                        <div
                          className="aks-proof-actions"
                          aria-label={
                            locale === 'fr'
                              ? 'Catégories éditoriales'
                              : 'Editorial categories'
                          }
                        >
                          {writing.categories.map((category) => (
                            <Link
                              href={categoryHref(locale, category.slug)}
                              key={category.categoryId}
                            >
                              {category.name}
                            </Link>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          {systemReferences.length > 0 ? (
            <section
              aria-labelledby="writings-system-references"
              className="aks-related-system-references"
            >
              <div className="aks-profile-section-heading">
                <Heading id="writings-system-references" level={2} size="sm">
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
