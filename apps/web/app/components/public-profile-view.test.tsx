import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import type { PublicProfile, PublicSystemReference } from '@akiksystems/db';

import { PublicProfileView } from './public-profile-view';


function reference(
  id: string,
  slug: string,
  title: string,
  summary: string,
  locale: 'en' | 'fr' = 'en',
): PublicSystemReference {
  return {
    id,
    locale,
    slug,
    title,
    summary,
    href: `/${locale}/systems/${slug}`,
    proofTransparency: {
      role: locale === 'fr' ? 'Système logiciel' : 'Software system',
      maturity: locale === 'fr' ? 'Implémentation inspectable' : 'Inspectable implementation',
      demoNature: locale === 'fr' ? 'Aucune démo séparée' : 'No separate demo',
      dataNature: locale === 'fr' ? 'Données de preuve' : 'Evidence data',
      limits: locale === 'fr' ? 'Limites explicites.' : 'Explicit limits.',
    },
  };
}

function profile(overrides: Partial<PublicProfile> = {}): PublicProfile {
  return {
    id: '00000000-0000-4000-8000-000000000054',
    locale: 'en',
    displayName: 'Amine AKIK',
    portraitAssetId: null,
    portraitAltText: null,
    sourceCvAssetId: null,
    professionalTitle: 'Software systems builder',
    introduction: 'Inspectable systems.',
    foundationalCopy: null,
    workPrinciples: [],
    representativeSystems: [],
    professionalJourney: [],
    technologyJourney: [],
    capabilityGroups: [],
    languages: [],
    mobility: {
      worldwide: false,
      remote: false,
      relocation: false,
    },
    alternateLocale: 'fr',
    ...overrides,
  };
}

describe('PublicProfileView source CV', () => {
  it('does not invent a CV link when no artifact is linked', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/en/profile']}>
        <PublicProfileView profile={profile()} systemReferences={[]} />
      </MemoryRouter>,
    );

    expect(html).not.toContain('/en/profile/cv');
    expect(html).not.toContain('View source CV');
  });

  it('links the shared CV artifact through the localized English route', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/en/profile']}>
        <PublicProfileView
          profile={profile({
            sourceCvAssetId: '00000000-0000-4000-8000-000000000061',
          })}
          systemReferences={[]}
        />
      </MemoryRouter>,
    );

    expect(html).toContain('href="/en/profile/cv"');
    expect(html).toContain('View source CV');
  });

  it('links the same artifact through the localized French route', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/fr/profil']}>
        <PublicProfileView
          profile={profile({
            locale: 'fr',
            alternateLocale: 'en',
            sourceCvAssetId: '00000000-0000-4000-8000-000000000061',
          })}
          systemReferences={[]}
        />
      </MemoryRouter>,
    );

    expect(html).toContain('href="/fr/profil/cv"');
    expect(html).toContain('Voir le CV source');
  });
});


describe('PublicProfileView first view', () => {
  const sentinel = {
    id: '00000000-0000-4000-8000-000000000028',
    position: 0,
    slug: 'sentinel',
    title: 'Sentinel',
    summary: 'Operational visibility built from inspectable evidence.',
  };

  const second = {
    id: '00000000-0000-4000-8000-000000000029',
    position: 1,
    slug: 'second-system',
    title: 'Second System',
    summary: 'A second representative system.',
  };

  it('uses the first representative System as immediate proof without duplication', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/en/profile']}>
        <PublicProfileView
          profile={profile({
            introduction:
              'I design and build inspectable software systems.',
            foundationalCopy:
              'Professional identity connected to inspectable evidence.',
            representativeSystems: [sentinel, second],
          })}
          systemReferences={[
            reference(sentinel.id, sentinel.slug, sentinel.title, sentinel.summary),
            reference(second.id, second.slug, second.title, second.summary),
          ]}
        />
      </MemoryRouter>,
    );

    expect(html).toContain('aria-label="Immediate proof"');
    expect(html).toContain('Inspect System');
    expect(html.match(/>Sentinel</g)).toHaveLength(1);
    expect(html).toContain('Representative Systems');
    expect(html).toContain('Second System');
  });

  it('keeps the first view useful without inventing proof when no System is selected', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/en/profile']}>
        <PublicProfileView
          profile={profile({
            introduction:
              'I design and build inspectable software systems.',
            representativeSystems: [],
          })}
          systemReferences={[]}
        />
      </MemoryRouter>,
    );

    expect(html).toContain('class="aks-profile-first-view"');
    expect(html).toContain('<h1');
    expect(html).toContain('Amine AKIK');
    expect(html).toContain('Profile · AkikSystems');
    expect(html).toContain('Software systems builder');
    expect(html).not.toContain('Immediate proof');
  });

  it('localizes the immediate proof affordance in French', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/fr/profil']}>
        <PublicProfileView
          profile={profile({
            locale: 'fr',
            alternateLocale: 'en',
            professionalTitle: 'Concepteur de systèmes logiciels',
            introduction: 'Je conçois des systèmes logiciels inspectables.',
            representativeSystems: [
              {
                ...sentinel,
                summary: 'Visibilité opérationnelle et preuves inspectables.',
              },
            ],
          })}
          systemReferences={[
            reference(
              sentinel.id,
              sentinel.slug,
              sentinel.title,
              'Visibilité opérationnelle et preuves inspectables.',
              'fr',
            ),
          ]}
        />
      </MemoryRouter>,
    );

    expect(html).toContain('aria-label="Preuve immédiate"');
    expect(html).toContain('Inspecter le système');
    expect(html).toContain('href="/fr/systems/sentinel"');
  });
});


