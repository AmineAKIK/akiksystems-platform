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
      expect(html).toContain('data-systems-section="sentinel"');
      expect(html).toContain('data-systems-section="operation"');
      expect(html).toContain('data-systems-section="manifesto"');
      expect(html).toContain('data-systems-section="workbench"');
      expect(html).toContain('data-systems-section="perspectives"');

      for (const station of systemsPageContent[locale].stations) {
        expect(html).toMatch(new RegExp(`<h3>(<a [^>]*>)?${station.name}`));
        if (station.href !== undefined) expect(html).toContain(`href="${station.href}"`);
      }

      for (const tool of systemsPageContent[locale].workbench.tools) {
        expect(html).toContain(`>${tool.name}</strong>`);
      }
    },
  );

  it.each(['fr', 'en'] as const)('offers only working actions in %s', (locale) => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <SystemsPage locale={locale} content={systemsPageContent[locale]} />
      </MemoryRouter>,
    );

    expect(html).toContain('href="https://sentinel.akiksystems.fr"');
    expect(html).toContain('href="https://protocap.akiksystems.com"');
    expect(html).toContain('href="mailto:contact@akiksystems.com?subject=');
    expect(html).not.toContain('aria-disabled');
    expect(html).not.toContain('href="#"');
    expect(html).toContain(`aria-label="${systemsPageContent[locale].railLabel}"`);
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
