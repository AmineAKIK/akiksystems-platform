import { describe, expect, it } from 'vitest';

import {
  legalPageDefinition,
  legalPageDefinitions,
  legalPageHref,
  orderedPublishedLegalPageDefinitions,
} from './legal-pages';

describe('legal page routing contract', () => {
  it('keeps explicit bilingual utility slugs stable and unique', () => {
    expect(legalPageDefinitions).toEqual([
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
    ]);

    expect(new Set(legalPageDefinitions.map(({ slug }) => slug.en)).size).toBe(3);
    expect(new Set(legalPageDefinitions.map(({ slug }) => slug.fr)).size).toBe(3);
  });

  it('builds only the intended explicit public hrefs', () => {
    expect(legalPageHref('privacy', 'en')).toBe('/en/privacy');
    expect(legalPageHref('privacy', 'fr')).toBe('/fr/confidentialite');
    expect(legalPageHref('legal', 'en')).toBe('/en/legal-notice');
    expect(legalPageHref('legal', 'fr')).toBe('/fr/mentions-legales');
    expect(legalPageHref('cookies', 'en')).toBe('/en/cookies');
    expect(legalPageHref('cookies', 'fr')).toBe('/fr/cookies');
  });

  it('orders utility navigation by code-owned page identity, not publication order', () => {
    expect(
      orderedPublishedLegalPageDefinitions(['cookies', 'privacy']).map(
        ({ key }) => key,
      ),
    ).toEqual(['privacy', 'cookies']);

    expect(legalPageDefinition('legal').label.fr).toBe('Mentions légales');
  });
});
