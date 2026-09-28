import { useLoaderData } from 'react-router';

import { SystemsPage } from '../components/systems/systems-page';
import { requireLocale } from '../i18n/locales';
import { buildLocalizedPublicMeta } from '../lib/public-seo';

import type { Route } from './+types/systems';

export function loader({ params }: Route.LoaderArgs) {
  const locale = requireLocale(params.locale);
  const alternateLocale = locale === 'en' ? 'fr' : 'en';

  return {
    locale,
    localContext: {
      title: null,
      alternateHref: `/${alternateLocale}/systems`,
      shellMode: 'immersive' as const,
    },
  };
}

export function meta({ loaderData }: Route.MetaArgs) {
  const locale = loaderData?.locale ?? 'en';
  const alternateLocale = locale === 'en' ? 'fr' : 'en';

  return buildLocalizedPublicMeta({
    title: locale === 'fr' ? 'Systèmes' : 'Systems',
    description:
      locale === 'fr'
        ? 'Systèmes logiciels inspectables construits via AkikSystems.'
        : 'Inspectable software systems built through AkikSystems.',
    locale,
    canonicalPath: `/${locale}/systems`,
    alternate: {
      locale: alternateLocale,
      path: `/${alternateLocale}/systems`,
    },
  });
}

export default function SystemsRoute() {
  const { locale } = useLoaderData<typeof loader>();
  return <SystemsPage locale={locale} />;
}
