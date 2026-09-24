import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { WritingFilterModel } from '../lib/writing-filters';

import { WritingsFilters } from './writings-filters';

function model(
  overrides: Partial<WritingFilterModel> = {},
): WritingFilterModel {
  return {
    enabled: true,
    threshold: 6,
    totalCount: 8,
    resultCount: 2,
    selection: {
      kind: 'note',
      category: 'engineering',
      tag: null,
    },
    kinds: [
      { value: 'note', label: 'Note', count: 3 },
      { value: 'article', label: 'Article', count: 3 },
      { value: 'essay', label: 'Essay', count: 2 },
    ],
    categories: [
      { value: 'attention', label: 'Attention', count: 4 },
      { value: 'engineering', label: 'Engineering', count: 4 },
    ],
    tags: [
      { value: 'architecture', label: 'Architecture', count: 5 },
      { value: 'practice', label: 'Practice', count: 3 },
    ],
    ...overrides,
  };
}

describe('WritingsFilters', () => {
  it('renders nothing while the volume gate is closed', () => {
    expect(
      renderToStaticMarkup(
        <WritingsFilters
          locale="en"
          model={model({
            enabled: false,
            totalCount: 5,
            resultCount: 5,
            selection: { kind: null, category: null, tag: null },
          })}
        />,
      ),
    ).toBe('');
  });

  it('keeps filtering on the unified route and groups category/tag as themes', () => {
    const html = renderToStaticMarkup(
      <WritingsFilters locale="en" model={model()} />,
    );

    expect(html).toContain('data-writing-filters');
    expect(html).toContain('action="/en/writings"');
    expect(html).toContain('name="type"');
    expect(html).toContain('name="category"');
    expect(html).toContain('name="tag"');
    expect(html).toContain('<legend>Themes</legend>');
    expect(html).toContain('Engineering (4)');
    expect(html).toContain('Architecture (5)');
    expect(html).toContain('2 of 8 writings');
    expect(html).toContain('href="/en/writings"');
  });

  it('localizes the same filter surface in French', () => {
    const html = renderToStaticMarkup(
      <WritingsFilters
        locale="fr"
        model={model({
          selection: { kind: 'essay', category: null, tag: 'practice' },
        })}
      />,
    );

    expect(html).toContain('action="/fr/ecrits"');
    expect(html).toContain('Affiner le flux');
    expect(html).toContain('<legend>Thèmes</legend>');
    expect(html).toContain('Essai (2)');
    expect(html).toContain('Effacer les filtres');
    expect(html).toContain('2 sur 8 écrits');
  });
});
