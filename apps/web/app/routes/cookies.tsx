import { useLoaderData } from 'react-router';
import { requireLocale } from '../i18n/locales';
import { LegalPageRoute, legalPageLoader, legalPageMeta } from './legal-page';
import type { Route } from './+types/cookies';
export function loader({ params }: Route.LoaderArgs) {
  const locale = requireLocale(params.locale);
  return legalPageLoader(params.locale, locale, 'cookies');
}
export function meta({ loaderData }: Route.MetaArgs) {
  return legalPageMeta('cookies', loaderData?.locale ?? 'en');
}
export default function CookiesRoute() {
  return <LegalPageRoute {...useLoaderData<typeof loader>()} />;
}
