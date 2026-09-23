import { getPublishedWriting } from '@akiksystems/db';
import { Container, Heading, Link, Text } from '@akiksystems/ui';
import { data, useLoaderData } from 'react-router';

import { requireLocale } from '../i18n/locales';
import { appDb } from '../lib/db.server';
import { publicNotFound } from '../lib/public-seo';

import type { Route } from './+types/writing-detail';

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function requiredSlug(value: string | undefined): string {
  if (value === undefined || !slugPattern.test(value)) {
    throw publicNotFound('Writing not found.');
  }
  return value;
}

function writingHref(locale: 'en' | 'fr', slug: string): string {
  return locale === 'fr'
    ? `/fr/ecrits/${slug}`
    : `/en/writings/${slug}`;
}

function categoryHref(locale: 'en' | 'fr', slug: string): string {
  return locale === 'fr'
    ? `/fr/ecrits/categories/${slug}`
    : `/en/writings/categories/${slug}`;
}

function tagHref(locale: 'en' | 'fr', slug: string): string {
  return locale === 'fr'
    ? `/fr/ecrits/tags/${slug}`
    : `/en/writings/tags/${slug}`;
}

function kindLabel(kind: 'note' | 'article' | 'essay', locale: 'en' | 'fr') {
  if (kind === 'note') return 'Note';
  if (kind === 'article') return 'Article';
  return locale === 'fr' ? 'Essai' : 'Essay';
}

export async function loader({ params }: Route.LoaderArgs) {
  const locale = requireLocale(params.locale);
  const slug = requiredSlug(params.slug);
  const writing = await getPublishedWriting(appDb, { locale, slug });

  if (writing === null) {
    throw publicNotFound('Writing not found.');
  }

  return data(
    {
      writing: {
        ...writing,
        publishedAt: writing.publishedAt.toISOString(),
      },
      localContext: {
        title: writing.title,
        alternateHref:
          writing.alternate === null
            ? null
            : writingHref(writing.alternate.locale, writing.alternate.slug),
      },
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      },
    },
  );
}

export function headers({
  loaderHeaders,
  errorHeaders,
}: Route.HeadersArgs): Headers {
  return errorHeaders ?? loaderHeaders;
}

export function meta({ loaderData }: Route.MetaArgs) {
  return [
    {
      title:
        loaderData === undefined
          ? 'Writings · AkikSystems'
          : `${loaderData.writing.title} · AkikSystems`,
    },
  ];
}

export default function WritingDetailRoute() {
  const { writing } = useLoaderData<typeof loader>();
  const overviewHref = writing.locale === 'fr' ? '/fr/ecrits' : '/en/writings';
  const paragraphs =
    writing.body
      ?.split(/\n\s*\n/)
      .map((part) => part.trim())
      .filter(Boolean) ?? [];

  return (
    <main className="aks-proof-page">
      <Container>
        <article className="aks-proof-stack">
          <header className="aks-proof-hero">
            <Text className="aks-proof-eyebrow" size="sm" tone="muted">
              {kindLabel(writing.kind, writing.locale)}
            </Text>
            <Heading level={1} size="lg">
              {writing.title}
            </Heading>
            <Text>{writing.summary}</Text>
          </header>

          {writing.categories.length > 0 ? (
            <nav
              className="aks-proof-actions"
              aria-label={
                writing.locale === 'fr'
                  ? 'Catégories éditoriales'
                  : 'Editorial categories'
              }
            >
              {writing.categories.map((category) => (
                <Link
                  href={categoryHref(writing.locale, category.slug)}
                  key={category.categoryId}
                >
                  {category.name}
                </Link>
              ))}
            </nav>
          ) : null}

          {writing.tags.length > 0 ? (
            <nav
              className="aks-proof-actions"
              aria-label={
                writing.locale === 'fr' ? 'Tags éditoriaux' : 'Editorial tags'
              }
            >
              {writing.tags.map((tag) => (
                <Link
                  href={tagHref(writing.locale, tag.slug)}
                  key={tag.tagId}
                >
                  {tag.name}
                </Link>
              ))}
            </nav>
          ) : null}

          {paragraphs.length > 0 ? (
            <section className="aks-proof-stack" aria-label={writing.locale === 'fr' ? 'Texte' : 'Text'}>
              {paragraphs.map((paragraph, index) => (
                <Text key={`${index}-${paragraph}`}>{paragraph}</Text>
              ))}
            </section>
          ) : null}

          <Text size="sm" tone="muted">
            {writing.locale === 'fr'
              ? 'Structure contrôlée par le produit · contenu éditorial administrable.'
              : 'Product-controlled structure · admin-managed editorial content.'}
          </Text>

          <Link href={overviewHref}>
            {writing.locale === 'fr' ? 'Retour aux Écrits' : 'Back to Writings'}
          </Link>
        </article>
      </Container>
    </main>
  );
}
