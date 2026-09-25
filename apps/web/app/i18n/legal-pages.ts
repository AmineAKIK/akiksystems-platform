import {
  legalPageKeys,
  type LegalPageKey,
  type PlatformLocale,
} from '@akiksystems/core';

export interface LegalPageDefinition {
  key: LegalPageKey;
  slug: Record<PlatformLocale, string>;
  label: Record<PlatformLocale, string>;
}

export const legalPageDefinitions: readonly LegalPageDefinition[] = [
  {
    key: 'privacy',
    slug: { en: 'privacy', fr: 'confidentialite' },
    label: { en: 'Privacy', fr: 'Confidentialité' },
  },
  {
    key: 'legal',
    slug: { en: 'legal-notice', fr: 'mentions-legales' },
    label: { en: 'Legal notice', fr: 'Mentions légales' },
  },
  {
    key: 'cookies',
    slug: { en: 'cookies', fr: 'cookies' },
    label: { en: 'Cookies', fr: 'Cookies' },
  },
];

export function legalPageDefinition(key: LegalPageKey): LegalPageDefinition {
  const definition = legalPageDefinitions.find((candidate) => candidate.key === key);
  if (definition === undefined) {
    throw new Error(`Unknown legal page: ${key}`);
  }
  return definition;
}

export function legalPageHref(
  key: LegalPageKey,
  locale: PlatformLocale,
): string {
  return `/${locale}/${legalPageDefinition(key).slug[locale]}`;
}

export function orderedPublishedLegalPageDefinitions(
  keys: LegalPageKey[],
): LegalPageDefinition[] {
  const published = new Set(keys);
  return legalPageKeys.flatMap((key) =>
    published.has(key) ? [legalPageDefinition(key)] : [],
  );
}
