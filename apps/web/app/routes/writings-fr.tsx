import { listPublishedWritings } from '@akiksystems/db';
import { type MetaDescriptor, useLoaderData } from 'react-router';

import { WritingsOverview } from '../components/writings-overview';
import { requireExactLocale } from '../i18n/locales';
import { appDb } from '../lib/db.server';
import { resolveWritingFilters } from '../lib/writing-filters';

import type { Route } from './+types/writings-fr';

export async function loader({ params, request }: Route.LoaderArgs) {
  const locale = requireExactLocale(params.locale, 'fr');
  const published = await listPublishedWritings(appDb, locale);
  const { model: filterModel, writings } = resolveWritingFilters(
    published,
    new URL(request.url).searchParams,
  );
  return {
    filterModel,
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
  const { filterModel, writings } = useLoaderData<typeof loader>();
  return (
    <WritingsOverview
      filterModel={filterModel}
      locale="fr"
      writings={writings.map((writing) => ({
        ...writing,
        publishedAt: new Date(writing.publishedAt),
      }))}
    />
  );
}
