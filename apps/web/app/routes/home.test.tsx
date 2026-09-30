import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import {
  homeDestinationPresentation,
  homeLegalPresentation,
} from '../components/home-portal-content';
import { HomePortal, meta } from './home';

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
    expect(html).toContain('lang="en"><span class="aks-visually-hidden">Systemic Scale</span>');
    expect(html).toContain('class="aks-home-scale-letter"');
    expect(html).toContain('aria-label="Local time in Paris"');
    expect(html).toContain('class="aks-home-language-current" lang="en">EN</span>');
    expect(html).toContain('class="aks-home-language-target" lang="fr">FR</span>');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('viewBox="0 0 2048 2048"');
    expect(html).toContain('class="aks-home-nav-separator"');

    // Open doors link to a real page; doors not open yet show their status and no link.
    const englishDoors = [
      [null, 'Perspectives', 'Collaboration · Contact'],
      ['/en/profile', 'Profile', 'Journey · Vision'],
      ['/en/systems', 'Systems', 'Products · Projects'],
      [null, 'Writings', 'Essays · Notes'],
      [null, 'Learning', 'Credentials · Training'],
    ] as const;

    for (const [href, label, summary] of englishDoors) {
      if (href !== null) expect(html).toContain(`href="${href}"`);
      expect(html).toContain(`>${label}</span>`);
      expect(html).toContain(`>${summary}</span>`);
    }
    expect(html).not.toContain('href="/en/writings"');
    expect(html).not.toContain('href="/en/learning"');
    expect(html).not.toContain('href="/en/profile#contact"');
    expect(html.match(/data-state="soon"/g)).toHaveLength(3);
    expect(html).toContain('class="aks-home-door-status">In preparation</span>');

    const offsets = englishDoors.map(([, label]) => html.indexOf(`>${label}</span>`));
    expect(offsets).toEqual([...offsets].sort((first, second) => first - second));
  });

  it('uses the French handoff copy verbatim for the visible Home destinations', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <HomePortal locale="fr" />
      </MemoryRouter>,
    );

    const frenchDoors = [
      [null, 'Perspectives', 'Collaboration · Contact'],
      ['/fr/profil', 'Profil', 'Parcours · Vision'],
      ['/fr/systems', 'Systèmes', 'Produits · Projets'],
      [null, 'Écrits', 'Essais · Notes'],
      [null, 'Apprentissage', 'Certifications · Formations'],
    ] as const;

    for (const [href, label, summary] of frenchDoors) {
      if (href !== null) expect(html).toContain(`href="${href}"`);
      expect(html).toContain(`>${label}</span>`);
      expect(html).toContain(`>${summary}</span>`);
    }
    expect(html).toContain('class="aks-home-door-status">En préparation</span>');

    expect(html).toContain(
      'Parcours, convictions et pratique : les fondations de la vision AkikSystems.',
    );
    expect(html).toContain(
      'Logiciels et produits conçus en systèmes cohérents, de l’usage à l’intention.',
    );

    const offsets = frenchDoors.map(([, label]) => html.indexOf(`>${label}</span>`));
    expect(offsets).toEqual([...offsets].sort((first, second) => first - second));
  });

  it('keeps every Home preview description within 80 characters', () => {
    const presentations = [
      ...Object.values(homeDestinationPresentation),
      ...Object.values(homeLegalPresentation),
    ];

    for (const presentation of presentations) {
      for (const locale of ['en', 'fr'] as const) {
        expect(Array.from(presentation.description[locale]).length).toBeLessThanOrEqual(80);
      }
    }
  });
});

describe('Home meta contract', () => {
  it.each([
    ['en', 'https://akiksystems.com/en', 'https://akiksystems.fr/fr'],
    ['fr', 'https://akiksystems.fr/fr', 'https://akiksystems.com/en'],
  ] as const)('emits complete localized SEO metadata for %s', (locale, canonical, alternate) => {
    const descriptors = meta({ params: { locale } } as never);

    expect(descriptors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tagName: 'link', rel: 'canonical', href: canonical }),
        expect.objectContaining({ property: 'og:image:width', content: '1200' }),
        expect.objectContaining({ property: 'og:image:height', content: '630' }),
        expect.objectContaining({ name: 'twitter:card', content: 'summary_large_image' }),
        expect.objectContaining({ tagName: 'link', rel: 'alternate', href: alternate }),
        expect.objectContaining({
          'script:ld+json': expect.objectContaining({
            '@type': 'WebSite',
            name: 'AkikSystems',
          }),
        }),
      ]),
    );
  });
});
