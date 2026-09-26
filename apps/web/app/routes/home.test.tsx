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

    const englishDoors = [
      ['/en/profile', 'Profile'],
      ['/en/work-with-us', 'Work with us'],
      ['/en/writings', 'Writings'],
      ['/en/systems', 'Systems'],
      ['/en/learning', 'Learning'],
    ] as const;

    for (const [href, label] of englishDoors) {
      expect(html).toContain(`href="${href}"`);
      expect(html).toContain(`>${label}</span>`);
    }

    const englishDoorOffsets = englishDoors.map(([href]) =>
      html.indexOf(`href="${href}"`),
    );
    expect(englishDoorOffsets).toEqual(
      [...englishDoorOffsets].sort((first, second) => first - second),
    );
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

    const frenchDoors = [
      ['/fr/profil', 'Profil'],
      ['/fr/travailler-ensemble', 'Travailler ensemble'],
      ['/fr/ecrits', 'Écrits'],
      ['/fr/systems', 'Systèmes'],
      ['/fr/apprentissage', 'Apprentissage'],
    ] as const;

    for (const [href, label] of frenchDoors) {
      expect(html).toContain(`href="${href}"`);
      expect(html).toContain(`>${label}</span>`);
    }

    const frenchDoorOffsets = frenchDoors.map(([href]) =>
      html.indexOf(`href="${href}"`),
    );
    expect(frenchDoorOffsets).toEqual(
      [...frenchDoorOffsets].sort((first, second) => first - second),
    );
  });
});
