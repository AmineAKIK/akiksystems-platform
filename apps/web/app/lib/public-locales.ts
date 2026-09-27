import type { Locale } from '../i18n/locales';

export const publicOrigins: Record<Locale, string> = {
  en: 'https://akiksystems.com',
  fr: 'https://akiksystems.fr',
};

export function localeFromPublicHostname(hostname: string): Locale | null {
  const normalized = hostname.toLowerCase().replace(/^www\./, '');

  if (normalized === 'akiksystems.fr') return 'fr';
  if (normalized === 'akiksystems.com') return 'en';
  return null;
}

export function publicUrlForLocale(locale: Locale, path: string): string {
  return publicOrigins[locale] + path;
}

export function publicCanonicalUrl(path: string): string {
  const locale = path === '/fr' || path.startsWith('/fr/') ? 'fr' : 'en';
  return publicUrlForLocale(locale, path);
}

export function publicLanguageHref(locale: Locale, path: string): string {
  return import.meta.env.PROD ? publicUrlForLocale(locale, path) : path;
}
