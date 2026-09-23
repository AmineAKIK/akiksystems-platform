import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { PublishedWritingListItem } from '@akiksystems/db';

import { WritingsFeed } from './writings-feed';

function writing(
  writingId: string,
  kind: PublishedWritingListItem['kind'],
  slug: string,
  title: string,
  position: number,
): PublishedWritingListItem {
  return {
    version: 5,
    writingId,
    locale: 'en',
    slug,
    title,
    summary: `${title} summary`,
    body: null,
    document: { version: 1, type: 'doc', content: [] },
    kind,
    editorialWeight:
      kind === 'essay' ? 'major' : kind === 'article' ? 'featured' : 'normal',
    editorialPosition: position,
    categoryIds: [],
    tagIds: [],
    systemIds: [],
    assets: [],
    publishedAt: new Date(`2026-09-${20 + position}T12:00:00.000Z`),
    categories: [],
    tags: [],
    systems: [],
  };
}

describe('WritingsFeed', () => {
  it('keeps Notes, Articles, and Essays in one ordered editorial feed', () => {
    const html = renderToStaticMarkup(
      <WritingsFeed
        emptyMessage="No writing."
        locale="en"
        writings={[
          writing('00000000-0000-4000-8000-000000000001', 'note', 'note-one', 'Note one', 0),
          writing('00000000-0000-4000-8000-000000000002', 'article', 'article-one', 'Article one', 1),
          writing('00000000-0000-4000-8000-000000000003', 'essay', 'essay-one', 'Essay one', 2),
        ]}
      />,
    );

    expect((html.match(/data-writing-feed/g) ?? []).length).toBe(1);
    expect((html.match(/data-writing-kind=/g) ?? []).length).toBe(3);
    expect(html.indexOf('Note one')).toBeLessThan(html.indexOf('Article one'));
    expect(html.indexOf('Article one')).toBeLessThan(html.indexOf('Essay one'));
    expect(html).toContain('data-writing-kind="note"');
    expect(html).toContain('data-writing-kind="article"');
    expect(html).toContain('data-writing-kind="essay"');
    expect(html).toContain('href="/en/writings/note-one"');
    expect(html).toContain('href="/en/writings/article-one"');
    expect(html).toContain('href="/en/writings/essay-one"');
  });

  it('does not expose editorial-weight labels before AKS-111 owns visual weighting', () => {
    const html = renderToStaticMarkup(
      <WritingsFeed
        emptyMessage="No writing."
        locale="en"
        writings={[
          writing('00000000-0000-4000-8000-000000000004', 'essay', 'essay', 'Essay', 0),
        ]}
      />,
    );

    expect(html).toContain('data-editorial-weight="major"');
    expect(html).not.toContain('Major weight');
    expect(html).not.toContain('Featured weight');
    expect(html).not.toContain('Normal weight');
  });
});
