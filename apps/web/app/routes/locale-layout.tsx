import { Outlet, useLoaderData, useLocation, useMatches } from 'react-router';

import { ExperienceShell } from '../components/experience-shell';
import { requireLocale } from '../i18n/locales';

import type { Route } from './+types/locale-layout';

export function loader({ params }: Route.LoaderArgs) {
  return {
    locale: requireLocale(params.locale),
  };
}

interface SystemMatchData {
  system?: {
    title?: string;
    locale?: 'en' | 'fr';
    alternate?: {
      locale: 'en' | 'fr';
      slug: string;
    } | null;
  };
}

function systemContext(matches: ReturnType<typeof useMatches>) {
  for (const match of matches) {
    const data = match.loaderData as SystemMatchData | undefined;
    const system = data?.system;

    if (system?.title === undefined || system.locale === undefined) {
      continue;
    }

    const alternateLocale = system.locale === 'en' ? 'fr' : 'en';

    return {
      currentTitle: system.title,
      alternateHref:
        system.alternate === null || system.alternate === undefined
          ? `/${alternateLocale}`
          : `/${system.alternate.locale}/systems/${system.alternate.slug}`,
    };
  }

  return {
    currentTitle: null,
    alternateHref: null,
  };
}

export default function LocaleLayout() {
  const { locale } = useLoaderData<typeof loader>();
  const location = useLocation();
  const matches = useMatches();
  const context = systemContext(matches);

  return (
    <ExperienceShell
      alternateHref={context.alternateHref}
      currentTitle={context.currentTitle}
      locale={locale}
      pathname={location.pathname}
    >
      <Outlet />
    </ExperienceShell>
  );
}
