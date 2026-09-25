import { useLoaderData } from 'react-router';
import { LegalPageRoute, legalPageLoader, legalPageMeta } from './legal-page';
import type { Route } from './+types/privacy';
export function loader({ params }: Route.LoaderArgs) {
  return legalPageLoader(params.locale, 'en', 'privacy');
}
export function meta() {
  return legalPageMeta('privacy', 'en');
}
export default function PrivacyRoute() {
  return <LegalPageRoute {...useLoaderData<typeof loader>()} />;
}
