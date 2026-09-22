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
