import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { WritingFilterModel } from '../lib/writing-filters';

import { WritingsSearch } from './writings-search';

function filterModel(
  selection: WritingFilterModel['selection'] = {
    kind: null,
    category: null,
    tag: null,
  },
): WritingFilterModel {
  return {
    enabled: true,
    threshold: 6,
    totalCount: 8,
    resultCount: 3,
    selection,
    kinds: [],
    categories: [],
    tags: [],
  };
}

describe('WritingsSearch', () => {
  it('renders an accessible GET search on the unified English route', () => {
    const html = renderToStaticMarkup(
      <WritingsSearch
        filterModel={filterModel()}
        locale="en"
        query=""
        resultCount={8}
      />,
    );

    expect(html).toContain('role="search"');
    expect(html).toContain('action="/en/writings"');
    expect(html).toContain('name="q"');
    expect(html).toContain('type="search"');
    expect(html).toContain('maxLength="160"');
    expect(html).not.toContain('Clear search');
  });

  it('preserves active facets and exposes result status while searching', () => {
    const html = renderToStaticMarkup(
      <WritingsSearch
        filterModel={filterModel({
          kind: 'essay',
          category: 'attention',
          tag: 'systems',
        })}
        locale="fr"
        query="maîtrise systèmes"
        resultCount={2}
      />,
    );

    expect(html).toContain('action="/fr/ecrits"');
    expect(html).toContain('name="type"');
    expect(html).toContain('value="essay"');
    expect(html).toContain('name="category"');
    expect(html).toContain('value="attention"');
    expect(html).toContain('name="tag"');
    expect(html).toContain('value="systems"');
    expect(html).toContain('2 résultats pour « maîtrise systèmes »');
    expect(html).toContain(
      'href="/fr/ecrits?type=essay&amp;category=attention&amp;tag=systems"',
    );
  });
});
