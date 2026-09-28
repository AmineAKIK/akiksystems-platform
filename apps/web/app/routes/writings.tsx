import { useLoaderData } from 'react-router';

import {
  PendingDestinationRoute,
  pendingDestinationLoader,
  pendingDestinationMeta,
} from './pending-destination';

import type { Route } from './+types/writings';

export function loader({ params }: Route.LoaderArgs) {
  return pendingDestinationLoader(params.locale, 'en', 'writings');
}

export function meta() {
  return pendingDestinationMeta('en', 'writings');
}

export default function WritingsRoute() {
  const { locale, destinationId } = useLoaderData<typeof loader>();
  return <PendingDestinationRoute destinationId={destinationId} locale={locale} />;
}
