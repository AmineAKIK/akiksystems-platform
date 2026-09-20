import { Outlet } from 'react-router';

import { requireLocale } from '../i18n/locales';

import type { Route } from './+types/locale-layout';

export function loader({ params }: Route.LoaderArgs) {
  return {
    locale: requireLocale(params.locale),
  };
}

export default function LocaleLayout() {
  return <Outlet />;
}
