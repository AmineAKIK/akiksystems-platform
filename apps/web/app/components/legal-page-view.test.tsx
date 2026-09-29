import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { legalPageById, legalPageHref, legalPageIds } from '../i18n/legal-pages';
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

  it('keeps the legal pages unindexed while they are in preparation', () => {
    const metadata = legalPageMeta('privacy', 'fr');
    expect(metadata).toContainEqual({ title: 'Confidentialité · AkikSystems' });
    expect(metadata).toContainEqual(expect.objectContaining({ name: 'robots' }));
    expect(metadata).not.toContainEqual(expect.objectContaining({ rel: 'canonical' }));
  });

  it('documents the code-only privacy contract in both locales', () => {
    const privacy = legalPageById('privacy');
    const english = JSON.stringify(privacy.content.en);
    const french = JSON.stringify(privacy.content.fr);

    expect(privacy.content.en.updatedAtIso).toBe('2026-09-29');
    expect(privacy.content.fr.updatedAtIso).toBe('2026-09-29');

    expect(english).toContain('No application database');
    expect(english).toContain('does not currently provide a server-side contact form');
    expect(english).not.toContain('authenticated administration');
    expect(english).not.toContain('Resend');

    expect(french).toContain('Aucune base de données applicative');
    expect(french).toContain('aucun formulaire de contact traité côté serveur');
    expect(french).not.toContain('administration authentifiée');
  });

  it('names OVHcloud as the only host', () => {
    for (const id of ['privacy', 'legal'] as const) {
      for (const locale of ['en', 'fr'] as const) {
        expect(JSON.stringify(legalPageById(id).content[locale])).toContain('OVHcloud (OVH SAS)');
      }
    }

    expect(JSON.stringify(legalPageById('legal').content.fr)).toContain(
      '2 rue Kellermann, 59100 Roubaix, France',
    );

    // Built from parts so the repository-wide search for the retired host stays empty.
    const retiredHost = new RegExp(['rail', 'way'].join(''), 'i');
    for (const id of legalPageIds) {
      expect(JSON.stringify(legalPageById(id).content)).not.toMatch(retiredHost);
    }
  });

  it('renders the privacy revision date from the policy content', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/en/privacy']}>
        <LegalPageView content={legalPageById('privacy').content.en} id="privacy" locale="en" />
      </MemoryRouter>,
    );

    expect(html).toContain('<time dateTime="2026-09-29">29 September 2026</time>');
    expect(html).toContain('No application database');
  });

  it('renders a semantic French cookie document without an administration cookie', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/fr/cookies']}>
        <LegalPageView content={legalPageById('cookies').content.fr} id="cookies" locale="fr" />
      </MemoryRouter>,
    );

    expect(html).toContain('<main class="aks-legal-page" data-legal-page="cookies">');
    expect(html).toContain('<article class="aks-legal-document">');
    expect(html).toContain('Politique relative aux cookies');
    expect(html).toContain('aria-label="Sommaire"');
    expect(html).toContain('<time dateTime="2026-09-29">29 septembre 2026</time>');
    expect(html).not.toContain('HttpOnly');
    expect(html).toContain('href="/fr/confidentialite"');
  });
});
