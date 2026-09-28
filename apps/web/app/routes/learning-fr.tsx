import { useLoaderData } from 'react-router';

import {
  PendingDestinationRoute,
  pendingDestinationLoader,
  pendingDestinationMeta,
} from './pending-destination';

import type { Route } from './+types/learning-fr';

export function loader({ params }: Route.LoaderArgs) {
  return pendingDestinationLoader(params.locale, 'fr', 'learning');
}

export function meta() {
  return pendingDestinationMeta('fr', 'learning');
}

export default function LearningFrRoute() {
  const { locale, destinationId } = useLoaderData<typeof loader>();
  return <PendingDestinationRoute destinationId={destinationId} locale={locale} />;
}
