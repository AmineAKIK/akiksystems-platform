import type { Locale } from './locales';

export const globalDestinationIds = [
  'profile',
  'systems',
  'writings',
  'learning',
  'work-with-us',
] as const;

export type GlobalDestinationId = (typeof globalDestinationIds)[number];

export interface GlobalDestination {
  id: GlobalDestinationId;
  slug: Record<Locale, string>;
  label: Record<Locale, string>;
  description: Record<Locale, string>;
}

export const globalDestinations: readonly GlobalDestination[] = [
  {
    id: 'profile',
    slug: { en: 'profile', fr: 'profil' },
    label: { en: 'Profile', fr: 'Profil' },
    description: {
      en: 'Background, trajectory, and the context behind AkikSystems.',
      fr: 'Parcours, trajectoire et contexte derrière AkikSystems.',
    },
  },
  {
    id: 'systems',
    slug: { en: 'systems', fr: 'systemes' },
    label: { en: 'Systems', fr: 'Systèmes' },
    description: {
      en: 'Software systems, products, and operating tools built through AkikSystems.',
      fr: 'Systèmes logiciels, produits et outils opérationnels construits via AkikSystems.',
    },
  },
  {
    id: 'writings',
    slug: { en: 'writings', fr: 'ecrits' },
    label: { en: 'Writings', fr: 'Écrits' },
    description: {
      en: 'Essays, notes, and published thinking.',
      fr: 'Essais, notes et réflexions publiées.',
    },
  },
  {
    id: 'learning',
    slug: { en: 'learning', fr: 'apprentissage' },
    label: { en: 'Learning', fr: 'Apprentissage' },
    description: {
      en: 'Courses, experiments, and material created while learning in public.',
      fr: 'Cours, expérimentations et contenus créés dans une logique d’apprentissage public.',
    },
  },
  {
    id: 'work-with-us',
    slug: { en: 'work-with-us', fr: 'travailler-ensemble' },
    label: { en: 'Work with us', fr: 'Travailler ensemble' },
    description: {
      en: 'Ways to collaborate with AkikSystems on products, systems, and technical work.',
      fr: 'Façons de collaborer avec AkikSystems sur des produits, systèmes et travaux techniques.',
    },
  },
];

export function destinationById(id: GlobalDestinationId): GlobalDestination {
  const destination = globalDestinations.find((candidate) => candidate.id === id);

  if (destination === undefined) {
    throw new Error(`Unknown global destination: ${id}`);
  }

  return destination;
}

export function destinationHref(
  destination: GlobalDestinationId,
  locale: Locale,
): string {
  return `/${locale}/${destinationById(destination).slug[locale]}`;
}

export function destinationFromPathname(
  pathname: string,
): GlobalDestinationId | null {
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length < 2) {
    return null;
  }

  const locale = segments[0];
  if (locale !== 'en' && locale !== 'fr') {
    return null;
  }

  const slug = segments[1];

  for (const destination of globalDestinations) {
    if (destination.slug[locale] === slug) {
      return destination.id;
    }
  }

  return null;
}
