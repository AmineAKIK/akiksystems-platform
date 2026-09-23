import { describe, expect, it } from 'vitest';

import {
  parseWritingEditorDocument,
  parseWritingEditorDocumentJson,
  writingEditorDocumentForDraft,
  writingEditorDocumentFromPlainText,
  writingEditorDocumentToPlainText,
} from './writing-editor';

describe('Writing editor document boundary', () => {
  it('upgrades legacy paragraph bodies into schema v1', () => {
    const document = writingEditorDocumentFromPlainText(
      'First paragraph.\n\nSecond\nline.',
    );

    expect(document).toEqual({
      version: 1,
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'First paragraph.' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Second line.' }],
        },
      ],
    });
    expect(writingEditorDocumentToPlainText(document)).toBe(
      'First paragraph.\n\nSecond line.',
    );
  });

  it('accepts controlled rich blocks and rejects page-builder controls', () => {
    expect(
      parseWritingEditorDocument({
        version: 1,
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Controlled heading.' }],
          },
          {
            type: 'callout',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Controlled context.' }],
              },
            ],
          },
        ],
      }),
    ).not.toBeNull();

    expect(
      parseWritingEditorDocument({
        version: 1,
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            attrs: { style: 'display:grid' },
            content: [{ type: 'text', text: 'No layout controls.' }],
          },
        ],
      }),
    ).toBeNull();

    expect(
      parseWritingEditorDocument({
        version: 1,
        type: 'doc',
        content: [{ type: 'table', content: [] }],
      }),
    ).toBeNull();

    expect(
      parseWritingEditorDocument({
        type: 'doc',
        content: [{ type: 'paragraph' }],
      }),
    ).toBeNull();
  });

  it('rejects malformed or oversized JSON and falls back to legacy text', () => {
    expect(parseWritingEditorDocumentJson('{bad-json')).toBeNull();
    expect(parseWritingEditorDocumentJson('x'.repeat(500_001))).toBeNull();

    expect(
      writingEditorDocumentForDraft(null, 'Legacy body.').content,
    ).toEqual([
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Legacy body.' }],
      },
    ]);
  });

  it('keeps an empty draft as one valid empty paragraph', () => {
    const document = writingEditorDocumentFromPlainText(null);

    expect(document).toEqual({
      version: 1,
      type: 'doc',
      content: [{ type: 'paragraph' }],
    });
    expect(writingEditorDocumentToPlainText(document)).toBe('');
  });
});
