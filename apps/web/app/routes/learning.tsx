import { useLoaderData } from 'react-router';

import {
  PendingDestinationRoute,
  pendingDestinationLoader,
  pendingDestinationMeta,
} from './pending-destination';

import type { Route } from './+types/learning';

export function loader({ params }: Route.LoaderArgs) {
  return pendingDestinationLoader(params.locale, 'en', 'learning');
}

export function meta() {
  return pendingDestinationMeta('en', 'learning');
}

export default function LearningRoute() {
  const { locale, destinationId } = useLoaderData<typeof loader>();
  return <PendingDestinationRoute destinationId={destinationId} locale={locale} />;
}
