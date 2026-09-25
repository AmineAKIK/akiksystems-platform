import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { HomePortal } from './home';

describe('HomePortal', () => {
  it('exposes the AkikSystems identity and all five English doors in SSR markup', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <HomePortal locale="en" />
      </MemoryRouter>,
    );

    expect(html).toContain('class="aks-home-portal"');
    expect(html).toContain('id="aks-home-title"');
    expect(html).toContain('>AkikSystems</h1>');
    expect(html).toContain('>Systemic scale</p>');
    expect(html).toContain('aria-label="Time in Paris"');
    expect(html).toContain('aria-label="View in French"');
    expect(html).toContain('href="/fr"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('Products · Projects · Live');
    expect(html).toContain('aria-label="Explore AkikSystems"');

    for (const [href, label] of [
      ['/en/profile', 'Profile'],
      ['/en/systems', 'Systems'],
      ['/en/writings', 'Writings'],
      ['/en/learning', 'Learning'],
      ['/en/work-with-us', 'Work with us'],
    ]) {
      expect(html).toContain(`href="${href}"`);
      expect(html).toContain(`>${label}</span>`);
    }
  });

  it('keeps the same five-door model fully localized in French', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <HomePortal locale="fr" />
      </MemoryRouter>,
    );

    expect(html).toContain('aria-label="Explorer AkikSystems"');
    expect(html).toContain('aria-label="Afficher en anglais"');
    expect(html).toContain('href="/en"');

    for (const [href, label] of [
      ['/fr/profil', 'Profil'],
      ['/fr/systems', 'Systèmes'],
      ['/fr/ecrits', 'Écrits'],
      ['/fr/apprentissage', 'Apprentissage'],
      ['/fr/travailler-ensemble', 'Travailler ensemble'],
    ]) {
      expect(html).toContain(`href="${href}"`);
      expect(html).toContain(`>${label}</span>`);
    }
  });
});
