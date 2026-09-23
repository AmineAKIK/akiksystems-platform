import {
  getPublishedCategory,
  listPublishedWritingsForCategory,
} from '@akiksystems/db';
import { Container, Heading, Link, Text } from '@akiksystems/ui';
import { data, useLoaderData } from 'react-router';

import { requireLocale } from '../i18n/locales';
import { appDb } from '../lib/db.server';
import { publicNotFound } from '../lib/public-seo';

import type { Route } from './+types/writing-category-detail';

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function requiredSlug(value: string | undefined): string {
  if (value === undefined || !slugPattern.test(value)) {
    throw publicNotFound('Category not found.');
  }
  return value;
}

function categoryHref(locale: 'en' | 'fr', slug: string): string {
  return locale === 'fr'
    ? `/fr/ecrits/categories/${slug}`
    : `/en/writings/categories/${slug}`;
}

function writingHref(locale: 'en' | 'fr', slug: string): string {
  return locale === 'fr'
    ? `/fr/ecrits/${slug}`
    : `/en/writings/${slug}`;
}

export async function loader({ params }: Route.LoaderArgs) {
  const locale = requireLocale(params.locale);
  const slug = requiredSlug(params.slug);
  const category = await getPublishedCategory(appDb, { locale, slug });

  if (category === null) {
    throw publicNotFound('Category not found.');
  }

  const writings = await listPublishedWritingsForCategory(appDb, {
    locale,
    categoryId: category.categoryId,
  });

  return data(
    {
      category: {
        ...category,
        publishedAt: category.publishedAt.toISOString(),
      },
      writings: writings.map((writing) => ({
        ...writing,
        publishedAt: writing.publishedAt.toISOString(),
      })),
      localContext: {
        title: category.name,
        alternateHref:
          category.alternate === null
            ? null
            : categoryHref(category.alternate.locale, category.alternate.slug),
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
          : `${loaderData.category.name} · Writings · AkikSystems`,
    },
    ...(loaderData?.category.description
      ? [{ name: 'description', content: loaderData.category.description }]
      : []),
  ];
}

export default function WritingCategoryDetailRoute() {
  const { category, writings } = useLoaderData<typeof loader>();
  const overviewHref =
    category.locale === 'fr' ? '/fr/ecrits' : '/en/writings';

  return (
    <main className="aks-proof-page">
      <Container>
        <div className="aks-proof-stack">
          <header className="aks-proof-hero">
            <Text className="aks-proof-eyebrow" size="sm" tone="muted">
              {category.locale === 'fr'
                ? 'Catégorie éditoriale'
                : 'Editorial category'}
            </Text>
            <Heading level={1} size="lg">
              {category.name}
            </Heading>
            {category.description ? <Text>{category.description}</Text> : null}
          </header>

          <section className="aks-proof-stack" aria-labelledby="category-writings">
            <div className="aks-profile-section-heading">
              <Heading id="category-writings" level={2} size="sm">
                {category.locale === 'fr'
                  ? 'Écrits dans cette catégorie'
                  : 'Writings in this category'}
              </Heading>
              <Text size="sm" tone="muted">
                {category.locale === 'fr'
                  ? 'La catégorie organise le contenu sans modifier sa structure éditoriale.'
                  : 'The category organizes content without changing its editorial structure.'}
              </Text>
            </div>

            {writings.length === 0 ? (
              <Text tone="muted">
                {category.locale === 'fr'
                  ? 'Aucun écrit publié dans cette catégorie.'
                  : 'No published Writing in this category.'}
              </Text>
            ) : (
              <div className="aks-proof-stack">
                {writings.map((writing) => (
                  <article className="aks-admin-card" key={writing.writingId}>
                    <div className="aks-proof-stack">
                      <Heading level={3} size="sm">
                        {writing.title}
                      </Heading>
                      <Text>{writing.summary}</Text>
                      <Link href={writingHref(category.locale, writing.slug)}>
                        {category.locale === 'fr' ? 'Lire' : 'Read'}
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <Link href={overviewHref}>
            {category.locale === 'fr'
              ? 'Retour aux Écrits'
              : 'Back to Writings'}
          </Link>
        </div>
      </Container>
    </main>
  );
}
