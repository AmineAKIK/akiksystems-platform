import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { HomePortal } from './home';

describe('HomePortal handoff contract', () => {
  it('renders the approved English destination order and brand hierarchy', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <HomePortal locale="en" />
      </MemoryRouter>,
    );

    expect(html).toContain('class="aks-home-portal"');
    expect(html).toContain('id="aks-home-title"');
    expect(html).toContain('class="aks-home-wordmark-target">AkikSystems</span>');
    expect(html).toContain('class="aks-home-wordmark-matrix"');
    expect(html).toContain('aria-label="Systemic Scale"');
    expect(html).toContain('class="aks-home-scale-letter"');
    expect(html).toContain('aria-label="Local time in Paris"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('viewBox="0 0 2048 2048"');
    expect(html).toContain('class="aks-home-nav-separator"');

    const englishDoors = [
      ['/en/work-with-us', 'Perspectives', 'Collaboration · Contact'],
      ['/en/profile', 'Profile', 'Journey · Vision'],
      ['/en/systems', 'Systems', 'Products · Projects'],
      ['/en/writings', 'Writings', 'Essays · Notes'],
      ['/en/learning', 'Learning', 'Dossiers · Training'],
    ] as const;

    for (const [href, label, summary] of englishDoors) {
      expect(html).toContain(`href="${href}"`);
      expect(html).toContain(`>${label}</span>`);
      expect(html).toContain(`>${summary}</span>`);
    }

    const offsets = englishDoors.map(([href]) => html.indexOf(`href="${href}"`));
    expect(offsets).toEqual([...offsets].sort((first, second) => first - second));
  });

  it('uses the French handoff copy verbatim for the visible Home destinations', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <HomePortal locale="fr" />
      </MemoryRouter>,
    );

    const frenchDoors = [
      ['/fr/travailler-ensemble', 'Perspectives', 'Collaboration · Contact'],
      ['/fr/profil', 'Profil', 'Parcours · Vision'],
      ['/fr/systems', 'Systèmes', 'Produits · Projets'],
      ['/fr/ecrits', 'Écrits', 'Essais · Notes'],
      ['/fr/apprentissage', 'Apprentissage', 'Dossiers · Formations'],
    ] as const;

    for (const [href, label, summary] of frenchDoors) {
      expect(html).toContain(`href="${href}"`);
      expect(html).toContain(`>${label}</span>`);
      expect(html).toContain(`>${summary}</span>`);
    }

    expect(html).toContain(
      'Échangeons autour d’un projet, d’une collaboration ou d’une mission. Construisons ensemble ce qui mérite d’exister.',
    );
    expect(html).toContain(
      'Logiciels, produits et expériences conçus comme des systèmes cohérents. Chaque projet relie usage, technique et intention.',
    );

    const offsets = frenchDoors.map(([href]) => html.indexOf(`href="${href}"`));
    expect(offsets).toEqual([...offsets].sort((first, second) => first - second));
  });
});
