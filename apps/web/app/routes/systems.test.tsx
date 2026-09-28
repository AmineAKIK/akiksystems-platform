import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { systemsPageContent } from '../systems/content';
import { SystemsPage } from '../systems/systems-page';
import { meta } from './systems';

describe('SystemsPage code-only contract', () => {
  it.each(['fr', 'en'] as const)(
    'renders the complete local %s composition without database data',
    (locale) => {
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <SystemsPage locale={locale} content={systemsPageContent[locale]} />
        </MemoryRouter>,
      );

      expect(html).toContain('class="aks-systems-page"');
      expect(html).toContain('data-systems-section="hero"');
      expect(html).toContain('data-systems-section="atlas"');
      expect(html).toContain('data-systems-section="operation"');
      expect(html).toContain('data-systems-section="manifesto"');
      expect(html).toContain('data-systems-section="workbench"');
      expect(html).toContain('data-systems-section="perspectives"');

      for (const station of systemsPageContent[locale].stations) {
        expect(html).toContain(`>${station.name}</h3>`);
      }

      for (const tool of systemsPageContent[locale].workbench.tools) {
        expect(html).toContain(`>${tool.name}</strong>`);
      }
    },
  );

  it('keeps every public action as a real link and the main action touch-target class', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <SystemsPage locale="fr" content={systemsPageContent.fr} />
      </MemoryRouter>,
    );

    expect(html).toContain('href="#operation"');
    expect(html).toContain('href="/fr/travailler-ensemble"');
    expect(html).toContain('aks-systems-button--primary');
  });
});

describe('Systems meta contract', () => {
  it.each([
    ['en', 'https://akiksystems.com/en/systems', 'https://akiksystems.fr/fr/systems'],
    ['fr', 'https://akiksystems.fr/fr/systems', 'https://akiksystems.com/en/systems'],
  ] as const)(
    'emits localized canonical and social metadata for %s',
    (locale, canonical, alternate) => {
      const descriptors = meta({ loaderData: { locale } } as never);

      expect(descriptors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ tagName: 'link', rel: 'canonical', href: canonical }),
          expect.objectContaining({ tagName: 'link', rel: 'alternate', href: alternate }),
          expect.objectContaining({ property: 'og:image:width', content: '1200' }),
          expect.objectContaining({ name: 'twitter:card', content: 'summary_large_image' }),
          expect.objectContaining({
            'script:ld+json': expect.objectContaining({ '@type': 'CollectionPage' }),
          }),
        ]),
      );
    },
  );
});
