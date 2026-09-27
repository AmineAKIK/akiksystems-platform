import { getPublicProfile } from '@akiksystems/db';
import { data, useLoaderData, type MetaDescriptor } from 'react-router';

import { PublicProfileView } from '../components/public-profile-view';
import { requireExactLocale } from '../i18n/locales';
import { appDb } from '../lib/db.server';
import { publicCanonicalUrl } from '../lib/public-locales';

import type { Route } from './+types/profile';

export async function loader({ params }: Route.LoaderArgs) {
  const locale = requireExactLocale(params.locale, 'en');
  const profile = await getPublicProfile(appDb, locale);

  if (profile === null) {
    throw new Response('Profile not found.', { status: 404 });
  }

  const alternatePublished = profile.alternateLocale !== null;

  return data(
    {
      profile,
      localContext: {
        title: null,
        alternateHref: alternatePublished ? '/fr/profil' : null,
      },
      alternatePublished,
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
    return [{ title: 'Profile · AkikSystems' }];
  }

  const { profile, alternatePublished } = loaderData;
  const canonicalUrl = publicCanonicalUrl('/en/profile');
  const title = profile.displayName;
  const description =
    profile.content.hero.introduction.trim() ||
    profile.content.hero.professionalTitle.trim() ||
    'AkikSystems professional Profile.';

  const descriptors: MetaDescriptor[] = [
    { title: `${title} · AkikSystems` },
    { name: 'description', content: description },
    {
      name: 'robots',
      content: 'index, follow, max-image-preview:large, max-snippet:-1',
    },
    { property: 'og:type', content: 'profile' },
    { property: 'og:site_name', content: 'AkikSystems' },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:url', content: canonicalUrl },
    { property: 'og:locale', content: 'en_US' },
    { name: 'twitter:card', content: 'summary' },
    { tagName: 'link', rel: 'canonical', href: canonicalUrl },
    {
      tagName: 'link',
      rel: 'alternate',
      hrefLang: 'en',
      href: canonicalUrl,
    },
  ];

  if (alternatePublished) {
    descriptors.push(
      {
        property: 'og:locale:alternate',
        content: 'fr_FR',
      },
      {
        tagName: 'link',
        rel: 'alternate',
        hrefLang: 'fr',
        href: publicCanonicalUrl('/fr/profil'),
      },
    );
  }

  descriptors.push({
    tagName: 'link',
    rel: 'alternate',
    hrefLang: 'x-default',
    href: canonicalUrl,
  });

  return descriptors;
}

export default function ProfileRoute() {
  const { profile } = useLoaderData<typeof loader>();
  return <PublicProfileView profile={profile} />;
}
