import {
  listPublishedSystemReferences,
  listPublishedWritings,
} from '@akiksystems/db';
import { type MetaDescriptor, useLoaderData } from 'react-router';

import { WritingsOverview } from '../components/writings-overview';
import { requireExactLocale } from '../i18n/locales';
import { appDb } from '../lib/db.server';

import type { Route } from './+types/writings-fr';

export async function loader({ params }: Route.LoaderArgs) {
  const locale = requireExactLocale(params.locale, 'fr');
  const [writings, systemReferences] = await Promise.all([
    listPublishedWritings(appDb, locale),
    listPublishedSystemReferences(appDb, {
      locale,
      limit: 2,
    }),
  ]);
  return {
    writings: writings.map((writing) => ({
      ...writing,
      publishedAt: writing.publishedAt.toISOString(),
    })),
    systemReferences,
  };
}

export function meta(): MetaDescriptor[] {
  return [{ title: 'Écrits · AkikSystems' }];
}

export default function GlobalDestinationRoute() {
  const { writings, systemReferences } = useLoaderData<typeof loader>();
  return (
    <WritingsOverview
      locale="fr"
      writings={writings.map((writing) => ({
        ...writing,
        publishedAt: new Date(writing.publishedAt),
      }))}
      systemReferences={systemReferences}
    />
  );
}
