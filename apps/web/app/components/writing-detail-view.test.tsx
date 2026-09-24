import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { WritingDetailView } from './writing-detail-view';

const writing = {
  locale: 'en' as const,
  kind: 'essay' as const,
  title: 'Contextual writing',
  summary: 'A long-form Writing.',
  body: null,
  document: {
    version: 1 as const,
    type: 'doc' as const,
    content: [
      {
        type: 'paragraph' as const,
        content: [{ type: 'text' as const, text: 'Reader body.' }],
      },
    ],
  },
  assets: [],
  categories: [],
  tags: [],
  systems: [],
};

describe('WritingDetailView contextual related content', () => {
  it('keeps related Writings after the reading flow and before the return boundary', () => {
    const html = renderToStaticMarkup(
      <WritingDetailView
        assetHref={(assetId) => `/assets/${assetId}`}
        backHref="/en/writings"
        backLabel="Back to Writings"
        relatedWritings={[
          {
            writingId: 'related-1',
            kind: 'article',
            slug: 'related-article',
            title: 'Related article',
            summary: 'Connected through a published System.',
          },
        ]}
        writing={writing}
      />,
    );

    expect(html).toContain('data-contextual-related-writings="true"');
    expect(html).toContain('Continue in this context');
    expect(html).toContain('href="/en/writings/related-article"');
    expect(html.indexOf('Reader body.')).toBeLessThan(
      html.indexOf('Continue in this context'),
    );
    expect(html.indexOf('Continue in this context')).toBeLessThan(
      html.indexOf('Back to Writings'),
    );
  });

  it('does not add promotional navigation when there is no contextual match', () => {
    const html = renderToStaticMarkup(
      <WritingDetailView
        assetHref={(assetId) => `/assets/${assetId}`}
        backHref="/en/writings"
        backLabel="Back to Writings"
        writing={writing}
      />,
    );

    expect(html).not.toContain('data-contextual-related-writings');
    expect(html).not.toContain('Continue in this context');
  });
});
