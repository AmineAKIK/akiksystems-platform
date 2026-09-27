import { redirect } from 'react-router';

import { localeFromPublicHostname } from '../lib/public-locales';

import type { Route } from './+types/locale-index';

export function loader({ request }: Route.LoaderArgs) {
  const hostname = new URL(request.url).hostname;
  const locale = localeFromPublicHostname(hostname) ?? 'en';
  return redirect('/' + locale, 302);
}
