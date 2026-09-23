import { describe, expect, it } from 'vitest';

import {
  parseWritingDocument,
  validateWritingDocument,
  writingDocumentAssetIds,
  writingDocumentFromPlainText,
  writingDocumentToPlainText,
} from './writing-document.js';

const assetA = '11111111-1111-4111-8111-111111111111';
const assetB = '22222222-2222-4222-8222-222222222222';

describe('Writing rich-content schema v1', () => {
  it('accepts only the evidenced v1 semantic vocabulary', () => {
    const document = {
      version: 1,
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'A controlled heading' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'A paragraph.' }],
        },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'One item' }],
                },
              ],
            },
          ],
        },
        {
          type: 'orderedList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'First item' }],
                },
              ],
            },
          ],
        },
        {
          type: 'blockquote',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Quoted evidence.' }],
            },
          ],
        },
        {
          type: 'codeBlock',
          attrs: { language: 'ts' },
          content: [{ type: 'text', text: 'const ready = true;' }],
        },
        {
          type: 'image',
          attrs: { assetId: assetA },
        },
        {
          type: 'gallery',
          content: [
            { type: 'image', attrs: { assetId: assetA } },
            { type: 'image', attrs: { assetId: assetB } },
          ],
        },
        {
          type: 'callout',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Important context.' }],
            },
          ],
        },
      ],
    };

    expect(parseWritingDocument(document)).toEqual(document);
    expect(
      writingDocumentAssetIds(document as ReturnType<typeof parseWritingDocument> & {}),
    ).toEqual([assetA, assetB]);
  });

  it('rejects page-builder semantics, marks, h1, and unjustified tables', () => {
    expect(
      validateWritingDocument({
        version: 1,
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            attrs: { style: 'display:grid' },
            content: [{ type: 'text', text: 'No layout controls.' }],
          },
        ],
      }).success,
    ).toBe(false);

    expect(
      validateWritingDocument({
        version: 1,
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'No free-form marks.',
                marks: [{ type: 'bold' }],
              },
            ],
          },
        ],
      }).success,
    ).toBe(false);

    expect(
      validateWritingDocument({
        version: 1,
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: 'The route owns H1.' }],
          },
        ],
      }).success,
    ).toBe(false);

    expect(
      validateWritingDocument({
        version: 1,
        type: 'doc',
        content: [{ type: 'table', content: [] }],
      }).errors.join(' '),
    ).toContain('Tables');

    expect(
      validateWritingDocument({
        version: 1,
        type: 'doc',
        content: [
          {
            type: 'gallery',
            content: [{ type: 'image', attrs: { assetId: assetA } }],
          },
        ],
      }).success,
    ).toBe(false);
  });

  it('keeps a plain-text compatibility projection while richer rendering is deferred', () => {
    const document = writingDocumentFromPlainText(
      'First paragraph.\n\nSecond\nline.',
    );

    expect(document.version).toBe(1);
    expect(writingDocumentToPlainText(document)).toBe(
      'First paragraph.\n\nSecond line.',
    );

    expect(
      writingDocumentToPlainText({
        version: 1,
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Heading' }],
          },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'List item' }],
                  },
                ],
              },
            ],
          },
          {
            type: 'codeBlock',
            attrs: { language: 'ts' },
            content: [{ type: 'text', text: 'const value = 1;' }],
          },
        ],
      }),
    ).toBe('Heading\n\n• List item\n\nconst value = 1;');
  });
});
