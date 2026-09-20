import type { ReactNode } from 'react';
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from 'react-router';

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
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
  let status = 500;
  let title = 'Unexpected error';
  let details = 'The request could not be completed.';

  if (isRouteErrorResponse(error)) {
    status = error.status;
    title = error.status === 404 ? 'Page not found' : error.statusText || 'Request error';
    details =
      error.status === 404
        ? 'The requested AkikSystems page does not exist.'
        : error.statusText || details;
  } else if (import.meta.env.DEV && error instanceof Error) {
    details = error.message;
  }

  return (
    <main>
      <p>{status}</p>
      <h1>{title}</h1>
      <p>{details}</p>
      <a href="/">Return home</a>
    </main>
  );
}
