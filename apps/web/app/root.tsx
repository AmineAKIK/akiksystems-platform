import type { ReactNode } from 'react';
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation,
} from 'react-router';

import { localeFromPathname } from './i18n/locales';

export function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const locale = localeFromPathname(location.pathname);

  return (
    <html lang={locale ?? 'und'}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: { error: unknown }) {
  const location = useLocation();
  const locale = localeFromPathname(location.pathname);
  let status = 500;
  let title = locale === 'fr' ? 'Erreur inattendue' : 'Unexpected error';
  let details =
    locale === 'fr'
      ? 'La requête n’a pas pu être traitée.'
      : 'The request could not be completed.';

  if (isRouteErrorResponse(error)) {
    status = error.status;

    if (error.status === 404) {
      title = locale === 'fr' ? 'Page introuvable' : 'Page not found';
      details =
        locale === 'fr'
          ? 'La page AkikSystems demandée n’existe pas.'
          : 'The requested AkikSystems page does not exist.';
    } else {
      title = error.statusText || (locale === 'fr' ? 'Erreur de requête' : 'Request error');
      details = error.statusText || details;
    }
  } else if (import.meta.env.DEV && error instanceof Error) {
    details = error.message;
  }

  const homeHref = locale === 'fr' ? '/fr' : '/en';
  const homeLabel = locale === 'fr' ? 'Retour à l’accueil' : 'Return home';

  return (
    <main>
      <p>{status}</p>
      <h1>{title}</h1>
      <p>{details}</p>
      <a href={homeHref}>{homeLabel}</a>
    </main>
  );
}