describe('PublicProfileView How I work evidence', () => {
  it('renders optional working-principle evidence without copying System summary', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/en/profile']}>
        <PublicProfileView
          profile={profile({
            workPrinciples: [
              {
                id: '00000000-0000-4000-8000-000000000063',
                position: 0,
                title: 'Make evidence inspectable',
                detail: 'Prefer concrete proof over opaque claims.',
                evidenceSystem: {
                  id: '00000000-0000-4000-8000-000000000028',
                  slug: 'sentinel',
                  title: 'Sentinel',
                },
              },
            ],
          })}
          systemReferences={[
            reference(
              '00000000-0000-4000-8000-000000000028',
              'sentinel',
              'Sentinel',
              'Operational visibility built from inspectable evidence.',
            ),
          ]}
        />
      </MemoryRouter>,
    );

    expect(html).toContain('How I work');
    expect(html).toContain('Make evidence inspectable');
    expect(html).toContain('Example');
    expect(html).toContain('href="/en/systems/sentinel"');
    expect(html).not.toContain('Operational visibility built');
  });

  it('keeps a principle useful without inventing an example', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/en/profile']}>
        <PublicProfileView
          profile={profile({
            workPrinciples: [
              {
                id: '00000000-0000-4000-8000-000000000064',
                position: 0,
                title: 'Reduce before adding',
                detail: null,
                evidenceSystem: null,
              },
            ],
          })}
          systemReferences={[]}
        />
      </MemoryRouter>,
    );

    expect(html).toContain('Reduce before adding');
    expect(html).not.toContain('Example:');
  });

  it('localizes the evidence affordance in French', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/fr/profil']}>
        <PublicProfileView
          profile={profile({
            locale: 'fr',
            alternateLocale: 'en',
            workPrinciples: [
              {
                id: '00000000-0000-4000-8000-000000000065',
                position: 0,
                title: 'Rendre les preuves inspectables',
                detail: 'Privilégier des preuves concrètes.',
                evidenceSystem: {
                  id: '00000000-0000-4000-8000-000000000028',
                  slug: 'sentinel',
                  title: 'Sentinel',
                },
              },
            ],
          })}
          systemReferences={[
            reference(
              '00000000-0000-4000-8000-000000000028',
              'sentinel',
              'Sentinel',
              'Visibilité opérationnelle.',
              'fr',
            ),
          ]}
        />
      </MemoryRouter>,
    );

    expect(html).toContain('Exemple');
    expect(html).toContain('Sentinel');
    expect(html).toContain('href="/fr/systems/sentinel"');
  });
});


