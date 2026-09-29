import { profileLoader, profileMeta, ProfileView } from '../profile/profile-route';

import type { Route } from './+types/profile-fr';

export function loader({ params }: Route.LoaderArgs) {
  return profileLoader(params.locale, 'fr');
}

export function meta() {
  return profileMeta('fr');
}

export default function ProfileFrRoute() {
  return <ProfileView />;
}
