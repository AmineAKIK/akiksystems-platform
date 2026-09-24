import { describe, expect, it } from 'vitest';

import type { PublishedWritingListItem } from '@akiksystems/db';

import {
  resolveWritingFilters,
  writingFilterVolumeThreshold,
} from './writing-filters';

function writing(
  index: number,
  options: {
    kind?: 'note' | 'article' | 'essay';
    category?: { slug: string; name: string } | null;
    tag?: { slug: string; name: string } | null;
  } = {},
): PublishedWritingListItem {
  const kind = options.kind ?? 'note';
  const category = options.category ?? null;
  const tag = options.tag ?? null;

  return {
    version: 5,
    writingId: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
    locale: 'en',
    slug: `writing-${index}`,
    title: `Writing ${index}`,
    summary: `Summary ${index}`,
    body: `Body ${index}`,
    document: {
      version: 1,
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: `Body ${index}` }],
        },
      ],
    },
    kind,
    editorialWeight: 'normal',
    editorialPosition: index,
    categoryIds: category === null ? [] : [`category-${category.slug}`],
    tagIds: tag === null ? [] : [`tag-${tag.slug}`],
    systemIds: [],
    assets: [],
    publishedAt: new Date(`2026-09-${String(index).padStart(2, '0')}T12:00:00.000Z`),
    categories:
      category === null
        ? []
        : [
            {
              categoryId: `category-${category.slug}`,
              locale: 'en',
              slug: category.slug,
              name: category.name,
              description: null,
            },
          ],
    tags:
      tag === null
        ? []
        : [
            {
              tagId: `tag-${tag.slug}`,
              canonicalKey: tag.slug,
              locale: 'en',
              slug: tag.slug,
              name: tag.name,
            },
          ],
    systems: [],
  };
}

describe('AKS-115 Writing filters', () => {
  it('stays absent below the publication-volume threshold and ignores crafted query params', () => {
    const writings = Array.from(
      { length: writingFilterVolumeThreshold - 1 },
      (_, index) =>
        writing(index + 1, {
          kind: index % 2 === 0 ? 'note' : 'essay',
          category:
            index % 2 === 0
              ? { slug: 'engineering', name: 'Engineering' }
              : { slug: 'attention', name: 'Attention' },
        }),
    );

    const resolved = resolveWritingFilters(
      writings,
      new URLSearchParams('type=note&category=engineering'),
    );

    expect(resolved.model.enabled).toBe(false);
    expect(resolved.model.selection).toEqual({
      kind: null,
      category: null,
      tag: null,
    });
    expect(resolved.writings).toEqual(writings);
  });

  it('also stays absent when volume is high but no dimension can refine the feed', () => {
    const writings = Array.from(
      { length: writingFilterVolumeThreshold },
      (_, index) => writing(index + 1),
    );

    const resolved = resolveWritingFilters(writings, new URLSearchParams());

    expect(resolved.model.enabled).toBe(false);
    expect(resolved.model.kinds).toHaveLength(1);
    expect(resolved.model.categories).toHaveLength(0);
    expect(resolved.model.tags).toHaveLength(0);
  });

  it('activates at justified volume and exposes counted type/category/tag theme facets', () => {
    const writings = [
      writing(1, {
        kind: 'note',
        category: { slug: 'engineering', name: 'Engineering' },
        tag: { slug: 'architecture', name: 'Architecture' },
      }),
      writing(2, {
        kind: 'article',
        category: { slug: 'engineering', name: 'Engineering' },
        tag: { slug: 'architecture', name: 'Architecture' },
      }),
      writing(3, {
        kind: 'essay',
        category: { slug: 'attention', name: 'Attention' },
        tag: { slug: 'practice', name: 'Practice' },
      }),
      writing(4, {
        kind: 'note',
        category: { slug: 'attention', name: 'Attention' },
        tag: { slug: 'practice', name: 'Practice' },
      }),
      writing(5, {
        kind: 'article',
        category: { slug: 'engineering', name: 'Engineering' },
        tag: { slug: 'practice', name: 'Practice' },
      }),
      writing(6, {
        kind: 'essay',
        category: { slug: 'attention', name: 'Attention' },
        tag: { slug: 'architecture', name: 'Architecture' },
      }),
    ];

    const resolved = resolveWritingFilters(writings, new URLSearchParams());

    expect(resolved.model.enabled).toBe(true);
    expect(resolved.model.kinds.map(({ value, count }) => [value, count])).toEqual([
      ['note', 2],
      ['article', 2],
      ['essay', 2],
    ]);
    expect(
      resolved.model.categories.map(({ value, count }) => [value, count]),
    ).toEqual([
      ['attention', 3],
      ['engineering', 3],
    ]);
    expect(resolved.model.tags.map(({ value, count }) => [value, count])).toEqual([
      ['architecture', 3],
      ['practice', 3],
    ]);
  });

  it('applies valid filters with AND semantics while ignoring unknown values', () => {
    const writings = [
      writing(1, {
        kind: 'note',
        category: { slug: 'engineering', name: 'Engineering' },
        tag: { slug: 'architecture', name: 'Architecture' },
      }),
      writing(2, {
        kind: 'article',
        category: { slug: 'engineering', name: 'Engineering' },
        tag: { slug: 'architecture', name: 'Architecture' },
      }),
      writing(3, {
        kind: 'essay',
        category: { slug: 'attention', name: 'Attention' },
        tag: { slug: 'practice', name: 'Practice' },
      }),
      writing(4, {
        kind: 'note',
        category: { slug: 'attention', name: 'Attention' },
        tag: { slug: 'practice', name: 'Practice' },
      }),
      writing(5, {
        kind: 'article',
        category: { slug: 'engineering', name: 'Engineering' },
        tag: { slug: 'practice', name: 'Practice' },
      }),
      writing(6, {
        kind: 'essay',
        category: { slug: 'attention', name: 'Attention' },
        tag: { slug: 'architecture', name: 'Architecture' },
      }),
    ];

    const filtered = resolveWritingFilters(
      writings,
      new URLSearchParams(
        'type=note&category=engineering&tag=architecture',
      ),
    );
    expect(filtered.model.resultCount).toBe(1);
    expect(filtered.writings.map((item) => item.writingId)).toEqual([
      writings[0]!.writingId,
    ]);

    const unknown = resolveWritingFilters(
      writings,
      new URLSearchParams('type=unknown&category=missing&tag=missing'),
    );
    expect(unknown.model.selection).toEqual({
      kind: null,
      category: null,
      tag: null,
    });
    expect(unknown.model.resultCount).toBe(writings.length);
  });
});
