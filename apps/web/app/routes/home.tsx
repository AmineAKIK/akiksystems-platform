import { useParams } from 'react-router';

import { HomePortal } from '../components/home-portal';
import { dictionaryFor, requireLocale } from '../i18n/locales';
import { buildLocalizedPublicMeta } from '../lib/public-seo';

import type { Route } from './+types/home';

export { HomePortal } from '../components/home-portal';


export function meta({ params }: Route.MetaArgs) {
  const locale = requireLocale(params.locale);
  const alternateLocale = locale === 'en' ? 'fr' : 'en';

  return buildLocalizedPublicMeta({
    title: 'Systemic Scale',
    description: dictionaryFor(locale).home.description,
    locale,
    canonicalPath: '/' + locale,
    alternate: {
      locale: alternateLocale,
      path: '/' + alternateLocale,
    },
  });
}

export default function Home() {
  const params = useParams();
  const locale = requireLocale(params.locale);

  return <HomePortal locale={locale} />;
}
