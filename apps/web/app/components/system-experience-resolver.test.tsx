import { systemPresentationKinds } from '@akiksystems/core';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  resolveSystemExperience,
  SystemExperience,
} from './system-experience-resolver';

describe('System Experience Resolver', () => {
  it('maps every domain presentation kind explicitly', () => {
    expect(systemPresentationKinds.map((kind) => [kind, resolveSystemExperience(kind)])).toEqual([
      ['standard', 'standard'],
      ['guided_demo', 'guided-demo'],
      ['interactive_entry', 'interactive-entry'],
    ]);
  });

  it.each(systemPresentationKinds)(
    'routes %s through one centralized renderer boundary',
    (presentationKind) => {
      const html = renderToStaticMarkup(
        <SystemExperience
          assets={[]}
          links={[]}
          locale="en"
          originSummary={null}
          originTitle={null}
          presentationDocument={{ version: 1, blocks: [] }}
          presentationKind={presentationKind}
          summary="Inspectable System."
          technologies={[]}
          title="Sentinel"
        />,
      );

      expect(html).toContain(`data-presentation-kind="${presentationKind}"`);
      expect(html).toContain('data-renderer=');
      expect(html).toContain('<main class="aks-system-detail"');
      expect(html).toContain('>Sentinel</h1>');
    },
  );
});
