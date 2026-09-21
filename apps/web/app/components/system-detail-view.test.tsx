import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { SystemDetailView } from './system-detail-view';

describe('SystemDetailView', () => {
  it('renders the v1 System presentation vocabulary in source order', () => {
    const html = renderToStaticMarkup(
      <SystemDetailView
        assets={[
          {
            id: 'asset-image',
            url: '/private-preview/image',
            altText: 'Sentinel dashboard',
            caption: 'Operational dashboard',
            mimeType: 'image/png',
          },
        ]}
        links={[
          {
            id: 'repository',
            kind: 'repository',
            url: 'https://example.invalid/repository',
          },
        ]}
        locale="en"
        originSummary="Industrial origin context."
        originTitle="Marelli"
        presentationDocument={{
          version: 1,
          blocks: [
            { type: 'heading', level: 2, text: 'Architecture' },
            { type: 'paragraph', text: 'A calm operational system.' },
            {
              type: 'list',
              style: 'ordered',
              items: ['Observe', 'Understand', 'Act'],
            },
            {
              type: 'code',
              code: 'pnpm build',
              language: 'bash',
            },
            {
              type: 'image',
              assetId: 'asset-image',
            },
            {
              type: 'quote',
              text: 'Evidence stays close to claims.',
              attribution: 'AkikSystems',
            },
          ],
        }}
        summary="Operational visibility without invented evidence."
        technologies={[{ id: 'typescript', name: 'TypeScript' }]}
        title="Sentinel"
      />,
    );

    expect(html).toContain(
      '<main class="aks-system-detail" id="system-content" tabindex="-1">',
    );
    expect(html).toContain('<article class="aks-system-detail-stack">');
    expect(html).toContain('<h1');
    expect(html).toContain('>Sentinel</h1>');
    expect(html).toContain('<nav aria-label="System links"');
    expect(html).toContain('<aside class="aks-system-detail-context">');
    expect(html).toContain(
      '<section aria-label="System presentation" class="aks-system-presentation">',
    );

    const heading = html.indexOf('>Architecture</h2>');
    const paragraph = html.indexOf('>A calm operational system.</p>');
    const list = html.indexOf('<ol class="aks-system-presentation-list">');
    const code = html.indexOf('<pre class="aks-system-presentation-code">');
    const image = html.indexOf('<figure class="aks-system-presentation-figure">');
    const quote = html.indexOf('<blockquote class="aks-system-presentation-quote">');

    expect(heading).toBeGreaterThan(-1);
    expect(paragraph).toBeGreaterThan(heading);
    expect(list).toBeGreaterThan(paragraph);
    expect(code).toBeGreaterThan(list);
    expect(image).toBeGreaterThan(code);
    expect(quote).toBeGreaterThan(image);

    expect(html).toContain('<li>Observe</li>');
    expect(html).toContain('<code data-language="bash">pnpm build</code>');
    expect(html).toContain(
      '<img alt="Sentinel dashboard" decoding="async" loading="lazy" sizes="(max-width: 48rem) calc(100vw - 2rem), 44rem" src="/private-preview/image"/>',
    );
    expect(html).toContain('<figcaption>Operational dashboard</figcaption>');
    expect(html).toContain('<footer>— AkikSystems</footer>');
  });

  it('renders unordered lists and localized document fallback links semantically', () => {
    const html = renderToStaticMarkup(
      <SystemDetailView
        assets={[
          {
            id: 'asset-document',
            url: '/private-preview/document',
            altText: null,
            caption: null,
            mimeType: 'application/pdf',
          },
        ]}
        links={[]}
        locale="fr"
        originSummary={null}
        originTitle={null}
        presentationDocument={{
          version: 1,
          blocks: [
            {
              type: 'list',
              style: 'unordered',
              items: ['Contexte', 'Preuves'],
            },
            { type: 'image', assetId: 'asset-document' },
          ],
        }}
        summary="Résumé"
        technologies={[]}
        title="Sentinel"
      />,
    );

    expect(html).toContain('<ul class="aks-system-presentation-list">');
    expect(html).toContain('>Ouvrir le document</a>');
    expect(html).not.toContain('<figure');
  });

  it('omits unresolved media references instead of exposing broken markup', () => {
    const html = renderToStaticMarkup(
      <SystemDetailView
        assets={[]}
        links={[]}
        locale="en"
        originSummary={null}
        originTitle={null}
        presentationDocument={{
          version: 1,
          blocks: [{ type: 'image', assetId: 'missing-asset' }],
        }}
        summary="Summary"
        technologies={[]}
        title="Sentinel"
      />,
    );

    expect(html).not.toContain('<img');
    expect(html).not.toContain('<figure');
  });
});
