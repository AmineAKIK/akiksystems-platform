import { describe, expect, it } from 'vitest';

import {
  destinationById,
  destinationFromPathname,
  destinationHref,
  globalDestinationIds,
  globalDestinations,
} from './global-destinations';

describe('global destinations', () => {
  it('defines exactly the five first-level destinations', () => {
    expect(globalDestinationIds).toEqual([
      'profile',
      'work-with-us',
      'writings',
      'systems',
      'learning',
    ]);
    expect(globalDestinations.map((destination) => destination.id)).toEqual(
      globalDestinationIds,
    );
  });

  it('builds localized hrefs from the code-defined registry', () => {
    expect(destinationHref('profile', 'en')).toBe('/en/profile');
    expect(destinationHref('profile', 'fr')).toBe('/fr/profil');
    expect(destinationHref('systems', 'fr')).toBe('/fr/systems');
    expect(destinationHref('work-with-us', 'fr')).toBe('/fr/travailler-ensemble');
  });

  it('resolves deep routes back to their first-level destination', () => {
    expect(destinationFromPathname('/en/systems/sentinel')).toBe('systems');
    expect(destinationFromPathname('/fr/systems/sentinel')).toBe('systems');
    expect(destinationFromPathname('/fr/ecrits/architecture')).toBe('writings');
    expect(destinationFromPathname('/en')).toBeNull();
  });

  it('keeps labels and descriptions localized', () => {
    expect(destinationById('writings').label.en).toBe('Writings');
    expect(destinationById('writings').label.fr).toBe('Écrits');
    expect(destinationById('learning').description.fr.length).toBeGreaterThan(0);
  });
});
