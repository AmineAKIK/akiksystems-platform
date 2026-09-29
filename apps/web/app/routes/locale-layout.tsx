import { Outlet, redirect, useLoaderData, useLocation, useMatches } from 'react-router';

import { ExperienceShell } from '../components/experience-shell';
import { requireLocale, type Locale } from '../i18n/locales';
import { localeFromPublicHostname, publicOrigins, publicUrlForLocale } from '../lib/public-locales';

import type { Route } from './+types/locale-layout';

export function loader({ params, request }: Route.LoaderArgs) {
  const locale = requireLocale(params.locale);
  const requestUrl = new URL(request.url);
  const hostnameLocale = localeFromPublicHostname(requestUrl.hostname);
  const canonicalHostname = new URL(publicOrigins[locale]).hostname;

  if (
    hostnameLocale !== null &&
    (hostnameLocale !== locale || requestUrl.hostname !== canonicalHostname)
  ) {
    // A client-side navigation asks for "<path>.data": redirect to the page itself, never to
    // the data URL, or the browser would land on raw loader data on the other domain.
    const pagePath = requestUrl.pathname.replace(/\.data$/, '').replace(/^\/_root$/, '/');
    throw redirect(publicUrlForLocale(locale, pagePath + requestUrl.search), 308);
  }

  return { locale };
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
  const { locale } = useLoaderData<typeof loader>();
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
    >
      <Outlet />
    </ExperienceShell>
  );
}
