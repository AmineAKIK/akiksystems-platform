import { getPublishedWriting } from '@akiksystems/db';
import { data, useLoaderData } from 'react-router';

import { WritingDetailView } from '../components/writing-detail-view';
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
        shellMode: 'reading' as const,
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

  return (
    <WritingDetailView
      assetHref={(assetId, width) => {
        const base =
          writing.locale === 'fr'
            ? `/fr/ecrits/${writing.slug}/assets/${assetId}`
            : `/en/writings/${writing.slug}/assets/${assetId}`;
        return width === undefined ? base : `${base}?width=${width}`;
      }}
      backHref={overviewHref}
      backLabel={
        writing.locale === 'fr' ? 'Retour aux Écrits' : 'Back to Writings'
      }
      responsiveImages
      writing={writing}
    />
  );
}
