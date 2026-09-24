import {
  listPublishedWritings,
  searchPublishedWritings,
} from '@akiksystems/db';
import { type MetaDescriptor, useLoaderData } from 'react-router';

import { WritingsOverview } from '../components/writings-overview';
import { requireExactLocale } from '../i18n/locales';
import { appDb } from '../lib/db.server';
import { resolveWritingFilters } from '../lib/writing-filters';
import { normalizeWritingSearchQuery } from '../lib/writing-search';

import type { Route } from './+types/writings';

export async function loader({ params, request }: Route.LoaderArgs) {
  const locale = requireExactLocale(params.locale, 'en');
  const params = new URL(request.url).searchParams;
  const searchQuery = normalizeWritingSearchQuery(params.get('q'));
  const published =
    searchQuery === ''
      ? await listPublishedWritings(appDb, locale)
      : await searchPublishedWritings(appDb, {
          locale,
          query: searchQuery,
        });
  const searchResultCount = published.length;
  const { model: filterModel, writings } = resolveWritingFilters(
    published,
    params,
  );
  return {
    filterModel,
    searchQuery,
    searchResultCount,
    writings: writings.map((writing) => ({
      ...writing,
      publishedAt: writing.publishedAt.toISOString(),
    })),
  };
}

export function meta(): MetaDescriptor[] {
  return [{ title: 'Writings · AkikSystems' }];
}

export default function GlobalDestinationRoute() {
  const { filterModel, searchQuery, searchResultCount, writings } =
    useLoaderData<typeof loader>();
  return (
    <WritingsOverview
      filterModel={filterModel}
      locale="en"
      searchQuery={searchQuery}
      searchResultCount={searchResultCount}
      writings={writings.map((writing) => ({
        ...writing,
        publishedAt: new Date(writing.publishedAt),
      }))}
    />
  );
}
