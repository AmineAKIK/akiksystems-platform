import { getPublishedSystem } from '@akiksystems/db';
import {
  data,
  useLoaderData,
  type MetaDescriptor,
} from 'react-router';

import { SystemDetailView } from '../components/system-detail-view';
import { appDb } from '../lib/db.server';
import { requireLocale } from '../i18n/locales';

import type { Route } from './+types/system-detail';

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const canonicalOrigin = 'https://akiksystems.com';

function requiredSlug(value: string | undefined): string {
  if (value === undefined || !slugPattern.test(value)) {
    throw new Response('System not found.', { status: 404 });
  }

  return value;
}

function publicSystemUrl(locale: 'en' | 'fr', slug: string): string {
  return `${canonicalOrigin}/${locale}/systems/${slug}`;
}

export async function loader({ params }: Route.LoaderArgs) {
  const locale = requireLocale(params.locale);
  const slug = requiredSlug(params.slug);
  const db = appDb;

    const system = await getPublishedSystem(db, { locale, slug });

    if (system === null) {
      throw new Response('System not found.', { status: 404 });
    }

    return data(
      {
        system: {
          ...system,
          publishedAt: system.publishedAt.toISOString(),
          media: system.media.map((asset) => ({
            ...asset,
            url: `/${locale}/systems/${slug}/assets/${asset.id}`,
          })),
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
  if (loaderData === undefined) {
    return [{ title: 'System · AkikSystems' }];
  }

  const { system } = loaderData;
  const canonicalUrl = publicSystemUrl(system.locale, system.slug);
  const descriptors: MetaDescriptor[] = [
    { title: `${system.title} · AkikSystems` },
    { name: 'description', content: system.summary },
    {
      name: 'robots',
      content: 'index, follow, max-image-preview:large, max-snippet:-1',
    },
    { property: 'og:type', content: 'website' },
    { property: 'og:site_name', content: 'AkikSystems' },
    { property: 'og:title', content: system.title },
    { property: 'og:description', content: system.summary },
    { property: 'og:url', content: canonicalUrl },
    {
      property: 'og:locale',
      content: system.locale === 'fr' ? 'fr_FR' : 'en_US',
    },
    { name: 'twitter:card', content: 'summary_large_image' },
    { tagName: 'link', rel: 'canonical', href: canonicalUrl },
    {
      tagName: 'link',
      rel: 'alternate',
      hrefLang: system.locale,
      href: canonicalUrl,
    },
  ];

  if (system.alternate !== null) {
    const alternateUrl = publicSystemUrl(
      system.alternate.locale,
      system.alternate.slug,
    );

    descriptors.push(
      {
        property: 'og:locale:alternate',
        content: system.alternate.locale === 'fr' ? 'fr_FR' : 'en_US',
      },
      {
        tagName: 'link',
        rel: 'alternate',
        hrefLang: system.alternate.locale,
        href: alternateUrl,
      },
    );
  }

  const englishUrl =
    system.locale === 'en'
      ? canonicalUrl
      : system.alternate?.locale === 'en'
        ? publicSystemUrl(system.alternate.locale, system.alternate.slug)
        : null;

  if (englishUrl !== null) {
    descriptors.push({
      tagName: 'link',
      rel: 'alternate',
      hrefLang: 'x-default',
      href: englishUrl,
    });
  }

  return descriptors;
}

export default function SystemDetailRoute() {
  const { system } = useLoaderData<typeof loader>();
  const alternateLocale = system.locale === 'en' ? 'fr' : 'en';
  const alternateHref =
    system.alternate === null
      ? `/${alternateLocale}`
      : `/${system.alternate.locale}/systems/${system.alternate.slug}`;

  return (
    <SystemDetailView
      alternateHref={alternateHref}
      assets={system.media}
      links={system.links}
      locale={system.locale}
      originSummary={system.origin?.summary ?? null}
      originTitle={system.origin?.title ?? null}
      presentationDocument={system.presentationDocument}
      summary={system.summary}
      technologies={system.technologies}
      title={system.title}
    />
  );
}
