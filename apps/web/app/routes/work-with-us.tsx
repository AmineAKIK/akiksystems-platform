import { useLoaderData } from 'react-router';

import {
  PendingDestinationRoute,
  pendingDestinationLoader,
  pendingDestinationMeta,
} from './pending-destination';

import type { Route } from './+types/work-with-us';

export function loader({ params }: Route.LoaderArgs) {
  return pendingDestinationLoader(params.locale, 'en', 'work-with-us');
}

export function meta() {
  return pendingDestinationMeta('en', 'work-with-us');
}

export default function WorkWithUsRoute() {
  const { locale, destinationId } = useLoaderData<typeof loader>();
  return <PendingDestinationRoute destinationId={destinationId} locale={locale} />;
}
