import { emptyProfileContent } from '@akiksystems/core/profile-content';
import type { PublicProfile } from '@akiksystems/db';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { PublicProfileView } from './public-profile-view';

function profile(overrides: Partial<PublicProfile> = {}): PublicProfile {
  const content = emptyProfileContent();
  content.hero.eyebrow = 'Profile';
  content.hero.professionalTitle = 'Systems builder';
  content.hero.specialization = 'Software · operations · systems';
  content.hero.introduction = 'I build inspectable software systems.';
  content.hero.cvLabel = 'Download CV';
  content.currentProject.eyebrow = 'Current project';
  content.currentProject.roleLabel = 'Role';
  content.currentProject.role = 'Builder';
  content.currentProject.ctaLabel = 'Inspect system';
  content.stack.title = 'What I master, and where to verify it.';
  content.stack.proofCountLabel = 'Proved in';
  content.stack.inspectSystemLabel = 'Inspect system';
  content.systemicScale.title = 'Systemic Scale';
  content.systemicScale.reasoningLinkLabel = 'Read the full reasoning';
  content.callToAction.title = 'Build something useful.';
  content.callToAction.buttonLabel = 'Work with us';

  return {
    id: '00000000-0000-4000-8000-000000000054',
    locale: 'en',
    displayName: 'Qualification Profile',
    portraitAssetId: null,
    portraitAltText: null,
    sourceCvAssetId: null,
    content,
    contacts: [],
    languages: [],
    mobility: {
      worldwide: false,
      remote: false,
      relocation: false,
    },
    currentProject: null,
    stackGroups: [],
    systemicScaleWriting: null,
    alternateLocale: null,
    ...overrides,
  };
}

describe('PublicProfileView final contract', () => {
  it('renders Profile-owned narrative with live System, Stack proof and Writing references', () => {
    const base = profile();
    base.content.guidance.title = 'What guides my work';
    base.content.guidance.looks.code.title = 'Code';
    base.content.guidance.looks.code.description = 'Build for maintenance.';
    base.content.capabilities.title = 'Capabilities';
    base.content.capabilities.steps.frame.title = 'Frame';
    base.content.capabilities.steps.frame.purpose = 'Clarify the real problem.';
    base.content.emblem.title = 'The emblem';
    base.content.emblem.symbols.eagle.name = 'Eagle';
    base.content.emblem.symbols.eagle.description = 'Keep the wider view.';

    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/en/profile']}>
        <PublicProfileView
          profile={{
            ...base,
            currentProject: {
              id: 'system-one',
              slug: 'system-one',
              title: 'System One',
              summary: 'Canonical System summary.',
              href: '/en/systems/system-one',
              publishedAt: new Date('2026-09-27T00:00:00Z'),
              technologies: [
                {
                  id: 'react',
                  slug: 'react',
                  name: 'React',
                  position: 0,
                },
              ],
            },
            stackGroups: [
              {
                id: 'front-end',
                position: 0,
                title: 'Front-end',
                technologies: [
                  {
                    id: 'react',
                    slug: 'react',
                    name: 'React',
                    position: 0,
                  },
                ],
                proofSystems: [
                  {
                    id: 'system-one',
                    slug: 'system-one',
                    title: 'System One',
                    summary: 'Canonical System summary.',
                    href: '/en/systems/system-one',
                    technologies: [
                      {
                        id: 'react',
                        slug: 'react',
                        name: 'React',
                        evidence: 'Published relation evidence.',
                      },
                    ],
                  },
                ],
                proofCount: 1,
              },
            ],
            systemicScaleWriting: {
              id: 'writing-one',
              locale: 'en',
              slug: 'systemic-reasoning',
              title: 'Systemic reasoning',
              href: '/en/writings/systemic-reasoning',
            },
          }}
        />
      </MemoryRouter>,
    );

    expect(html).toContain('Qualification Profile');
    expect(html).toContain('Systems builder');
    expect(html).toContain('System One');
    expect(html).toContain('href="/en/systems/system-one"');
    expect(html).toContain('Published relation evidence.');
    expect(html).toContain('Proved in 1');
    expect(html).toContain('Read the full reasoning');
    expect(html).toContain('href="/en/writings/systemic-reasoning"');
    expect(html).toContain('What guides my work');
    expect(html).toContain('Capabilities');
    expect(html).toContain('The emblem');
    expect(html).toContain('href="/en/work-with-us"');
  });

  it('does not invent canonical references when they are unavailable', () => {
    const base = profile();
    base.content.systemicScale.title = 'Systemic Scale';

    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/en/profile']}>
        <PublicProfileView
          profile={{
            ...base,
            stackGroups: [
              {
                id: 'front-end',
                position: 0,
                title: 'Front-end',
                technologies: [
                  {
                    id: 'react',
                    slug: 'react',
                    name: 'React',
                    position: 0,
                  },
                ],
                proofSystems: [],
                proofCount: 0,
              },
            ],
          }}
        />
      </MemoryRouter>,
    );

    expect(html).toContain('Proved in 0');
    expect(html).not.toContain('Current project');
    expect(html).not.toContain('Read the full reasoning');
    expect(html).not.toContain('Sentinel');
  });

  it('uses the localized Profile contract without desktop/mobile content forks', () => {
    const base = profile({
      locale: 'fr',
      displayName: 'Profil Qualification',
      sourceCvAssetId: 'cv-one',
      contacts: [{ kind: 'email', value: 'profile@example.test' }],
      languages: ['fr', 'en'],
      mobility: { worldwide: true, remote: true, relocation: false },
    });
    base.content.hero.professionalTitle = 'Constructeur de systèmes';
    base.content.hero.introduction = 'Je construis des systèmes inspectables.';
    base.content.hero.cvLabel = 'Télécharger le CV';
    base.content.callToAction.title = 'Construisons quelque chose d’utile.';
    base.content.callToAction.buttonLabel = 'Travailler ensemble';

    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/fr/profil']}>
        <PublicProfileView profile={base} />
      </MemoryRouter>,
    );

    expect(html).toContain('Constructeur de systèmes');
    expect(html).toContain('Télécharger le CV');
    expect(html).toContain('href="/fr/profil/cv"');
    expect(html).toContain('Français · Anglais');
    expect(html).toContain('International · À distance');
    expect(html).toContain('href="/fr/travailler-ensemble"');
    expect(html).toContain('data-profile-contract="v1"');
  });
});
