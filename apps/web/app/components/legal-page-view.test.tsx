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

  it('documents the Work with us inquiry privacy flow in both locales', () => {
    const privacy = legalPageById('privacy');
    const english = JSON.stringify(privacy.content.en);
    const french = JSON.stringify(privacy.content.fr);

    expect(privacy.content.en.updatedAtIso).toBe('2026-09-26');
    expect(privacy.content.fr.updatedAtIso).toBe('2026-09-26');

    expect(english).toContain('name, email address, optional organisation, free-form message');
    expect(english).toContain('authenticated administration');
    expect(english).toContain('current integration supports Resend');
    expect(english).toContain('does not currently enforce an automatic time-based deletion deadline');
    expect(english).toContain('Marking an inquiry as handled');
    expect(english).not.toContain('Public pages do not contain a contact form');

    expect(french).toContain('nom');
    expect(french).toContain('adresse électronique');
    expect(french).toContain('administration authentifiée');
    expect(french).toContain('prend en charge Resend');
    expect(french).toContain('aucune échéance automatique de suppression');
    expect(french).toContain('Marquer une demande comme traitée');
    expect(french).not.toContain('ne comportent ni formulaire de contact');
  });

  it('renders the privacy revision date from the policy content', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/en/privacy']}>
        <LegalPageView
          content={legalPageById('privacy').content.en}
          id="privacy"
          locale="en"
        />
      </MemoryRouter>,
    );

    expect(html).toContain('<time dateTime="2026-09-26">26 September 2026</time>');
    expect(html).toContain('Work with us inquiries');
    expect(html).toContain('Listen to my message');
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
