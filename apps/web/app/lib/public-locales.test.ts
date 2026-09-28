import { describe, expect, it } from 'vitest';

import { localeFromPublicHostname, publicCanonicalUrl, publicUrlForLocale } from './public-locales';

describe('public locale domains', () => {
  it('maps production hosts to their default locale', () => {
    expect(localeFromPublicHostname('akiksystems.fr')).toBe('fr');
    expect(localeFromPublicHostname('www.akiksystems.fr')).toBe('fr');
    expect(localeFromPublicHostname('akiksystems.com')).toBe('en');
    expect(localeFromPublicHostname('www.akiksystems.com')).toBe('en');
    expect(localeFromPublicHostname('localhost')).toBeNull();
  });

  it('builds locale-specific public and canonical URLs', () => {
    expect(publicUrlForLocale('fr', '/fr/profil')).toBe('https://akiksystems.fr/fr/profil');
    expect(publicCanonicalUrl('/fr/ecrits')).toBe('https://akiksystems.fr/fr/ecrits');
    expect(publicCanonicalUrl('/en/writings')).toBe('https://akiksystems.com/en/writings');
  });
});
