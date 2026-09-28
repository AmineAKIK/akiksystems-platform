import type { Locale } from './locales';

export const legalPageIds = ['privacy', 'legal', 'cookies'] as const;
export type LegalPageId = (typeof legalPageIds)[number];

export interface LegalNavigationPage {
  id: LegalPageId;
  slug: Record<Locale, string>;
  label: Record<Locale, string>;
  description: Record<Locale, string>;
}

export const legalNavigationPages: readonly LegalNavigationPage[] = [
  {
    id: 'privacy',
    slug: { en: 'privacy', fr: 'confidentialite' },
    label: { en: 'Privacy', fr: 'Confidentialité' },
    description: {
      en: 'How AkikSystems handles personal data across public browsing and private administration.',
      fr: 'Comment AkikSystems traite les données personnelles sur le site et dans l’administration.',
    },
  },
  {
    id: 'legal',
    slug: { en: 'legal-notice', fr: 'mentions-legales' },
    label: { en: 'Legal notice', fr: 'Mentions légales' },
    description: {
      en: 'Publisher, hosting, intellectual property, and service responsibility information.',
      fr: 'Informations sur l’éditeur, l’hébergement, la propriété intellectuelle et la responsabilité.',
    },
  },
  {
    id: 'cookies',
    slug: { en: 'cookies', fr: 'cookies' },
    label: { en: 'Cookies', fr: 'Cookies' },
    description: {
      en: 'How essential cookies and similar storage are used by AkikSystems.',
      fr: 'Comment AkikSystems utilise les cookies essentiels et stockages similaires.',
    },
  },
];

export function legalPageHref(id: LegalPageId, locale: Locale): string {
  const page = legalNavigationPages.find((candidate) => candidate.id === id);
  if (page === undefined) throw new Error(`Unknown legal page: ${id}`);
  return `/${locale}/${page.slug[locale]}`;
}
