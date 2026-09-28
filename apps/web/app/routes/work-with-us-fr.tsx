import { useLoaderData } from 'react-router';

import {
  PendingDestinationRoute,
  pendingDestinationLoader,
  pendingDestinationMeta,
} from './pending-destination';

import type { Route } from './+types/work-with-us-fr';

export function loader({ params }: Route.LoaderArgs) {
  return pendingDestinationLoader(params.locale, 'fr', 'work-with-us');
}

export function meta() {
  return pendingDestinationMeta('fr', 'work-with-us');
}

export default function WorkWithUsFrRoute() {
  const { locale, destinationId } = useLoaderData<typeof loader>();
  return <PendingDestinationRoute destinationId={destinationId} locale={locale} />;
}
