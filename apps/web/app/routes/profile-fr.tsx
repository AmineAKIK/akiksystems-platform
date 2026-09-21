import { getPublicProfile } from '@akiksystems/db';
import { data, useLoaderData } from 'react-router';

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

  return data({
    profile,
    localContext: {
      title: null,
      alternateHref: '/en/profile',
    },
  });
}

export default function ProfileRoute() {
  const { profile } = useLoaderData<typeof loader>();
  return <PublicProfileView profile={profile} />;
}
