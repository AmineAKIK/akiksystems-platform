import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import {
  resolveSystemExperience,
  SystemExperience,
} from './system-experience-resolver';

const proofTransparency = {
  role: 'System case study',
  maturity: 'Inspectable implementation',
  demoNature: 'No separate public demo',
  dataNature: 'Real-world context; no customer data exposed',
  limits: 'No deployment or measured impact is claimed.',
};

const presentationKinds = [
  'standard',
  'guided_demo',
  'interactive_entry',
] as const;

describe('System Experience Resolver', () => {
  it('maps every supported presentation kind explicitly', () => {
    expect(presentationKinds.map((kind) => [kind, resolveSystemExperience(kind)])).toEqual([
      ['standard', 'standard'],
      ['guided_demo', 'guided-demo'],
      ['interactive_entry', 'interactive-entry'],
    ]);
  });

  it.each(presentationKinds)(
    'routes %s through one centralized renderer boundary',
    (presentationKind) => {
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <SystemExperience
          assets={[]}
          links={[]}
          locale="en"
          originSummary={null}
          originTitle={null}
          proofTransparency={proofTransparency}
          presentationDocument={{ version: 1, blocks: [] }}
          presentationKind={presentationKind}
          summary="Inspectable System."
          technologies={[]}
          title="Sentinel"
          />
        </MemoryRouter>,
      );

      expect(html).toContain(`data-presentation-kind="${presentationKind}"`);
      expect(html).toContain('data-renderer=');
      expect(html).toContain('Proof transparency');
      expect(html).toContain('System case study');
      if (presentationKind === 'guided_demo') {
        expect(html).toContain('<main class="aks-guided-demo"');
        expect(html).toContain('Evidence contract');
      } else if (presentationKind === 'interactive_entry') {
        expect(html).toContain('<main class="aks-interactive-entry"');
        expect(html).toContain('AkikSystems remains your return point');
      } else {
        expect(html).toContain('<main class="aks-system-detail"');
      }
      expect(html).toContain('>Sentinel</h1>');
    },
  );
});


describe('Guided demo System experience', () => {
  it('separates implemented behavior, boundaries, hypotheses, and future integrations', () => {
    const html = renderToStaticMarkup(
      <SystemExperience
        assets={[]}
        links={[
          { id: 'demo', kind: 'demo', url: 'https://demo.example.test' },
          { id: 'repository', kind: 'repository', url: 'https://repo.example.test' },
        ]}
        locale="en"
        originSummary="Industrial operations context."
        originTitle="L'Oreal / La Roche-Posay"
        proofTransparency={proofTransparency}
        presentationDocument={{
          version: 1,
          blocks: [
            { type: 'paragraph', text: 'ProtoCap introduction.' },
            { type: 'heading', level: 2, text: 'What is implemented' },
            { type: 'list', style: 'unordered', items: ['ShiftGuide works.'] },
            { type: 'heading', level: 2, text: 'Evidence boundaries' },
            { type: 'list', style: 'unordered', items: ['Demo data is fictitious.'] },
            { type: 'heading', level: 2, text: 'Hypotheses' },
            { type: 'paragraph', text: 'Productivity gains remain hypotheses.' },
            { type: 'heading', level: 2, text: 'Future integrations' },
            { type: 'paragraph', text: 'Live plant feeds remain future work.' },
          ],
        }}
        presentationKind="guided_demo"
        summary="Interactive engineering demonstrator."
        technologies={[{ id: 'typescript', name: 'TypeScript' }]}
        title="ProtoCap"
      />,
    );

    expect(html).toContain('Try the public demo');
    expect(html).toContain('Implemented');
    expect(html).toContain('Explicit boundary');
    expect(html).toContain('Hypothesis');
    expect(html).toContain('Future integration');
    expect(html).toContain('Demo data is fictitious.');
    expect(html).toContain('Productivity gains remain hypotheses.');
    expect(html).toContain('Live plant feeds remain future work.');
    expect(html).toContain("L&#x27;Oreal / La Roche-Posay");
    expect(html).toContain('Inspectable technologies');
  });
});


describe('Interactive-entry System experience', () => {
  it('keeps the passage to the live application explicit and reversible', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <SystemExperience
        assets={[]}
        links={[
          { id: 'live', kind: 'live', url: 'https://example.test/live' },
          { id: 'repository', kind: 'repository', url: 'https://example.test/repo' },
        ]}
        locale="en"
        originSummary={null}
        originTitle={null}
        proofTransparency={proofTransparency}
        presentationDocument={{
          version: 1,
          blocks: [
            { type: 'heading', level: 2, text: 'Evidence boundaries' },
            { type: 'paragraph', text: 'No real client data is processed.' },
          ],
        }}
        presentationKind="interactive_entry"
        summary="A fictional portfolio application."
        technologies={[{ id: 'react', name: 'React' }]}
        title="Oria Nutrition"
        />
      </MemoryRouter>,
    );

    expect(html).toContain('Open Oria in a new tab');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('Back to Systems');
    expect(html).toContain('href="/en/systems"');
    expect(html).toContain('fictional, non-industrial portfolio demonstration');
    expect(html).toContain('No real client data is processed.');
    expect(html).toContain('Repository');
  });
});
