import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import type { PublicProfile } from '@akiksystems/db';

import { PublicProfileView } from './public-profile-view';

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
        <PublicProfileView profile={profile()} />
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
        />
      </MemoryRouter>,
    );

    expect(html).toContain('aria-label="Immediate proof"');
    expect(html).toContain('Inspect this proof');
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
        />
      </MemoryRouter>,
    );

    expect(html).toContain('class="aks-profile-first-view"');
    expect(html).toContain('Amine AKIK');
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
        />
      </MemoryRouter>,
    );

    expect(html).toContain('aria-label="Preuve immédiate"');
    expect(html).toContain('Inspecter cette preuve');
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
        />
      </MemoryRouter>,
    );

    expect(html).toContain('How I work');
    expect(html).toContain('Make evidence inspectable');
    expect(html).toContain('Example: Sentinel');
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
        />
      </MemoryRouter>,
    );

    expect(html).toContain('Exemple : Sentinel');
    expect(html).toContain('href="/fr/systems/sentinel"');
  });
});
