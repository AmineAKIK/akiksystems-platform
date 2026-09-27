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
  content.currentProject.updatedLabel = 'Updated';

  content.stack.eyebrow = 'Stack';
  content.stack.title = 'What I master, and where to verify it.';
  content.stack.introduction = 'Every technology is backed by published proof.';
  content.stack.proofCountLabel = 'Proved in';
  content.stack.inspectSystemLabel = 'Inspect system';

  content.guidance.eyebrow = 'What guides my work';
  content.guidance.title = 'Software matters through real work.';
  content.guidance.centerLabel = 'Systemic view';
  content.guidance.benefitLabel = 'What it brings';
  content.guidance.avoidanceLabel = 'What it avoids';
  content.guidance.questionsLabel = 'Questions';
  content.guidance.looks.code.title = 'Code';
  content.guidance.looks.code.description = 'Build for maintenance.';
  content.guidance.looks.code.benefit = 'Durable software.';
  content.guidance.looks.code.avoidance = 'Short-lived shortcuts.';
  content.guidance.looks.code.questions = ['Can this be maintained?'];

  content.capabilities.eyebrow = 'Capabilities';
  content.capabilities.title = 'From framing to evolution.';
  content.capabilities.beforeCodingLabel = 'Before coding';
  content.capabilities.buildDeliverLabel = 'Build and deliver';
  content.capabilities.runLiveLabel = 'Run and evolve';
  content.capabilities.deliverableLabel = 'What you receive';
  content.capabilities.crossCuttingLabel = 'Throughout the project';
  content.capabilities.steps.frame.title = 'Frame';
  content.capabilities.steps.frame.purpose = 'Clarify the real problem.';
  content.capabilities.steps.frame.actions = ['Map the real workflow.'];
  content.capabilities.steps.frame.deliverable = 'A clear frame.';
  content.capabilities.crossCutting.documentation.title = 'Documentation';
  content.capabilities.crossCutting.documentation.description =
    'Keep decisions and operating knowledge explicit.';

  content.systemicScale.eyebrow = 'The meaning of the slogan';
  content.systemicScale.title = 'Systemic Scale';
  content.systemicScale.statementPrimary = 'Intervene on one part.';
  content.systemicScale.statementSecondary = 'Evaluate across a wider boundary.';
  content.systemicScale.reasoningLinkLabel = 'Read the full reasoning';
  content.systemicScale.exampleLabel = 'In the example';
  content.systemicScale.questionLabel = 'The question to ask';
  content.systemicScale.steps.read_request.title = 'Read the request';
  content.systemicScale.steps.read_request.principle = 'Start with the request.';
  content.systemicScale.steps.read_request.example = 'Shared resources.';
  content.systemicScale.steps.read_request.question = 'What is actually asked?';
  content.systemicScale.steps.read_request.diagramLeadLabel = 'Observed process';
  content.systemicScale.steps.read_request.diagramAlt =
    'Eight-step shared-resource process.';
  content.systemicScale.processLabels.reservation = 'Reservation';
  content.systemicScale.processLabels.assignment = 'Assignment';
  content.systemicScale.processLabels.use = 'Use';
  content.systemicScale.processLabels.return = 'Return';
  content.systemicScale.processLabels.verification = 'Verification';
  content.systemicScale.processLabels.restoration = 'Restoration';
  content.systemicScale.processLabels.location = 'Location';
  content.systemicScale.processLabels.available = 'Available';

  content.emblem.eyebrow = 'AkikSystems emblem';
  content.emblem.title = 'What the emblem says';
  content.emblem.symbols.eagle.name = 'Eagle';
  content.emblem.symbols.eagle.concept = 'Overview';
  content.emblem.symbols.eagle.description = 'Keep the wider view.';
  content.emblem.conclusion = 'Height of view requires knowledge of the ground.';

  content.callToAction.eyebrow = 'Work together';
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

describe('PublicProfileView final experience', () => {
  it('renders the complete public composition from Profile and canonical references', () => {
    const base = profile();

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

    expect(html).toContain('class="aks-profile"');
    expect(html).toContain('data-profile-section="hero"');
    expect(html).toContain('data-profile-section="stack"');
    expect(html).toContain('data-profile-section="guidance"');
    expect(html).toContain('data-profile-section="capabilities"');
    expect(html).toContain('data-profile-section="systemic-scale"');
    expect(html).toContain('data-profile-section="cta"');

    expect(html).toContain('Qualification Profile');
    expect(html).toContain('Systems builder');
    expect(html).toContain('System One');
    expect(html).toContain('href="/en/systems/system-one"');
    expect(html).toContain('Published relation evidence.');
    expect(html).toContain('Proved in 1 system');
    expect(html).toContain('href="/en/writings/systemic-reasoning"');
    expect(html).toContain('href="/en/work-with-us"');
    expect(html).toContain('src="/brand/AKSYS.svg"');

    expect(html).toContain('role="tablist"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('role="tabpanel"');
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('Eight-step shared-resource process.');
  });

  it('keeps unavailable canonical references absent without inventing content', () => {
    const base = profile();

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

    expect(html).toContain('Proved in 0 systems');
    expect(html).toContain('No published proof in this locale yet.');
    expect(html).not.toContain('data-profile-section="current-project"');
    expect(html).not.toContain('Read the full reasoning</a>');
    expect(html).not.toContain('Sentinel');
    expect(html).not.toContain('AkikSystems</h2>');
  });

  it('uses one localized editorial model for mobile and desktop representations', () => {
    const base = profile({
      locale: 'fr',
      displayName: 'Profil Qualification',
      sourceCvAssetId: 'cv-one',
      contacts: [
        { kind: 'email', value: 'profile@example.test' },
        { kind: 'phone', value: '+33102030405' },
      ],
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
    expect(html).toContain('mailto:profile@example.test');
    expect(html).toContain('tel:+33102030405');
    expect(html).toContain('Français · Anglais');
    expect(html).toContain('International · À distance');
    expect(html).toContain('href="/fr/travailler-ensemble"');
    expect(html).toContain('aks-profile-emblem-map');
    expect(html).toContain('aks-profile-emblem-mobile');
    expect(html).toContain('data-profile-contract="v1"');
  });
});
