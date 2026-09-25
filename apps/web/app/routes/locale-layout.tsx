import { listPublishedLegalPageKeys } from '@akiksystems/db';
import { Outlet, useLoaderData, useLocation, useMatches } from 'react-router';

import { ExperienceShell } from '../components/experience-shell';
import { requireLocale, type Locale } from '../i18n/locales';
import { appDb } from '../lib/db.server';

import type { Route } from './+types/locale-layout';

export async function loader({ params }: Route.LoaderArgs) {
  const locale = requireLocale(params.locale);
  return {
    locale,
    publishedLegalPageKeys: await listPublishedLegalPageKeys(appDb, locale),
  };
}

interface ExperienceMatchData {
  localContext?: {
    title: string;
    alternateHref?: string | null;
    shellMode?: 'reading';
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
    alternateHref: undefined,
    shellMode: undefined,
  } satisfies {
    title: string | null;
    alternateHref?: string | null;
    shellMode?: 'reading';
  };
}

export default function LocaleLayout() {
  const { locale, publishedLegalPageKeys } = useLoaderData<typeof loader>();
  const location = useLocation();
  const matches = useMatches();
  const context = localContext(matches);

  return (
    <ExperienceShell
      alternateHref={context.alternateHref}
      currentTitle={context.title}
      locale={locale as Locale}
      mode={context.shellMode ?? 'default'}
      pathname={location.pathname}
      publishedLegalPageKeys={publishedLegalPageKeys}
    >
      <Outlet />
    </ExperienceShell>
  );
}
