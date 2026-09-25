import { useLoaderData } from 'react-router';
import { LegalPageRoute, legalPageLoader, legalPageMeta } from './legal-page';
import type { Route } from './+types/legal-notice-fr';
export function loader({ params }: Route.LoaderArgs) {
  return legalPageLoader(params.locale, 'fr', 'legal');
}
export function meta() {
  return legalPageMeta('legal', 'fr');
}
export default function LegalNoticeRoute() {
  return <LegalPageRoute {...useLoaderData<typeof loader>()} />;
}
