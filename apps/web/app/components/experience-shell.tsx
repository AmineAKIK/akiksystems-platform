import type { ReactNode } from 'react';
import { Container } from '@akiksystems/ui';
import { Link as RouterLink } from 'react-router';

import {
  destinationFromPathname,
  destinationHref,
  globalDestinations,
} from '../i18n/global-destinations';
import { ExperienceLocalContext } from './experience-local-context';
import { dictionaryFor, type Locale } from '../i18n/locales';

export interface ExperienceShellProps {
  locale: Locale;
  pathname: string;
  alternateHref?: string | null;
  currentTitle?: string | null;
  children: ReactNode;
}

export function ExperienceShell({
  locale,
  pathname,
  alternateHref,
  currentTitle = null,
  children,
}: ExperienceShellProps) {
  const dictionary = dictionaryFor(locale);
  const destinationId = destinationFromPathname(pathname);
  const alternateLocale: Locale = locale === 'en' ? 'fr' : 'en';
  const derivedLanguageHref =
    destinationId === null
      ? `/${alternateLocale}`
      : destinationHref(destinationId, alternateLocale);
  const languageHref =
    alternateHref === null ? null : (alternateHref ?? derivedLanguageHref);

  return (
    <>
      <a className="aks-skip-link" href="#experience-outlet">
        {dictionary.shell.skipToContent}
      </a>

      <header className="aks-experience-shell">
        <Container width="wide">
          <div className="aks-experience-shell-inner">
            <RouterLink
              aria-label={locale === 'fr' ? 'AkikSystems, accueil' : 'AkikSystems, home'}
              className="aks-brand-signature"
              to={`/${locale}`}
              viewTransition
            >
              <span aria-hidden="true" className="aks-brand-mark">
                <span className="aks-brand-mark-core" />
              </span>
              <span className="aks-brand-wordmark">AkikSystems</span>
            </RouterLink>

            <nav
              aria-label={dictionary.shell.navigationLabel}
              className="aks-experience-nav"
            >
              <RouterLink
                aria-current={destinationId === null ? 'page' : undefined}
                className="aks-link"
                to={`/${locale}`}
                viewTransition
              >
                {dictionary.shell.homeLabel}
              </RouterLink>
              {globalDestinations.map((destination) => (
                <RouterLink
                  aria-current={destinationId === destination.id ? 'page' : undefined}
                  className="aks-link"
                  key={destination.id}
                  to={destinationHref(destination.id, locale)}
                  viewTransition
                >
                  {destination.label[locale]}
                </RouterLink>
              ))}
            </nav>

            <details className="aks-experience-mobile-menu">
              <summary className="aks-experience-mobile-menu-trigger">
                <span>{dictionary.shell.menuLabel}</span>
                <span aria-hidden="true" className="aks-experience-mobile-menu-icon">
                  +
                </span>
              </summary>
              <nav
                aria-label={dictionary.shell.navigationLabel}
                className="aks-experience-mobile-nav"
              >
                <RouterLink
                  aria-current={destinationId === null ? 'page' : undefined}
                  className="aks-link"
                  to={`/${locale}`}
                  viewTransition
                >
                  {dictionary.shell.homeLabel}
                </RouterLink>
                {globalDestinations.map((destination) => (
                  <RouterLink
                    aria-current={destinationId === destination.id ? 'page' : undefined}
                    className="aks-link"
                    key={destination.id}
                    to={destinationHref(destination.id, locale)}
                    viewTransition
                  >
                    {destination.label[locale]}
                  </RouterLink>
                ))}
              </nav>
            </details>

            <div className="aks-experience-meta">
              <ExperienceLocalContext
                currentTitle={currentTitle}
                destinationId={destinationId}
                locale={locale}
              />
              {languageHref === null ? (
                <span
                  aria-disabled="true"
                  className="aks-language-unavailable"
                >
                  {dictionary.shell.languageUnavailableLabel}
                </span>
              ) : (
                <RouterLink
                  className="aks-link"
                  hrefLang={alternateLocale}
                  lang={alternateLocale}
                  to={languageHref}
                  viewTransition
                >
                  {alternateLocale === 'fr' ? 'Français' : 'English'}
                </RouterLink>
              )}
            </div>
          </div>
        </Container>
      </header>

      <div className="aks-experience-outlet" id="experience-outlet" tabIndex={-1}>
        {children}
      </div>
    </>
  );
}
