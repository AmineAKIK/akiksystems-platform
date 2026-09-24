import { describe, expect, it } from 'vitest';

import type { PublishedWritingListItem } from '@akiksystems/db';

import { selectContextualRelatedWritings } from './related-writings';

function writing(
  writingId: string,
  systemIds: string[],
  editorialPosition: number,
): PublishedWritingListItem {
  return {
    version: 5,
    writingId,
    locale: 'en',
    slug: writingId,
    title: writingId,
    summary: `Summary for ${writingId}`,
    body: null,
    document: {
      version: 1,
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: `Body for ${writingId}` }],
        },
      ],
    },
    kind: 'article',
    editorialWeight: 'normal',
    editorialPosition,
    categoryIds: [],
    tagIds: [],
    systemIds,
    assets: [],
    publishedAt: new Date('2026-09-24T00:00:00.000Z'),
    categories: [],
    tags: [],
    systems: [],
  };
}

describe('selectContextualRelatedWritings', () => {
  it('keeps recommendations contextual, unique, ordered, and deliberately capped', () => {
    const current = writing('current-writing', ['sentinel', 'protocap'], 20);
    const strongest = writing(
      'strongest-context',
      ['sentinel', 'protocap'],
      30,
    );
    const earlier = writing('earlier-context', ['sentinel'], 10);
    const later = writing('later-context', ['protocap'], 40);
    const unrelated = writing('unrelated', ['oria'], 1);

    const selected = selectContextualRelatedWritings({
      currentWritingId: current.writingId,
      currentSystemIds: current.systemIds,
      candidates: [
        current,
        strongest,
        earlier,
        strongest,
        later,
        unrelated,
      ],
    });

    expect(selected.map((candidate) => candidate.writingId)).toEqual([
      'strongest-context',
      'earlier-context',
    ]);
  });

  it('returns no related Writings when the current Writing has no System context', () => {
    expect(
      selectContextualRelatedWritings({
        currentWritingId: 'current-writing',
        currentSystemIds: [],
        candidates: [writing('candidate', ['sentinel'], 0)],
      }),
    ).toEqual([]);
  });
});
