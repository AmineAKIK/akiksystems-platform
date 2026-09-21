import { describe, expect, it } from 'vitest';

import { validateSystemPublicationReadiness } from './system-publication-readiness.js';

describe('System publication readiness', () => {
  it('accepts a complete localized System', () => {
    expect(
      validateSystemPublicationReadiness({
        slug: 'sentinel',
        title: 'Sentinel',
        summary: 'Operational visibility system.',
        presentationDocument: {
          version: 1,
          blocks: [
            {
              type: 'paragraph',
              text: 'Sentinel provides operational visibility.',
            },
          ],
        },
      }),
    ).toEqual({
      ready: true,
      errors: [],
    });
  });

  it('returns understandable errors for incomplete localization', () => {
    const result = validateSystemPublicationReadiness({
      slug: null,
      title: '   ',
      summary: null,
      presentationDocument: null,
    });

    expect(result.ready).toBe(false);
    expect(result.errors).toEqual([
      'Slug is required before publication.',
      'Title is required before publication.',
      'Summary is required before publication.',
      'Presentation document is required before publication.',
    ]);
  });

  it('rejects an invalid slug', () => {
    const result = validateSystemPublicationReadiness({
      slug: 'Sentinel Project',
      title: 'Sentinel',
      summary: 'Summary',
      presentationDocument: {
        version: 1,
        blocks: [{ type: 'paragraph', text: 'Content' }],
      },
    });

    expect(result.ready).toBe(false);
    expect(result.errors).toContain(
      'Slug must use lowercase letters, numbers, and single hyphens only.',
    );
  });

  it('requires at least one presentation block', () => {
    const result = validateSystemPublicationReadiness({
      slug: 'sentinel',
      title: 'Sentinel',
      summary: 'Summary',
      presentationDocument: {
        version: 1,
        blocks: [],
      },
    });

    expect(result.ready).toBe(false);
    expect(result.errors).toContain(
      'Presentation document must contain at least one block before publication.',
    );
  });
});
