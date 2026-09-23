import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { PublishedWritingListItem } from '@akiksystems/db';

import { WritingsFeed } from './writings-feed';

function writing(
  input: Pick<
    PublishedWritingListItem,
    'writingId' | 'kind' | 'slug' | 'title' | 'summary' | 'publishedAt'
  >,
): PublishedWritingListItem {
  return {
    version: 5,
    writingId: input.writingId,
    locale: 'en',
    slug: input.slug,
    title: input.title,
    summary: input.summary,
    body: input.summary,
    document: {
      version: 1,
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: input.summary }],
        },
      ],
    },
    kind: input.kind,
    editorialWeight:
      input.kind === 'essay'
        ? 'major'
        : input.kind === 'article'
          ? 'featured'
          : 'normal',
    editorialPosition: 0,
    categoryIds: [],
    tagIds: [],
    systemIds: [],
    assets: [],
    publishedAt: input.publishedAt,
    categories: [],
    tags: [],
    systems: [],
  };
}

describe('WritingsFeed', () => {
  it('keeps Note, Article, and Essay in one ordered editorial feed', () => {
    const html = renderToStaticMarkup(
      <WritingsFeed
        emptyMessage="No writing is published yet."
        locale="en"
        writings={[
          writing({
            writingId: '00000000-0000-4000-8000-000000000001',
            kind: 'essay',
            slug: 'deep-essay',
            title: 'Deep Essay',
            summary: 'Long-form reflection.',
            publishedAt: new Date('2026-09-20T12:00:00.000Z'),
          }),
          writing({
            writingId: '00000000-0000-4000-8000-000000000002',
            kind: 'note',
            slug: 'fresh-note',
            title: 'Fresh Note',
            summary: 'A concise observation.',
            publishedAt: new Date('2026-09-23T12:00:00.000Z'),
          }),
          writing({
            writingId: '00000000-0000-4000-8000-000000000003',
            kind: 'article',
            slug: 'middle-article',
            title: 'Middle Article',
            summary: 'A developed explanation.',
            publishedAt: new Date('2026-09-21T12:00:00.000Z'),
          }),
        ]}
      />,
    );

    expect((html.match(/data-writing-feed=/g) ?? []).length).toBe(1);
    expect((html.match(/data-writing-kind=/g) ?? []).length).toBe(3);
    expect(html).toContain('data-writing-kind="note"');
    expect(html).toContain('data-writing-kind="article"');
    expect(html).toContain('data-writing-kind="essay"');

    expect(html.indexOf('Deep Essay')).toBeLessThan(html.indexOf('Fresh Note'));
    expect(html.indexOf('Fresh Note')).toBeLessThan(html.indexOf('Middle Article'));

    expect(html).toContain('href="/en/writings/fresh-note"');
    expect(html).toContain('href="/en/writings/middle-article"');
    expect(html).toContain('href="/en/writings/deep-essay"');
    expect(html).not.toContain('/notes/');
    expect(html).not.toContain('/articles/');
    expect(html).not.toContain('/essays/');
  });

  it('maps editorial weight to fixed composition hooks without reader-facing labels', () => {
    const html = renderToStaticMarkup(
      <WritingsFeed
        emptyMessage="No writing."
        locale="en"
        writings={[
          writing({
            writingId: '00000000-0000-4000-8000-000000000004',
            kind: 'note',
            slug: 'normal-note',
            title: 'Normal Note',
            summary: 'Normal composition.',
            publishedAt: new Date('2026-09-23T12:00:00.000Z'),
          }),
          writing({
            writingId: '00000000-0000-4000-8000-000000000006',
            kind: 'article',
            slug: 'featured-article',
            title: 'Featured Article',
            summary: 'Featured composition.',
            publishedAt: new Date('2026-09-22T12:00:00.000Z'),
          }),
          writing({
            writingId: '00000000-0000-4000-8000-000000000007',
            kind: 'essay',
            slug: 'major-essay',
            title: 'Major Essay',
            summary: 'Major composition.',
            publishedAt: new Date('2026-09-21T12:00:00.000Z'),
          }),
        ]}
      />,
    );

    expect(html).toContain('data-editorial-weight="normal"');
    expect(html).toContain('data-editorial-weight="featured"');
    expect(html).toContain('data-editorial-weight="major"');
    expect(html).not.toContain('Major weight');
    expect(html).not.toContain('Featured weight');
    expect(html).not.toContain('Normal weight');
  });

  it('keeps the same surface localized in French', () => {
    const item = writing({
      writingId: '00000000-0000-4000-8000-000000000005',
      kind: 'essay',
      slug: 'essai-francais',
      title: 'Essai français',
      summary: 'Une réflexion longue.',
      publishedAt: new Date('2026-09-23T12:00:00.000Z'),
    });
    item.locale = 'fr';

    const html = renderToStaticMarkup(
      <WritingsFeed
        emptyMessage="Aucun écrit n’est encore publié."
        locale="fr"
        writings={[item]}
      />,
    );

    expect(html).toContain('aria-label="Flux éditorial"');
    expect(html).toContain('Essai');
    expect(html).toContain('href="/fr/ecrits/essai-francais"');
    expect(html).toContain('23 sept. 2026');
  });
});
