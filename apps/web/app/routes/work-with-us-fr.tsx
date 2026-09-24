import { getPublishedCommercialPage } from '@akiksystems/db';
import { useLoaderData, useParams } from 'react-router';

import { GlobalDestinationView } from '../components/global-destination-view';
import { requireExactLocale } from '../i18n/locales';
import { appDb } from '../lib/db.server';

import type { Route } from './+types/work-with-us-fr';

export async function loader({ params }: Route.LoaderArgs) {
  const locale = requireExactLocale(params.locale, 'fr');
  return {
    content: await getPublishedCommercialPage(appDb, locale),
  };
}

export default function GlobalDestinationRoute() {
  const params = useParams();
  const locale = requireExactLocale(params.locale, 'fr');
  const { content } = useLoaderData<typeof loader>();

  return (
    <GlobalDestinationView
      commercialContent={content}
      destinationId="work-with-us"
      locale={locale}
    />
  );
}
