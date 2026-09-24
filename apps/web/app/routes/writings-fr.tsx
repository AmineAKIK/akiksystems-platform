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

import type { Route } from './+types/writings-fr';

export async function loader({ params, request }: Route.LoaderArgs) {
  const locale = requireExactLocale(params.locale, 'fr');
  const searchParams = new URL(request.url).searchParams;
  const searchQuery = normalizeWritingSearchQuery(searchParams.get('q'));
  const published = await listPublishedWritings(appDb, locale);
  const resolvedFilters = resolveWritingFilters(published, searchParams);
  const searched =
    searchQuery === ''
      ? published
      : await searchPublishedWritings(appDb, {
          locale,
          query: searchQuery,
        });
  const searchResultCount = searched.length;
  const allowedWritingIds = new Set(
    resolvedFilters.writings.map((writing) => writing.writingId),
  );
  const writings =
    searchQuery === ''
      ? resolvedFilters.writings
      : searched.filter((writing) => allowedWritingIds.has(writing.writingId));
  const filterModel = {
    ...resolvedFilters.model,
    resultCount: writings.length,
  };
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
  return [{ title: 'Écrits · AkikSystems' }];
}

export default function GlobalDestinationRoute() {
  const { filterModel, searchQuery, searchResultCount, writings } =
    useLoaderData<typeof loader>();
  return (
    <WritingsOverview
      filterModel={filterModel}
      locale="fr"
      searchQuery={searchQuery}
      searchResultCount={searchResultCount}
      writings={writings.map((writing) => ({
        ...writing,
        publishedAt: new Date(writing.publishedAt),
      }))}
    />
  );
}
