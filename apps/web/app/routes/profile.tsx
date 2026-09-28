import { useLoaderData } from 'react-router';

import {
  PendingDestinationRoute,
  pendingDestinationLoader,
  pendingDestinationMeta,
} from './pending-destination';

import type { Route } from './+types/profile';

export function loader({ params }: Route.LoaderArgs) {
  return pendingDestinationLoader(params.locale, 'en', 'profile');
}

export function meta() {
  return pendingDestinationMeta('en', 'profile');
}

export default function ProfileRoute() {
  const { locale, destinationId } = useLoaderData<typeof loader>();
  return <PendingDestinationRoute destinationId={destinationId} locale={locale} />;
}