describe('PublicProfileView technological journey', () => {
  const stages = [
    {
      key: 'programming' as const,
      position: 0,
      title: 'Programming foundations',
      summary: 'Understand how software is built and controlled.',
      evidence: null,
    },
    {
      key: 'networks_telecom' as const,
      position: 1,
      title: 'Networks and telecom',
      summary: 'Connectivity, protocols, and distributed behavior.',
      evidence: null,
    },
    {
      key: 'it_support' as const,
      position: 2,
      title: 'IT support',
      summary: 'Diagnose real user and infrastructure problems.',
      evidence: null,
    },
    {
      key: 'industry' as const,
      position: 3,
      title: 'Relevant industry',
      summary: 'Connect software decisions to operations and reliability.',
      evidence: {
        kind: 'experience' as const,
        id: '00000000-0000-4000-8000-000000000031',
        title: 'Marelli',
        href: null,
      },
    },
    {
      key: 'development_akiksystems' as const,
      position: 4,
      title: 'Development and AkikSystems',
      summary: 'Build inspectable software systems.',
      evidence: {
        kind: 'system' as const,
        id: '00000000-0000-4000-8000-000000000028',
        title: 'Sentinel',
        href: '/en/systems/sentinel',
      },
    },
  ];

  it('renders the fixed technological journey without turning it into a tool list', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/en/profile']}>
        <PublicProfileView
          profile={profile({ technologyJourney: stages })}
          systemReferences={[
            reference(
              '00000000-0000-4000-8000-000000000028',
              'sentinel',
              'Sentinel',
              'Operational visibility built from inspectable evidence.',
            ),
          ]}
        />
      </MemoryRouter>,
    );

    expect(html).toContain('Technological journey');
    expect(html).toContain('Programming foundations');
    expect(html).toContain('Networks and telecom');
    expect(html).toContain('IT support');
    expect(html).toContain('Relevant industry');
    expect(html).toContain('Development and AkikSystems');
    expect(html).toContain('Context: Marelli');
    expect(html).toContain('Evidence');
    expect(html).toContain('href="/en/systems/sentinel"');
    expect(html).not.toContain('React');
    expect(html).not.toContain('Docker');
  });

  it('localizes journey evidence affordances in French', () => {
    const frenchStages = stages.map((stage) =>
      stage.key === 'development_akiksystems'
        ? {
            ...stage,
            title: 'Développement et AkikSystems',
            evidence: {
              ...stage.evidence!,
              href: '/fr/systems/sentinel',
            },
          }
        : stage.key === 'industry'
          ? { ...stage, title: 'Industrie pertinente' }
          : stage,
    );

    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/fr/profil']}>
        <PublicProfileView
          profile={profile({
            locale: 'fr',
            alternateLocale: 'en',
            technologyJourney: frenchStages,
          })}
          systemReferences={[
            reference(
              '00000000-0000-4000-8000-000000000028',
              'sentinel',
              'Sentinel',
              'Visibilité opérationnelle et preuves inspectables.',
              'fr',
            ),
          ]}
        />
      </MemoryRouter>,
    );

    expect(html).toContain('Parcours technologique');
    expect(html).toContain('Contexte : Marelli');
    expect(html).toContain('Preuve : Sentinel');
    expect(html).toContain('href="/fr/systems/sentinel"');
  });
});


