import { useLoaderData } from 'react-router';
import { LegalPageRoute, legalPageLoader, legalPageMeta } from './legal-page';
import type { Route } from './+types/legal-notice';
export function loader({ params }: Route.LoaderArgs) {
  return legalPageLoader(params.locale, 'en', 'legal');
}
export function meta() {
  return legalPageMeta('legal', 'en');
}
export default function LegalNoticeRoute() {
  return <LegalPageRoute {...useLoaderData<typeof loader>()} />;
}
