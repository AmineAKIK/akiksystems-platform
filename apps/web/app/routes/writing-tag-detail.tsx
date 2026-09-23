import {
  getPublishedTag,
  listPublishedWritingsForTag,
} from '@akiksystems/db';
import { Container, Heading, Link, Text } from '@akiksystems/ui';
import { data, useLoaderData } from 'react-router';

import { WritingsFeed } from '../components/writings-feed';
import { requireLocale } from '../i18n/locales';
import { appDb } from '../lib/db.server';
import { publicNotFound } from '../lib/public-seo';

import type { Route } from './+types/writing-tag-detail';

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function requiredSlug(value: string | undefined): string {
  if (value === undefined || !slugPattern.test(value)) {
    throw publicNotFound('Tag not found.');
  }
  return value;
}

function tagHref(locale: 'en' | 'fr', slug: string): string {
  return locale === 'fr'
    ? `/fr/ecrits/tags/${slug}`
    : `/en/writings/tags/${slug}`;
}

export async function loader({ params }: Route.LoaderArgs) {
  const locale = requireLocale(params.locale);
  const slug = requiredSlug(params.slug);
  const tag = await getPublishedTag(appDb, { locale, slug });

  if (tag === null) {
    throw publicNotFound('Tag not found.');
  }

  const writings = await listPublishedWritingsForTag(appDb, {
    locale,
    tagId: tag.tagId,
  });

  return data(
    {
      tag: {
        ...tag,
        publishedAt: tag.publishedAt.toISOString(),
      },
      writings: writings.map((writing) => ({
        ...writing,
        publishedAt: writing.publishedAt.toISOString(),
      })),
      localContext: {
        title: tag.name,
        alternateHref:
          tag.alternate === null
            ? null
            : tagHref(tag.alternate.locale, tag.alternate.slug),
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
          : `${loaderData.tag.name} · Writings · AkikSystems`,
    },
  ];
}

export default function WritingTagDetailRoute() {
  const { tag, writings } = useLoaderData<typeof loader>();
  const overviewHref = tag.locale === 'fr' ? '/fr/ecrits' : '/en/writings';

  return (
    <main className="aks-proof-page">
      <Container>
        <div className="aks-proof-stack">
          <header className="aks-proof-hero">
            <Text className="aks-proof-eyebrow" size="sm" tone="muted">
              {tag.locale === 'fr' ? 'Tag éditorial' : 'Editorial tag'}
            </Text>
            <Heading level={1} size="lg">
              {tag.name}
            </Heading>
            <Text size="sm" tone="muted">
              {tag.locale === 'fr'
                ? 'Identité dédupliquée · contenu localisé.'
                : 'Deduplicated identity · localized content.'}
            </Text>
          </header>

          <section className="aks-proof-stack" aria-labelledby="tag-writings">
            <div className="aks-profile-section-heading">
              <Heading id="tag-writings" level={2} size="sm">
                {tag.locale === 'fr'
                  ? 'Écrits avec ce tag'
                  : 'Writings with this tag'}
              </Heading>
              <Text size="sm" tone="muted">
                {tag.locale === 'fr'
                  ? 'Le tag relie les contenus sans modifier leur structure éditoriale.'
                  : 'The tag connects content without changing its editorial structure.'}
              </Text>
            </div>

            <WritingsFeed
              emptyMessage={
                tag.locale === 'fr'
                  ? 'Aucun écrit publié avec ce tag.'
                  : 'No published Writing with this tag.'
              }
              locale={tag.locale}
              writings={writings.map((writing) => ({
                ...writing,
                publishedAt: new Date(writing.publishedAt),
              }))}
            />
          </section>

          <Link href={overviewHref}>
            {tag.locale === 'fr' ? 'Retour aux Écrits' : 'Back to Writings'}
          </Link>
        </div>
      </Container>
    </main>
  );
}
