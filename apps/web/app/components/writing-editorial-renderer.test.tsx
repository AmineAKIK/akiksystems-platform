import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { WritingDocument } from '@akiksystems/core';
import type { WritingPublicationAsset } from '@akiksystems/db';

import { WritingEditorialRenderer } from './writing-editorial-renderer';

const assetA = '00000000-0000-4000-8000-000000000109';
const assetB = '00000000-0000-4000-8000-000000000110';

const document: WritingDocument = {
  version: 1,
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'Intro <script>alert(1)</script>' }],
    },
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: 'Section two' }],
    },
    {
      type: 'heading',
      attrs: { level: 3 },
      content: [{ type: 'text', text: 'Section three' }],
    },
    {
      type: 'bulletList',
      content: [
        {
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Bullet item' }],
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
              content: [{ type: 'text', text: 'Ordered item' }],
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
      attrs: { language: 'typescript' },
      content: [{ type: 'text', text: 'const safe = true;' }],
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
  ],
};

const assets: WritingPublicationAsset[] = [
  {
    id: assetA,
    mimeType: 'image/png',
    altText: 'Architecture diagram',
    caption: 'Controlled architecture',
    width: 1200,
    height: 800,
  },
  {
    id: assetB,
    mimeType: 'image/webp',
    altText: 'Evidence view',
    caption: null,
    width: 900,
    height: 600,
  },
];

describe('WritingEditorialRenderer', () => {
  it('maps schema v1 to controlled semantic HTML', () => {
    const html = renderToStaticMarkup(
      <WritingEditorialRenderer
        assetHref={(assetId, width) =>
          width === undefined
            ? `/media/${assetId}`
            : `/media/${assetId}?width=${width}`
        }
        assets={assets}
        document={document}
        locale="en"
        responsiveImages
      />,
    );

    expect(html).toContain('data-writing-document-version="1"');
    expect(html).toContain('data-writing-node="paragraph"');
    expect(html).toContain('<h2');
    expect(html).toContain('Section two</h2>');
    expect(html).toContain('<h3');
    expect(html).toContain('<ul');
    expect(html).toContain('<ol');
    expect(html).toContain('<blockquote');
    expect(html).toContain('<pre');
    expect(html).toContain('<code>const safe = true;</code>');
    expect(html).toContain('data-language="typescript"');
    expect(html).toContain('<aside');
    expect(html).toContain('aria-label="Callout"');
    expect(html).toContain('role="group"');
    expect(html).toContain('aria-label="Image gallery"');
    expect(html).toContain('alt="Architecture diagram"');
    expect(html).toContain('<figcaption>Controlled architecture</figcaption>');
    expect(html).toContain(`src="/media/${assetA}"`);
    expect(html).toContain(`/media/${assetA}?width=320 320w`);
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>');
  });

  it('keeps a corrupt media reference inside a controlled fallback', () => {
    const html = renderToStaticMarkup(
      <WritingEditorialRenderer
        assetHref={(assetId) => `/media/${assetId}`}
        assets={[]}
        document={{
          version: 1,
          type: 'doc',
          content: [{ type: 'image', attrs: { assetId: assetA } }],
        }}
        locale="fr"
      />,
    );

    expect(html).toContain('Média indisponible.');
    expect(html).not.toContain('<img');
  });
});
