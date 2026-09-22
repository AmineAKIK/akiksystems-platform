import { getPublicProfile } from '@akiksystems/db';
import { data, useLoaderData, type MetaDescriptor } from 'react-router';

import { PublicProfileView } from '../components/public-profile-view';
import { appDb } from '../lib/db.server';
import { requireExactLocale } from '../i18n/locales';

import type { Route } from './+types/profile-fr';

export async function loader({ params }: Route.LoaderArgs) {
  const locale = requireExactLocale(params.locale, 'fr');
  const profile = await getPublicProfile(appDb, locale);

  if (profile === null) {
    throw new Response('Profile not found.', { status: 404 });
  }

  const alternate = await appDb
    .selectFrom('profile_publications')
    .select('locale')
    .where('profile_id', '=', profile.id)
    .where('locale', '=', 'en')
    .executeTakeFirst();

  return data(
    {
      profile,
      localContext: {
        title: profile.displayName,
        alternateHref: alternate === undefined ? null : '/en/profile',
      },
      alternatePublished: alternate !== undefined,
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      },
    },
  );
}

const canonicalOrigin = 'https://akiksystems.com';

export function meta({ loaderData }: Route.MetaArgs): MetaDescriptor[] {
  if (loaderData === undefined) {
    return [{ title: 'Profil · AkikSystems' }];
  }

  const { profile, alternatePublished } = loaderData;
  const canonicalUrl = `${canonicalOrigin}/fr/profil`;
  const title = profile.displayName ?? 'Amine AKIK';
  const description =
    profile.introduction ??
    profile.professionalTitle ??
    'Profil professionnel AkikSystems.';

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
    {
      property: 'og:locale',
      content: 'fr_FR',
    },
    { name: 'twitter:card', content: 'summary' },
    { tagName: 'link', rel: 'canonical', href: canonicalUrl },
    {
      tagName: 'link',
      rel: 'alternate',
      hrefLang: 'fr',
      href: canonicalUrl,
    },
  ];

  if (alternatePublished) {
    descriptors.push(
      {
        property: 'og:locale:alternate',
        content: 'en_US',
      },
      {
        tagName: 'link',
        rel: 'alternate',
        hrefLang: 'en',
        href: `${canonicalOrigin}/en/profile`,
      },
    );
  }

  if (alternatePublished) {
    descriptors.push({
      tagName: 'link',
      rel: 'alternate',
      hrefLang: 'x-default',
      href: `${canonicalOrigin}/en/profile`,
    });
  }

  return descriptors;
}

export default function ProfileRoute() {
  const { profile } = useLoaderData<typeof loader>();
  return <PublicProfileView profile={profile} />;
}
