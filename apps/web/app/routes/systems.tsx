import { data, useLoaderData, type MetaDescriptor } from 'react-router';

import { requireLocale } from '../i18n/locales';
import { buildLocalizedPublicMeta } from '../lib/public-seo';
import { systemsPageContent } from '../systems/content';
import { SystemsPage } from '../systems/systems-page';

import type { Route } from './+types/systems';

export function loader({ params }: Route.LoaderArgs) {
  const locale = requireLocale(params.locale);

  return data(
    {
      locale,
      localContext: {
        title: null,
        alternateHref: `/${locale === 'en' ? 'fr' : 'en'}/systems`,
      },
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
      },
    },
  );
}

export function meta({ loaderData }: Route.MetaArgs): MetaDescriptor[] {
  const locale = loaderData?.locale ?? 'en';
  const alternateLocale = locale === 'en' ? 'fr' : 'en';
  const content = systemsPageContent[locale];

  return [
    ...buildLocalizedPublicMeta({
      title: content.meta.title,
      description: content.meta.description,
      locale,
      canonicalPath: `/${locale}/systems`,
      alternate: {
        locale: alternateLocale,
        path: `/${alternateLocale}/systems`,
      },
    }),
    {
      'script:ld+json': {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: content.meta.title,
        description: content.meta.description,
      },
    },
  ];
}

export default function SystemsRoute() {
  const { locale } = useLoaderData<typeof loader>();
  return <SystemsPage locale={locale} content={systemsPageContent[locale]} />;
}
