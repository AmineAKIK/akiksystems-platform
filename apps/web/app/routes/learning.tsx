import { listPublishedSystemReferences } from '@akiksystems/db';
import { useLoaderData } from 'react-router';

import { GlobalDestinationView } from '../components/global-destination-view';
import { requireExactLocale } from '../i18n/locales';
import { appDb } from '../lib/db.server';

import type { Route } from './+types/learning';

export async function loader({ params }: Route.LoaderArgs) {
  const locale = requireExactLocale(params.locale, 'en');
  const systemReferences = await listPublishedSystemReferences(appDb, {
    locale,
    limit: 2,
  });
  return { systemReferences };
}

export default function GlobalDestinationRoute() {
  const { systemReferences } = useLoaderData<typeof loader>();
  return (
    <GlobalDestinationView
      destinationId="learning"
      locale="en"
      systemReferences={systemReferences}
    />
  );
}
