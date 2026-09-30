import { useEffect, useState, type ReactNode } from 'react';
import { BrandMark, Container } from '@akiksystems/ui';
import { Link as RouterLink } from 'react-router';

import {
  destinationFromPathname,
  destinationHref,
  openDestinations,
} from '../i18n/global-destinations';
import { ExperienceFooter } from './experience-footer';
import { LanguageSwitch } from './language-switch';
import { dictionaryFor, type Locale } from '../i18n/locales';
import { publicLanguageHref } from '../lib/public-locales';

export interface ExperienceShellProps {
  locale: Locale;
  pathname: string;
  alternateHref?: string | null;
  currentTitle?: string | null;
  mode?: 'default' | 'reading';
  children: ReactNode;
}

export function ExperienceShell({
  locale,
  pathname,
  alternateHref,
  mode = 'default',
  children,
}: ExperienceShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return undefined;

    const previousRootOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    return () => {
      document.documentElement.style.overflow = previousRootOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [mobileMenuOpen]);

  const dictionary = dictionaryFor(locale);
  const destinationId = destinationFromPathname(pathname);
  // Only the locale root is Home; legal and other pages outside the main destinations
  // share the regular header and footer.
  const isHome = pathname.split('/').filter(Boolean).length <= 1;
  const pageSlug = pathname.split('/').filter(Boolean).at(-1);
  const isLegalNotice = pageSlug === 'legal-notice' || pageSlug === 'mentions-legales';
  const alternateLocale: Locale = locale === 'en' ? 'fr' : 'en';
  const derivedLanguageHref =
    destinationId === null
      ? `/${alternateLocale}`
      : destinationHref(destinationId, alternateLocale);
  const languagePath = alternateHref === null ? null : (alternateHref ?? derivedLanguageHref);
  const languageHref =
    languagePath === null ? null : publicLanguageHref(alternateLocale, languagePath);

  return (
    <div
      className="aks-experience-page"
      data-destination={destinationId ?? (isHome ? 'home' : 'page')}
    >
      <a className="aks-skip-link" href="#experience-outlet">
        {dictionary.shell.skipToContent}
      </a>

      <header
        className="aks-experience-shell aks-section-separator-after"
        data-destination={destinationId ?? (isHome ? 'home' : 'page')}
        data-header-position={isLegalNotice ? 'static' : undefined}
        data-mode={mode}
      >
        <Container width="wide">
          <div className="aks-experience-shell-inner">
            <RouterLink
              aria-label={locale === 'fr' ? 'AkikSystems, accueil' : 'AkikSystems, home'}
              className="aks-brand-signature"
              prefetch="intent"
              to={`/${locale}`}
            >
              <BrandMark />
              <span className="aks-brand-wordmark">AkikSystems</span>
            </RouterLink>

            <nav aria-label={dictionary.shell.navigationLabel} className="aks-experience-nav">
              <RouterLink
                aria-current={isHome ? 'page' : undefined}
                className="aks-link"
                prefetch="intent"
                to={`/${locale}`}
              >
                {dictionary.shell.homeLabel}
              </RouterLink>
              {openDestinations.map((destination) => (
                <RouterLink
                  aria-current={destinationId === destination.id ? 'page' : undefined}
                  className="aks-link"
                  key={destination.id}
                  prefetch="intent"
                  to={destinationHref(destination.id, locale)}
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
                  <span />
                  <span />
                  <span />
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
                >
                  {dictionary.shell.homeLabel}
                </RouterLink>
                {openDestinations.map((destination) => (
                  <RouterLink
                    aria-current={destinationId === destination.id ? 'page' : undefined}
                    className="aks-link"
                    key={destination.id}
                    onClick={() => setMobileMenuOpen(false)}
                    prefetch="intent"
                    to={destinationHref(destination.id, locale)}
                  >
                    {destination.label[locale]}
                  </RouterLink>
                ))}
                <div className="aks-experience-mobile-language">
                  {languageHref === null ? (
                    <span aria-disabled="true" className="aks-language-unavailable">
                      {dictionary.shell.languageUnavailableLabel}
                    </span>
                  ) : (
                    <LanguageSwitch
                      className="aks-experience-language"
                      locale={locale}
                      to={languageHref}
                    />
                  )}
                </div>
              </nav>
            </details>

            <div className="aks-experience-meta">
              {languageHref === null ? (
                <span aria-disabled="true" className="aks-language-unavailable">
                  {dictionary.shell.languageUnavailableLabel}
                </span>
              ) : (
                <LanguageSwitch
                  className="aks-experience-language"
                  locale={locale}
                  to={languageHref}
                />
              )}
            </div>
          </div>
        </Container>
      </header>

      <div className="aks-experience-frame" data-home={isHome || undefined}>
        <div className="aks-experience-outlet" id="experience-outlet" tabIndex={-1}>
          {children}
        </div>
        <ExperienceFooter home={isHome} locale={locale} />
      </div>
    </div>
  );
}
