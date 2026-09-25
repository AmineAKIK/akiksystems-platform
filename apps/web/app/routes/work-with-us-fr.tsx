import {
  getPublishedWorkWithUsPage,
  listWorkWithUsProofReferences,
} from '@akiksystems/db';
import { useLoaderData, useParams } from 'react-router';

import { GlobalDestinationView } from '../components/global-destination-view';
import { requireExactLocale } from '../i18n/locales';
import { appDb } from '../lib/db.server';

import type { Route } from './+types/work-with-us-fr';

export async function loader({ params }: Route.LoaderArgs) {
  const locale = requireExactLocale(params.locale, 'fr');
  const [content, systemReferences] = await Promise.all([
    getPublishedWorkWithUsPage(appDb, locale),
    listWorkWithUsProofReferences(appDb, locale),
  ]);

  return { content, systemReferences };
}

export function meta() {
  return [{ title: 'Travailler ensemble · AkikSystems' }];
}

export default function GlobalDestinationRoute() {
  const params = useParams();
  const locale = requireExactLocale(params.locale, 'fr');
  const { content, systemReferences } = useLoaderData<typeof loader>();

  return (
    <GlobalDestinationView
      commercialContent={content}
      destinationId="work-with-us"
      locale={locale}
      systemReferences={systemReferences}
    />
  );
}
