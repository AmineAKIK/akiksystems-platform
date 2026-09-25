import type { LegalPageKey } from '@akiksystems/core';
import { useEffect, useState, type ReactNode } from 'react';
import { BrandMark, Container } from '@akiksystems/ui';
import { Link as RouterLink } from 'react-router';

import {
  destinationFromPathname,
  destinationHref,
  globalDestinations,
} from '../i18n/global-destinations';
import { ExperienceLocalContext } from './experience-local-context';
import {
  legalPageHref,
  orderedPublishedLegalPageDefinitions,
} from '../i18n/legal-pages';
import { dictionaryFor, type Locale } from '../i18n/locales';

export interface ExperienceShellProps {
  locale: Locale;
  pathname: string;
  alternateHref?: string | null;
  currentTitle?: string | null;
  mode?: 'default' | 'reading';
  publishedLegalPageKeys?: LegalPageKey[];
  children: ReactNode;
}

export function ExperienceShell({
  locale,
  pathname,
  alternateHref,
  currentTitle = null,
  mode = 'default',
  publishedLegalPageKeys = [],
  children,
}: ExperienceShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const dictionary = dictionaryFor(locale);
  const destinationId = destinationFromPathname(pathname);
  const isHome = pathname === `/${locale}` || pathname === `/${locale}/`;
  const publishedLegalPages =
    orderedPublishedLegalPageDefinitions(publishedLegalPageKeys);
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

      <header
        className="aks-experience-shell"
        data-destination={destinationId ?? 'home'}
        data-mode={mode}
      >
        <Container width="wide">
          <div className="aks-experience-shell-inner">
            <RouterLink
              aria-label={locale === 'fr' ? 'AkikSystems, accueil' : 'AkikSystems, home'}
              className="aks-brand-signature"
              prefetch="intent"
              to={`/${locale}`}
              viewTransition
            >
              <BrandMark />
              <span className="aks-brand-wordmark">AkikSystems</span>
            </RouterLink>

            <nav
              aria-label={dictionary.shell.navigationLabel}
              className="aks-experience-nav"
            >
              <RouterLink
                aria-current={isHome ? 'page' : undefined}
                className="aks-link"
                prefetch="intent"
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
                  prefetch="intent"
                  to={destinationHref(destination.id, locale)}
                  viewTransition
                >
                  {destination.label[locale]}
                </RouterLink>
              ))}
            </nav>

            <details
              className="aks-experience-mobile-menu"
              key={pathname}
              onToggle={(event) => setMobileMenuOpen(event.currentTarget.open)}
              open={mobileMenuOpen}
            >
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
                  aria-current={isHome ? 'page' : undefined}
                  className="aks-link"
                  onClick={() => setMobileMenuOpen(false)}
                  prefetch="intent"
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
                    onClick={() => setMobileMenuOpen(false)}
                    prefetch="intent"
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
                  prefetch="intent"
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

      {publishedLegalPages.length > 0 ? (
        <footer className="aks-legal-footer">
          <Container width="wide">
            <nav
              aria-label={
                locale === 'fr'
                  ? 'Informations légales et confidentialité'
                  : 'Legal and privacy information'
              }
              className="aks-legal-footer-nav"
            >
              {publishedLegalPages.map((page) => (
                <RouterLink
                  className="aks-link"
                  key={page.key}
                  prefetch="intent"
                  to={legalPageHref(page.key, locale)}
                  viewTransition
                >
                  {page.label[locale]}
                </RouterLink>
              ))}
            </nav>
          </Container>
        </footer>
      ) : null}
    </>
  );
}
