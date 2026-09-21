import type { ReactNode } from 'react';
import { Container, Link, Text } from '@akiksystems/ui';

import { dictionaryFor, type Locale } from '../i18n/locales';

export interface ExperienceShellProps {
  locale: Locale;
  pathname: string;
  alternateHref?: string | null;
  currentTitle?: string | null;
  children: ReactNode;
}

function activeSection(pathname: string): 'home' | 'about' | 'systems' {
  const segments = pathname.split('/').filter(Boolean);

  if (segments[1] === 'about') {
    return 'about';
  }

  if (segments[1] === 'systems') {
    return 'systems';
  }

  return 'home';
}

export function ExperienceShell({
  locale,
  pathname,
  alternateHref = null,
  currentTitle = null,
  children,
}: ExperienceShellProps) {
  const dictionary = dictionaryFor(locale);
  const section = activeSection(pathname);
  const alternateLocale: Locale = locale === 'en' ? 'fr' : 'en';
  const languageHref = alternateHref ?? `/${alternateLocale}`;
  const sectionLabel =
    section === 'systems'
      ? dictionary.shell.systemsLabel
      : section === 'about'
        ? dictionary.shell.aboutLabel
        : dictionary.shell.homeLabel;
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
            <Link className="aks-experience-brand" href={`/${locale}`}>
              {dictionary.brand}
            </Link>

            <nav
              aria-label={dictionary.shell.navigationLabel}
              className="aks-experience-nav"
            >
              <Link
                aria-current={section === 'home' ? 'page' : undefined}
                href={`/${locale}`}
              >
                {dictionary.shell.homeLabel}
              </Link>
              <Link
                aria-current={section === 'about' ? 'page' : undefined}
                href={`/${locale}/about`}
              >
                {dictionary.shell.aboutLabel}
              </Link>
            </nav>

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
