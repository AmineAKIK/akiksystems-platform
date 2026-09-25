import { useLoaderData } from 'react-router';

import { LegalPageView } from '../components/legal-page-view';
import { legalPageHref } from '../i18n/legal-pages';
import { requireLocale } from '../i18n/locales';
import { loadLegalPage } from '../lib/legal-page-route.server';
import { buildLocalizedPublicMeta } from '../lib/public-seo';

import type { Route } from './+types/cookies';

export async function loader({ params }: Route.LoaderArgs) {
  const locale = requireLocale(params.locale);
  return loadLegalPage('cookies', locale);
}

export function meta({ loaderData }: Route.MetaArgs) {
  if (loaderData === undefined) {
    return [{ title: 'Cookies · AkikSystems' }];
  }

  return buildLocalizedPublicMeta({
    title: loaderData.page.title,
    description: loaderData.description,
    locale: loaderData.page.locale,
    canonicalPath: legalPageHref('cookies', loaderData.page.locale),
    alternate: loaderData.alternate,
  });
}

export default function LegalPageRoute() {
  const { page } = useLoaderData<typeof loader>();
  return <LegalPageView page={page} />;
}
