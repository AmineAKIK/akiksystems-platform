import { describe, expect, it } from 'vitest';

import {
  parsePresentationDocument,
  validatePresentationDocument,
} from './presentation-document.js';

describe('presentation document v1', () => {
  it('accepts the Sentinel block vocabulary', () => {
    const document = {
      version: 1,
      blocks: [
        { type: 'heading', level: 2, text: 'Context' },
        {
          type: 'paragraph',
          text: 'Sentinel supports industrial operational visibility.',
        },
        {
          type: 'list',
          style: 'unordered',
          items: ['Architecture', 'Security', 'Observability'],
        },
        {
          type: 'code',
          code: 'pnpm build',
          language: 'bash',
        },
        {
          type: 'image',
          assetId: '11111111-1111-4111-8111-111111111111',
        },
        {
          type: 'quote',
          text: 'Evidence stays close to claims.',
          attribution: null,
        },
      ],
    };

    expect(validatePresentationDocument(document)).toEqual({
      success: true,
      errors: [],
    });
    expect(parsePresentationDocument(document)).toEqual(document);
  });

  it('rejects arbitrary HTML', () => {
    const result = validatePresentationDocument({
      version: 1,
      blocks: [
        {
          type: 'paragraph',
          text: 'Safe text',
          html: '<script>alert(1)</script>',
        },
      ],
    });

    expect(result.success).toBe(false);
    expect(result.errors.join(' ')).toContain('unsupported properties');
  });

  it('rejects page-builder semantics', () => {
    const result = validatePresentationDocument({
      version: 1,
      blocks: [
        {
          type: 'heading',
          level: 2,
          text: 'Architecture',
          columns: 3,
        },
      ],
    });

    expect(result.success).toBe(false);
    expect(result.errors.join(' ')).toContain('unsupported properties');
  });

  it('rejects unknown block types', () => {
    const result = validatePresentationDocument({
      version: 1,
      blocks: [{ type: 'embed', url: 'https://example.com' }],
    });

    expect(result.success).toBe(false);
    expect(result.errors.join(' ')).toContain('heading, paragraph, list, code, image, or quote');
  });

  it('rejects unsupported document versions', () => {
    const result = validatePresentationDocument({
      version: 2,
      blocks: [],
    });

    expect(result.success).toBe(false);
    expect(result.errors.join(' ')).toContain('version must be 1');
  });

  it('rejects unknown top-level presentation controls', () => {
    const result = validatePresentationDocument({
      version: 1,
      blocks: [],
      template: 'hero-grid',
    });

    expect(result.success).toBe(false);
    expect(result.errors.join(' ')).toContain('unsupported top-level properties');
  });
});
