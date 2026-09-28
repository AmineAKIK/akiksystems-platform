import { useLoaderData } from 'react-router';

import {
  PendingDestinationRoute,
  pendingDestinationLoader,
  pendingDestinationMeta,
} from './pending-destination';

import type { Route } from './+types/writings-fr';

export function loader({ params }: Route.LoaderArgs) {
  return pendingDestinationLoader(params.locale, 'fr', 'writings');
}

export function meta() {
  return pendingDestinationMeta('fr', 'writings');
}

export default function WritingsFrRoute() {
  const { locale, destinationId } = useLoaderData<typeof loader>();
  return <PendingDestinationRoute destinationId={destinationId} locale={locale} />;
}
