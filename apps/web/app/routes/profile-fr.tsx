import { useLoaderData } from 'react-router';

import {
  PendingDestinationRoute,
  pendingDestinationLoader,
  pendingDestinationMeta,
} from './pending-destination';

import type { Route } from './+types/profile-fr';

export function loader({ params }: Route.LoaderArgs) {
  return pendingDestinationLoader(params.locale, 'fr', 'profile');
}

export function meta() {
  return pendingDestinationMeta('fr', 'profile');
}

export default function ProfileFrRoute() {
  const { locale, destinationId } = useLoaderData<typeof loader>();
  return <PendingDestinationRoute destinationId={destinationId} locale={locale} />;
}
