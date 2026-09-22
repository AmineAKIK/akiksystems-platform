import { listPublishedSystems } from '@akiksystems/db';
import { data, useLoaderData, type MetaDescriptor } from 'react-router';

import { SystemsOverview } from '../components/systems-overview';
import { requireLocale } from '../i18n/locales';
import { appDb } from '../lib/db.server';

import type { Route } from './+types/systems';

const canonicalOrigin = 'https://akiksystems.com';

export async function loader({ params }: Route.LoaderArgs) {
  const locale = requireLocale(params.locale);
  const systems = await listPublishedSystems(appDb, { locale });

  return data(
    {
      locale,
      systems: systems.map((system) => ({
        ...system,
        publishedAt: system.publishedAt.toISOString(),
      })),
      localContext: {
        title: null,
        alternateHref: `/${locale === 'en' ? 'fr' : 'en'}/systems`,
      },
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      },
    },
  );
}

export function meta({ loaderData }: Route.MetaArgs): MetaDescriptor[] {
  const locale = loaderData?.locale ?? 'en';
  const canonicalUrl = `${canonicalOrigin}/${locale}/systems`;
  const title = locale === 'fr' ? 'Systèmes · AkikSystems' : 'Systems · AkikSystems';
  const description =
    locale === 'fr'
      ? 'Systèmes logiciels inspectables construits via AkikSystems.'
      : 'Inspectable software systems built through AkikSystems.';
  const alternateLocale = locale === 'en' ? 'fr' : 'en';
  const alternateUrl = `${canonicalOrigin}/${alternateLocale}/systems`;

  return [
    { title },
    { name: 'description', content: description },
    { name: 'robots', content: 'index, follow, max-snippet:-1' },
    { property: 'og:type', content: 'website' },
    { property: 'og:site_name', content: 'AkikSystems' },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:url', content: canonicalUrl },
    { tagName: 'link', rel: 'canonical', href: canonicalUrl },
    { tagName: 'link', rel: 'alternate', hrefLang: locale, href: canonicalUrl },
    { tagName: 'link', rel: 'alternate', hrefLang: alternateLocale, href: alternateUrl },
    { tagName: 'link', rel: 'alternate', hrefLang: 'x-default', href: `${canonicalOrigin}/en/systems` },
  ];
}

export default function SystemsRoute() {
  const { locale, systems } = useLoaderData<typeof loader>();
  return <SystemsOverview locale={locale} systems={systems} />;
}
