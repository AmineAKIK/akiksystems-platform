import { describe, expect, it } from 'vitest';

import { validateAssetSignature } from './asset-storage.server';

describe('asset storage signature validation', () => {
  it('accepts a PNG signature', () => {
    expect(() =>
      validateAssetSignature(
        'image/png',
        new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      ),
    ).not.toThrow();
  });

  it('accepts a PDF signature', () => {
    expect(() =>
      validateAssetSignature(
        'application/pdf',
        new TextEncoder().encode('%PDF-1.7'),
      ),
    ).not.toThrow();
  });

  it('rejects content that does not match the declared MIME type', () => {
    expect(() =>
      validateAssetSignature(
        'image/png',
        new TextEncoder().encode('<script>alert(1)</script>'),
      ),
    ).toThrow(/do not match/i);
  });
});
