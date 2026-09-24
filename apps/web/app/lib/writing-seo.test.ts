import { describe, expect, it } from 'vitest';

import { buildWritingMeta, buildWritingStructuredData } from './writing-seo';

const frenchWriting = {
  locale: 'fr' as const,
  kind: 'essay' as const,
  slug: 'architecture-sans-page-builder',
  title: 'Architecture sans page builder',
  summary: 'Un essai sur les frontières produit et contenu.',
  publishedAt: '2026-09-24T00:00:00.000Z',
  categories: [{ name: 'Architecture' }],
  tags: [{ name: 'React' }, { name: 'Systèmes' }],
  systems: [
    {
      title: 'Sentinel',
      href: '/fr/systems/sentinel',
    },
  ],
  alternate: {
    locale: 'en' as const,
    slug: 'architecture-without-page-builders',
  },
};

describe('Writing SEO', () => {
  it('builds localized canonical, hreflang, OpenGraph, article metadata, and JSON-LD', () => {
    const meta = buildWritingMeta(frenchWriting);

    expect(meta).toContainEqual({
      title: 'Architecture sans page builder · AkikSystems',
    });
    expect(meta).toContainEqual({
      tagName: 'link',
      rel: 'canonical',
      href: 'https://akiksystems.com/fr/ecrits/architecture-sans-page-builder',
    });
    expect(meta).toContainEqual({
      tagName: 'link',
      rel: 'alternate',
      hrefLang: 'en',
      href: 'https://akiksystems.com/en/writings/architecture-without-page-builders',
    });
    expect(meta).toContainEqual({
      tagName: 'link',
      rel: 'alternate',
      hrefLang: 'x-default',
      href: 'https://akiksystems.com/en/writings/architecture-without-page-builders',
    });
    expect(meta).toContainEqual({ property: 'og:type', content: 'article' });
    expect(meta).toContainEqual({
      property: 'article:published_time',
      content: frenchWriting.publishedAt,
    });
    expect(meta).toContainEqual({
      property: 'article:tag',
      content: 'React',
    });

    const structuredDescriptor = meta.find(
      (descriptor) => 'script:ld+json' in descriptor,
    );
    expect(structuredDescriptor).toEqual({
      'script:ld+json': buildWritingStructuredData(frenchWriting),
    });
  });

  it('keeps one Article schema across Note, Article, and Essay forms', () => {
    for (const kind of ['note', 'article', 'essay'] as const) {
      const data = buildWritingStructuredData({
        ...frenchWriting,
        kind,
      });

      expect(data['@type']).toBe('Article');
      expect(data.genre).toBe(
        kind === 'note' ? 'Note' : kind === 'essay' ? 'Essay' : 'Article',
      );
      expect(data.publisher).toEqual({
        '@type': 'Organization',
        name: 'AkikSystems',
        url: 'https://akiksystems.com/en',
      });
    }
  });

  it('does not invent hreflang alternates when no translated publication exists', () => {
    const meta = buildWritingMeta({
      ...frenchWriting,
      alternate: null,
    });

    expect(
      meta.some(
        (descriptor) =>
          'hrefLang' in descriptor &&
          (descriptor.hrefLang === 'en' || descriptor.hrefLang === 'x-default'),
      ),
    ).toBe(false);
  });
});
