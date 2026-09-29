import { profileLoader, profileMeta, ProfileView } from '../profile/profile-route';

import type { Route } from './+types/profile';

export function loader({ params }: Route.LoaderArgs) {
  return profileLoader(params.locale, 'en');
}

export function meta() {
  return profileMeta('en');
}

export default function ProfileRoute() {
  return <ProfileView />;
}
