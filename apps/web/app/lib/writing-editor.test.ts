import { describe, expect, it } from 'vitest';

import {
  parseWritingEditorDocument,
  parseWritingEditorDocumentJson,
  writingEditorDocumentForDraft,
  writingEditorDocumentFromPlainText,
  writingEditorDocumentToPlainText,
} from './writing-editor';

describe('Writing Tiptap draft document boundary', () => {
  it('converts the legacy paragraph body into the minimal Tiptap document', () => {
    const document = writingEditorDocumentFromPlainText(
      'First paragraph.\n\nSecond\nline.',
    );

    expect(document).toEqual({
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

  it('accepts only doc, paragraph, and text nodes before AKS-106', () => {
    expect(
      parseWritingEditorDocument({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Controlled copy.' }],
          },
        ],
      }),
    ).not.toBeNull();

    expect(
      parseWritingEditorDocument({
        type: 'doc',
        content: [{ type: 'heading', attrs: { level: 2 } }],
      }),
    ).toBeNull();

    expect(
      parseWritingEditorDocument({
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
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'No marks before the schema ticket.',
                marks: [{ type: 'bold' }],
              },
            ],
          },
        ],
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
      type: 'doc',
      content: [{ type: 'paragraph' }],
    });
    expect(writingEditorDocumentToPlainText(document)).toBe('');
  });
});
