import { listPublishedWritings } from '@akiksystems/db';
import { type MetaDescriptor, useLoaderData } from 'react-router';

import { WritingsOverview } from '../components/writings-overview';
import { requireExactLocale } from '../i18n/locales';
import { appDb } from '../lib/db.server';

import type { Route } from './+types/writings';

export async function loader({ params }: Route.LoaderArgs) {
  const locale = requireExactLocale(params.locale, 'en');
  const writings = await listPublishedWritings(appDb, locale);
  return {
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
  const { writings } = useLoaderData<typeof loader>();
  return (
    <WritingsOverview
      locale="en"
      writings={writings.map((writing) => ({
        ...writing,
        publishedAt: new Date(writing.publishedAt),
      }))}
    />
  );
}
