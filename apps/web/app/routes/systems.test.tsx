import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { SystemsPage } from '../components/systems/systems-page';
import { systemsPageContent } from '../content/systems-page-content';
import { meta } from './systems';

function render(locale: 'en' | 'fr') {
  return renderToStaticMarkup(
    <MemoryRouter>
      <SystemsPage locale={locale} />
    </MemoryRouter>,
  );
}

describe('Systems code-only page', () => {
  it('renders the approved French section order with one main and one h1', () => {
    const html = render('fr');

    expect((html.match(/<main\b/g) ?? []).length).toBe(1);
    expect((html.match(/<h1\b/g) ?? []).length).toBe(1);
    expect(html).toContain('ATELIER AKIKSYSTEMS');
    expect(html).toContain('ATLAS / OPS');
    expect(html).toContain('EN OPÉRATION');
    expect(html).toContain('Construire,');
    expect(html).toContain('ÉTABLI');
    expect(html).toContain('Les systèmes commencent souvent par une hypothèse.');

    const landmarks = [
      'id="atlas"',
      'id="operations"',
      'class="aks-systems-manifesto"',
      'id="workbench"',
      'id="perspectives"',
    ].map((needle) => html.indexOf(needle));

    expect(landmarks.every((offset) => offset >= 0)).toBe(true);
    expect(landmarks).toEqual([...landmarks].sort((a, b) => a - b));
  });

  it('keeps every provisional business item and generated medium explicitly marked', () => {
    const html = render('fr');
    const placeholderMediaCount = (html.match(/data-placeholder-media="true"/g) ?? []).length;
    const placeholderContentCount = (html.match(/data-placeholder-content="true"/g) ?? []).length;

    expect(placeholderMediaCount).toBe(6);
    expect(placeholderContentCount).toBeGreaterThanOrEqual(10);
    expect(systemsPageContent.fr.stations.every((station) => station.placeholder)).toBe(true);
    expect(systemsPageContent.fr.workbench.tools.every((tool) => tool.placeholder)).toBe(true);
  });

  it('loads only the hero eagerly and gives every image intrinsic dimensions', () => {
    const html = render('fr');

    expect((html.match(/loading="eager"/g) ?? []).length).toBe(1);
    expect((html.match(/fetchPriority="high"/g) ?? []).length).toBe(1);
    expect((html.match(/loading="lazy"/g) ?? []).length).toBe(5);
    expect((html.match(/<img\b/g) ?? []).length).toBe(6);
    expect((html.match(/\bwidth="\d+"/g) ?? []).length).toBeGreaterThanOrEqual(6);
    expect((html.match(/\bheight="\d+"/g) ?? []).length).toBeGreaterThanOrEqual(6);
    expect(html).not.toContain('style="');
  });

  it('keeps English and French content local with no editorial data dependency', () => {
    const fr = render('fr');
    const en = render('en');

    expect(fr).toContain('Une composition produit immersive');
    expect(en).toContain('An immersive product composition');
    expect(fr).not.toContain('No Systems are published');
    expect(en).not.toContain('Aucun système');
  });
});

describe('Systems SEO', () => {
  it.each([
    ['en', 'https://akiksystems.com/en/systems', 'https://akiksystems.fr/fr/systems'],
    ['fr', 'https://akiksystems.fr/fr/systems', 'https://akiksystems.com/en/systems'],
  ] as const)('emits localized public metadata for %s', (locale, canonical, alternate) => {
    const descriptors = meta({ loaderData: { locale } } as never);

    expect(descriptors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tagName: 'link', rel: 'canonical', href: canonical }),
        expect.objectContaining({ tagName: 'link', rel: 'alternate', href: alternate }),
        expect.objectContaining({ name: 'twitter:card', content: 'summary_large_image' }),
        expect.objectContaining({ property: 'og:image:width', content: '1200' }),
        expect.objectContaining({ property: 'og:image:height', content: '630' }),
      ]),
    );
  });
});
