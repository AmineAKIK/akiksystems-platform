import { useLoaderData } from 'react-router';

import { LegalPageView } from '../components/legal-page-view';
import { legalPageHref } from '../i18n/legal-pages';
import { requireExactLocale } from '../i18n/locales';
import { loadLegalPage } from '../lib/legal-page-route.server';
import { buildLocalizedPublicMeta } from '../lib/public-seo';

import type { Route } from './+types/privacy-fr';

export async function loader({ params }: Route.LoaderArgs) {
  const locale = requireExactLocale(params.locale, 'fr');
  return loadLegalPage('privacy', locale);
}

export function meta({ loaderData }: Route.MetaArgs) {
  if (loaderData === undefined) {
    return [{ title: 'Confidentialité · AkikSystems' }];
  }

  return buildLocalizedPublicMeta({
    title: loaderData.page.title,
    description: loaderData.description,
    locale: 'fr',
    canonicalPath: legalPageHref('privacy', 'fr'),
    alternate: loaderData.alternate,
  });
}

export default function LegalPageRoute() {
  const { page } = useLoaderData<typeof loader>();
  return <LegalPageView page={page} />;
}
