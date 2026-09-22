import { getDraftProfile } from '@akiksystems/db';
import { type MetaDescriptor, useLoaderData } from 'react-router';

import { PublicProfileView } from '../components/public-profile-view';
import { requireAdminSession } from '../lib/admin.server';
import { appDb } from '../lib/db.server';

import type { Route } from './+types/admin-profile-preview';

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireAdminSession(request);
  const locale = params.locale;
  if (locale !== 'en' && locale !== 'fr') {
    throw new Response('Profile preview not found.', { status: 404 });
  }

  const profile = await getDraftProfile(appDb, locale);
  if (profile === null) {
    throw new Response('Profile preview not found.', { status: 404 });
  }

  return {
    profile,
  };
}

export function meta(): MetaDescriptor[] {
  return [
    { title: 'Profile preview · AkikSystems' },
    { name: 'robots', content: 'noindex, nofollow, noarchive, nosnippet' },
  ];
}

export default function AdminProfilePreview() {
  const { profile } = useLoaderData<typeof loader>();
  return <PublicProfileView profile={profile} />;
}
