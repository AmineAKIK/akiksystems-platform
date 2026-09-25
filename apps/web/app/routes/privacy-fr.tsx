import { useLoaderData } from 'react-router';
import { LegalPageRoute, legalPageLoader, legalPageMeta } from './legal-page';
import type { Route } from './+types/privacy-fr';
export function loader({ params }: Route.LoaderArgs) {
  return legalPageLoader(params.locale, 'fr', 'privacy');
}
export function meta() {
  return legalPageMeta('privacy', 'fr');
}
export default function PrivacyRoute() {
  return <LegalPageRoute {...useLoaderData<typeof loader>()} />;
}
