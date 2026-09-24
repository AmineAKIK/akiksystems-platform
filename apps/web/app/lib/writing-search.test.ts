import { describe, expect, it } from 'vitest';

import {
  normalizeWritingSearchQuery,
  writingSearchQueryMaxLength,
} from './writing-search';

describe('AKS-116 Writing search query normalization', () => {
  it('normalizes whitespace without changing reader language', () => {
    expect(
      normalizeWritingSearchQuery('  attention\n\t systèmes   réels  '),
    ).toBe('attention systèmes réels');
  });

  it('keeps web-search syntax for PostgreSQL websearch_to_tsquery', () => {
    expect(
      normalizeWritingSearchQuery('"quiet systems" -noise OR architecture'),
    ).toBe('"quiet systems" -noise OR architecture');
  });

  it('caps abusive query length before it reaches PostgreSQL', () => {
    expect(normalizeWritingSearchQuery('x'.repeat(500))).toHaveLength(
      writingSearchQueryMaxLength,
    );
  });
});
