import { Outlet, useLoaderData, useLocation, useMatches } from 'react-router';

import { ExperienceShell } from '../components/experience-shell';
import { requireLocale, type Locale } from '../i18n/locales';

import type { Route } from './+types/locale-layout';

export function loader({ params }: Route.LoaderArgs) {
  return {
    locale: requireLocale(params.locale),
  };
}

interface ExperienceMatchData {
  localContext?: {
    title: string;
    alternateHref?: string | null;
  };
}

function localContext(matches: ReturnType<typeof useMatches>) {
  for (const match of matches) {
    const data = match.loaderData as ExperienceMatchData | undefined;
    if (data?.localContext !== undefined) {
      return data.localContext;
    }
  }

  return {
    title: null,
    alternateHref: null,
  } satisfies {
    title: string | null;
    alternateHref: string | null;
  };
}

export default function LocaleLayout() {
  const { locale } = useLoaderData<typeof loader>();
  const location = useLocation();
  const matches = useMatches();
  const context = localContext(matches);

  return (
    <ExperienceShell
      alternateHref={context.alternateHref ?? null}
      currentTitle={context.title}
      locale={locale as Locale}
      pathname={location.pathname}
    >
      <Outlet />
    </ExperienceShell>
  );
}
