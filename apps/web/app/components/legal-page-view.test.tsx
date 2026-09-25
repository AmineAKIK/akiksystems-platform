import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { legalPageById, legalPageHref } from '../i18n/legal-pages';
import { legalPageMeta } from '../routes/legal-page';
import { LegalPageView } from './legal-page-view';

describe('legal pages', () => {
  it('keeps every public legal URL explicit and localized', () => {
    expect(legalPageHref('privacy', 'en')).toBe('/en/privacy');
    expect(legalPageHref('privacy', 'fr')).toBe('/fr/confidentialite');
    expect(legalPageHref('legal', 'en')).toBe('/en/legal-notice');
    expect(legalPageHref('legal', 'fr')).toBe('/fr/mentions-legales');
    expect(legalPageHref('cookies', 'en')).toBe('/en/cookies');
    expect(legalPageHref('cookies', 'fr')).toBe('/fr/cookies');
  });

  it('publishes canonical, reciprocal locale, and x-default metadata', () => {
    const metadata = legalPageMeta('privacy', 'fr');
    expect(metadata).toContainEqual({
      tagName: 'link',
      rel: 'canonical',
      href: 'https://akiksystems.com/fr/confidentialite',
    });
    expect(metadata).toContainEqual({
      tagName: 'link',
      rel: 'alternate',
      hrefLang: 'en',
      href: 'https://akiksystems.com/en/privacy',
    });
    expect(metadata).toContainEqual({
      tagName: 'link',
      rel: 'alternate',
      hrefLang: 'x-default',
      href: 'https://akiksystems.com/en/privacy',
    });
  });

  it('renders a semantic French document with navigation and dated policy content', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/fr/cookies']}>
        <LegalPageView content={legalPageById('cookies').content.fr} id="cookies" locale="fr" />
      </MemoryRouter>,
    );

    expect(html).toContain('<main class="aks-legal-page" data-legal-page="cookies">');
    expect(html).toContain('<article class="aks-legal-document">');
    expect(html).toContain('<h1');
    expect(html).toContain('Politique relative aux cookies');
    expect(html).toContain('aria-label="Sommaire"');
    expect(html).toContain('<time dateTime="2026-09-25">25 septembre 2026</time>');
    expect(html).toContain('HttpOnly');
    expect(html).toContain('href="/fr/confidentialite"');
  });
});
