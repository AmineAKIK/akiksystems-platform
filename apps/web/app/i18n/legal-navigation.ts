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
      en: 'How the public AkikSystems site handles technical and personal data.',
      fr: 'Comment le site public AkikSystems traite les données techniques et personnelles.',
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
      en: 'Current browser-storage policy for the public AkikSystems site.',
      fr: 'Politique actuelle de stockage navigateur du site public AkikSystems.',
    },
  },
];

export function legalPageHref(id: LegalPageId, locale: Locale): string {
  const page = legalNavigationPages.find((candidate) => candidate.id === id);
  if (page === undefined) throw new Error(`Unknown legal page: ${id}`);
  return `/${locale}/${page.slug[locale]}`;
}
