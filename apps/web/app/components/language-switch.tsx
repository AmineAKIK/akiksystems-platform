import { Link } from 'react-router';

import type { Locale } from '../i18n/locales';

/** The "EN / FR" switch shared by the Home and the experience shell. */
export function LanguageSwitch({
  className,
  locale,
  to,
}: {
  className?: string;
  locale: Locale;
  to: string;
}) {
  const alternateLocale: Locale = locale === 'en' ? 'fr' : 'en';
  const localeName = locale === 'fr' ? 'Français' : 'English';
  const alternateName = alternateLocale === 'fr' ? 'français' : 'English';

  return (
    <Link
      aria-label={
        locale === 'fr'
          ? localeName + ' actif. Afficher en ' + alternateName + '.'
          : localeName + ' active. View in ' + alternateName + '.'
      }
      className={['aks-home-language', className].filter(Boolean).join(' ')}
      hrefLang={alternateLocale}
      prefetch="intent"
      to={to}
    >
      <span aria-hidden="true" className="aks-home-language-display">
        <span className="aks-home-language-current" lang={locale}>
          {locale.toUpperCase()}
        </span>
        <span className="aks-home-language-separator">/</span>
        <span className="aks-home-language-target" lang={alternateLocale}>
          {alternateLocale.toUpperCase()}
        </span>
      </span>
    </Link>
  );
}