describe('PublicProfileView Technical Capabilities', () => {
  const capabilityGroups = [
    {
      id: '00000000-0000-4000-8000-000000000071',
      position: 0,
      title: 'Architecture',
      capabilities: [
        {
          id: '00000000-0000-4000-8000-000000000072',
          position: 0,
          title: 'Design bounded systems',
          summary: 'Shape explicit boundaries and contracts.',
        },
      ],
    },
    {
      id: '00000000-0000-4000-8000-000000000073',
      position: 1,
      title: 'Delivery',
      capabilities: [
        {
          id: '00000000-0000-4000-8000-000000000074',
          position: 0,
          title: 'Qualify delivery paths',
          summary: 'Build observable paths from change to production.',
        },
      ],
    },
  ];

  it('renders grouped capabilities as abilities rather than a technology stack', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/en/profile']}>
        <PublicProfileView
          profile={profile({ capabilityGroups })}
          systemReferences={[]}
        />
      </MemoryRouter>,
    );

    expect(html).toContain('Technical Capabilities');
    expect(html).toContain('Architecture');
    expect(html).toContain('Design bounded systems');
    expect(html).toContain('Delivery');
    expect(html).toContain('Qualify delivery paths');
    expect(html).not.toContain('React');
    expect(html).not.toContain('Docker');
    expect(html).not.toContain('aks-system-detail-tags');
  });

  it('localizes capability groups and summaries in French', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/fr/profil']}>
        <PublicProfileView
          profile={profile({
            locale: 'fr',
            alternateLocale: 'en',
            capabilityGroups: [
              {
                id: '00000000-0000-4000-8000-000000000071',
                position: 0,
                title: 'Architecture',
                capabilities: [
                  {
                    id: '00000000-0000-4000-8000-000000000072',
                    position: 0,
                    title: 'Concevoir des systèmes délimités',
                    summary: 'Structurer des frontières et des contrats explicites.',
                  },
                ],
              },
              {
                id: '00000000-0000-4000-8000-000000000073',
                position: 1,
                title: 'Livraison',
                capabilities: [
                  {
                    id: '00000000-0000-4000-8000-000000000074',
                    position: 0,
                    title: 'Qualifier les parcours de livraison',
                    summary:
                      'Construire des parcours observables du changement à la production.',
                  },
                ],
              },
            ],
          })}
          systemReferences={[]}
        />
      </MemoryRouter>,
    );

    expect(html).toContain('Capacités techniques');
    expect(html).toContain('Concevoir des systèmes délimités');
    expect(html).toContain('Livraison');
    expect(html).toContain('Qualifier les parcours de livraison');
  });
});


describe('PublicProfileView progressive depth', () => {
  it('renders deeper Profile evidence in closed native disclosures', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/en/profile']}>
        <PublicProfileView
          profile={profile({
            technologyJourney: [
              {
                key: 'programming',
                position: 0,
                title: 'Programming foundations',
                summary: 'Understand software construction.',
                evidence: null,
              },
            ],
            capabilityGroups: [
              {
                id: '00000000-0000-4000-8000-000000000081',
                position: 0,
                title: 'Architecture',
                capabilities: [
                  {
                    id: '00000000-0000-4000-8000-000000000082',
                    position: 0,
                    title: 'Design bounded systems',
                    summary: null,
                  },
                ],
              },
            ],
            professionalJourney: [
              {
                id: '00000000-0000-4000-8000-000000000083',
                position: 0,
                title: 'Marelli',
                summary: 'Industrial context.',
              },
            ],
            workPrinciples: [
              {
                id: '00000000-0000-4000-8000-000000000084',
                position: 0,
                title: 'Make evidence inspectable',
                detail: null,
                evidenceSystem: null,
              },
            ],
          })}
          systemReferences={[]}
        />
      </MemoryRouter>,
    );

    expect(html).toContain('id="profile-technical-depth"');
    expect(html).toContain('Explore technical depth');
    expect(html).toContain('id="profile-professional-evidence"');
    expect(html).toContain('Explore professional evidence');
    expect(html).toContain('id="profile-how-i-work"');
    expect(html).toContain('How I work');
    expect(html).not.toMatch(/<details[^>]*\sopen(?:=|\s|>)/);
    expect(html).toContain('Programming foundations');
    expect(html).toContain('Marelli');
    expect(html).toContain('Make evidence inspectable');
  });

  it('localizes progressive-depth controls in French', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/fr/profil']}>
        <PublicProfileView
          profile={profile({
            locale: 'fr',
            alternateLocale: 'en',
            capabilityGroups: [
              {
                id: '00000000-0000-4000-8000-000000000085',
                position: 0,
                title: 'Architecture',
                capabilities: [
                  {
                    id: '00000000-0000-4000-8000-000000000086',
                    position: 0,
                    title: 'Concevoir des systèmes délimités',
                    summary: null,
                  },
                ],
              },
            ],
            professionalJourney: [
              {
                id: '00000000-0000-4000-8000-000000000087',
                position: 0,
                title: 'Marelli',
                summary: null,
              },
            ],
            workPrinciples: [
              {
                id: '00000000-0000-4000-8000-000000000088',
                position: 0,
                title: 'Rendre les preuves inspectables',
                detail: null,
                evidenceSystem: null,
              },
            ],
          })}
          systemReferences={[]}
        />
      </MemoryRouter>,
    );

    expect(html).toContain('Approfondir la technique');
    expect(html).toContain('Approfondir les preuves professionnelles');
    expect(html).toContain('Ma manière de travailler');
  });
});
