import {
  getPublishedWorkWithUsPage,
  listWorkWithUsProofReferences,
} from '@akiksystems/db';
import { useLoaderData, useParams } from 'react-router';

import { WorkWithUsView } from '../components/work-with-us-view';
import { requireExactLocale } from '../i18n/locales';
import { appDb } from '../lib/db.server';

import type { Route } from './+types/work-with-us';

export async function loader({ params }: Route.LoaderArgs) {
  const locale = requireExactLocale(params.locale, 'en');
  const [content, systemReferences] = await Promise.all([
    getPublishedWorkWithUsPage(appDb, locale),
    listWorkWithUsProofReferences(appDb, locale),
  ]);

  return { content, systemReferences };
}

export function meta() {
  return [{ title: 'Work with us · AkikSystems' }];
}

export default function WorkWithUsRoute() {
  const params = useParams();
  const locale = requireExactLocale(params.locale, 'en');
  const { content, systemReferences } = useLoaderData<typeof loader>();

  return (
    <WorkWithUsView
      content={content}
      locale={locale}
      systemReferences={systemReferences}
    />
  );
}
