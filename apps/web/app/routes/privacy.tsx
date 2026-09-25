import { useLoaderData } from 'react-router';

import { LegalPageView } from '../components/legal-page-view';
import { legalPageHref } from '../i18n/legal-pages';
import { requireExactLocale } from '../i18n/locales';
import { loadLegalPage } from '../lib/legal-page-route.server';
import { buildLocalizedPublicMeta } from '../lib/public-seo';

import type { Route } from './+types/privacy';

export async function loader({ params }: Route.LoaderArgs) {
  const locale = requireExactLocale(params.locale, 'en');
  return loadLegalPage('privacy', locale);
}

export function meta({ loaderData }: Route.MetaArgs) {
  if (loaderData === undefined) {
    return [{ title: 'Privacy · AkikSystems' }];
  }

  return buildLocalizedPublicMeta({
    title: loaderData.page.title,
    description: loaderData.description,
    locale: 'en',
    canonicalPath: legalPageHref('privacy', 'en'),
    alternate: loaderData.alternate,
  });
}

export default function LegalPageRoute() {
  const { page } = useLoaderData<typeof loader>();
  return <LegalPageView page={page} />;
}
