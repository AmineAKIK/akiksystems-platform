import { listPublishedSystemReferences } from '@akiksystems/db';
import { type MetaDescriptor, useLoaderData } from 'react-router';

import { GlobalDestinationView } from '../components/global-destination-view';
import { requireExactLocale } from '../i18n/locales';
import { appDb } from '../lib/db.server';

import type { Route } from './+types/writings-fr';

export async function loader({ params }: Route.LoaderArgs) {
  const locale = requireExactLocale(params.locale, 'fr');
  const systemReferences = await listPublishedSystemReferences(appDb, {
    locale,
    limit: 2,
  });
  return { systemReferences };
}

export function meta(): MetaDescriptor[] {
  return [{ title: 'Écrits · AkikSystems' }];
}

export default function GlobalDestinationRoute() {
  const { systemReferences } = useLoaderData<typeof loader>();
  return (
    <GlobalDestinationView
      destinationId="writings"
      locale="fr"
      systemReferences={systemReferences}
    />
  );
}
