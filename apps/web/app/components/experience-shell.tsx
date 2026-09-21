import type { ReactNode } from 'react';
import { BrandSignature, Container, Link, Text } from '@akiksystems/ui';

import {
  destinationById,
  destinationFromPathname,
  destinationHref,
  globalDestinations,
} from '../i18n/global-destinations';
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
  alternateHref = null,
  currentTitle = null,
  children,
}: ExperienceShellProps) {
  const dictionary = dictionaryFor(locale);
  const destinationId = destinationFromPathname(pathname);
  const alternateLocale: Locale = locale === 'en' ? 'fr' : 'en';
  const languageHref =
    alternateHref ??
    (destinationId === null
      ? `/${alternateLocale}`
      : destinationHref(destinationId, alternateLocale));
  const sectionLabel =
    destinationId === null
      ? dictionary.shell.homeLabel
      : destinationById(destinationId).label[locale];
  const contextLabel =
    currentTitle === null ? sectionLabel : `${sectionLabel} · ${currentTitle}`;

  return (
    <>
      <a className="aks-skip-link" href="#experience-outlet">
        {dictionary.shell.skipToContent}
      </a>

      <header className="aks-experience-shell">
        <Container width="wide">
          <div className="aks-experience-shell-inner">
            <BrandSignature
              aria-label={locale === 'fr' ? 'AkikSystems, accueil' : 'AkikSystems, home'}
              href={`/${locale}`}
            />

            <nav
              aria-label={dictionary.shell.navigationLabel}
              className="aks-experience-nav"
            >
              <Link
                aria-current={destinationId === null ? 'page' : undefined}
                href={`/${locale}`}
              >
                {dictionary.shell.homeLabel}
              </Link>
              {globalDestinations.map((destination) => (
                <Link
                  aria-current={destinationId === destination.id ? 'page' : undefined}
                  href={destinationHref(destination.id, locale)}
                  key={destination.id}
                >
                  {destination.label[locale]}
                </Link>
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
                <Link
                  aria-current={destinationId === null ? 'page' : undefined}
                  href={`/${locale}`}
                >
                  {dictionary.shell.homeLabel}
                </Link>
                {globalDestinations.map((destination) => (
                  <Link
                    aria-current={destinationId === destination.id ? 'page' : undefined}
                    href={destinationHref(destination.id, locale)}
                    key={destination.id}
                  >
                    {destination.label[locale]}
                  </Link>
                ))}
              </nav>
            </details>

            <div className="aks-experience-meta">
              <Text
                aria-label={dictionary.shell.currentContextLabel}
                className="aks-experience-context"
                size="sm"
                tone="muted"
              >
                {contextLabel}
              </Text>
              <Link
                href={languageHref}
                hrefLang={alternateLocale}
                lang={alternateLocale}
              >
                {alternateLocale === 'fr' ? 'Français' : 'English'}
              </Link>
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
