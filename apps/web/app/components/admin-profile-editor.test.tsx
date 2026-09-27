import { emptyProfileContent } from '@akiksystems/core/profile-content';
import type { DraftProfile, PublicProfile } from '@akiksystems/db';
import { renderToStaticMarkup } from 'react-dom/server';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';

import { ProfileAdminEditor } from './admin-profile-editor';

function fixtures() {
  const content = emptyProfileContent();
  content.hero.eyebrow = 'Profile';
  content.hero.professionalTitle = 'Systems builder';
  content.hero.introduction = 'Draft introduction.';
  content.currentProject.eyebrow = 'Current project';
  content.currentProject.roleLabel = 'Role';
  content.currentProject.role = 'Builder';
  content.stack.title = 'Stack';
  content.guidance.title = 'What guides my work';
  content.guidance.centerLabel = 'Systemic view';
  content.guidance.looks.code.title = 'Code';
  content.capabilities.title = 'Capabilities';
  content.capabilities.steps.frame.title = 'Frame';
  content.systemicScale.title = 'Systemic Scale';
  content.systemicScale.steps.read_request.title = 'Read the request';
  content.emblem.title = 'The emblem';
  content.emblem.symbols.eagle.name = 'Eagle';
  content.callToAction.title = 'Work together';

  const draft: DraftProfile = {
    id: '00000000-0000-4000-8000-000000000054',
    locale: 'en',
    displayName: 'Qualification Profile',
    portraitAssetId: null,
    portraitAltText: null,
    sourceCvAssetId: null,
    content,
    contacts: [
      {
        kind: 'email',
        value: 'profile@example.test',
        visible: true,
      },
    ],
    languages: ['en', 'fr'],
    mobility: {
      worldwide: true,
      remote: true,
      relocation: false,
    },
    currentSystemId: '00000000-0000-4000-8000-000000000001',
    stackGroups: [
      {
        id: '00000000-0000-4000-8000-000000000010',
        position: 0,
        title: 'Front-end',
        technologies: [
          {
            id: '00000000-0000-4000-8000-000000000011',
            slug: 'react',
            name: 'React',
            position: 0,
          },
        ],
      },
    ],
    systemicScaleWritingId: '00000000-0000-4000-8000-000000000020',
    editorialState: 'draft',
    publishedAt: null,
  };

  const preview: PublicProfile = {
    id: draft.id,
    locale: 'en',
    displayName: 'Qualification Profile',
    portraitAssetId: null,
    portraitAltText: null,
    sourceCvAssetId: null,
    content,
    contacts: [{ kind: 'email', value: 'profile@example.test' }],
    languages: ['en', 'fr'],
    mobility: draft.mobility,
    currentProject: {
      id: draft.currentSystemId as string,
      slug: 'system-one',
      title: 'System One',
      summary: 'Canonical System summary.',
      href: '/en/systems/system-one',
      publishedAt: new Date('2026-09-27T00:00:00Z'),
      technologies: [
        {
          id: '00000000-0000-4000-8000-000000000011',
          slug: 'react',
          name: 'React',
          position: 0,
        },
      ],
    },
    stackGroups: [
      {
        id: draft.stackGroups[0]!.id,
        position: 0,
        title: 'Front-end',
        technologies: draft.stackGroups[0]!.technologies,
        proofSystems: [
          {
            id: '00000000-0000-4000-8000-000000000001',
            slug: 'system-one',
            title: 'System One',
            summary: 'Canonical System summary.',
            href: '/en/systems/system-one',
            technologies: [
              {
                id: '00000000-0000-4000-8000-000000000011',
                slug: 'react',
                name: 'React',
                evidence: 'Published evidence.',
              },
            ],
          },
        ],
        proofCount: 1,
      },
    ],
    systemicScaleWriting: {
      id: draft.systemicScaleWritingId as string,
      locale: 'en',
      slug: 'systemic-reasoning',
      title: 'Systemic reasoning',
      href: '/en/writings/systemic-reasoning',
    },
    alternateLocale: null,
  };

  return { draft, preview };
}

describe('ProfileAdminEditor', () => {
  it('edits the public Profile composition in place while canonical data stays locked', () => {
    const { draft, preview } = fixtures();

    const router = createMemoryRouter(
      [
        {
          path: '/admin/profile',
          element: (
            <ProfileAdminEditor
              actionData={null}
              locale="en"
              preview={preview}
              profile={draft}
              publications={[]}
            />
          ),
        },
      ],
      { initialEntries: ['/admin/profile?locale=en'] },
    );

    const html = renderToStaticMarkup(<RouterProvider router={router} />);

    expect(html).toContain('data-profile-admin-contract="v1"');
    expect(html).toContain('class="aks-profile aks-admin-profile-canvas"');
    expect(html).toContain('class="aks-profile-hero');
    expect(html).toContain('class="aks-profile-stack');
    expect(html).toContain('class="aks-profile-guidance');
    expect(html).toContain('class="aks-profile-capabilities');
    expect(html).toContain('class="aks-profile-systemic-scale');
    expect(html).toContain('class="aks-profile-cta');

    expect(html).toContain('name="heroProfessionalTitle"');
    expect(html).toContain('name="currentProjectRole"');
    expect(html).toContain('name="stackGroupTitle:00000000-0000-4000-8000-000000000010"');
    expect(html).toContain('name="guidance_code_title"');
    expect(html).toContain('name="capability_frame_title"');
    expect(html).toContain('name="systemic_read_request_title"');
    expect(html).toContain('name="emblem_eagle_name"');
    expect(html).toContain('name="ctaTitle"');

    expect(html).toContain('System One');
    expect(html).toContain('System ↔ Technology evidence');
    expect(html).toContain('Writing · Systemic reasoning');
    expect(html).toContain('Global identity · edit below');

    expect(html).toContain('Save EN draft');
    expect(html).toContain('Publish EN');
    expect(html).not.toContain('workPrinciples');
    expect(html).not.toContain('technologyJourney');
  });
});
