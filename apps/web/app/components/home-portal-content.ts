import type { GlobalDestinationId } from '../i18n/global-destinations';
import type { LegalPageId } from '../i18n/legal-pages';
import type { Locale } from '../i18n/locales';

export const homeDestinationOrder = [
  'work-with-us',
  'profile',
  'systems',
  'writings',
  'learning',
] as const satisfies readonly GlobalDestinationId[];

interface HomeDestinationPresentation {
  label: Record<Locale, string>;
  summary: Record<Locale, string>;
  description: Record<Locale, string>;
}

export const homeDestinationPresentation: Record<
  GlobalDestinationId,
  HomeDestinationPresentation
> = {
  'work-with-us': {
    label: {
      en: 'Perspectives',
      fr: 'Perspectives',
    },
    summary: {
      en: 'Collaboration · Contact',
      fr: 'Collaboration · Contact',
    },
    description: {
      en: 'Projects, collaborations, or missions. Let’s build what deserves to exist.',
      fr: 'Projets, collaborations ou missions. Construisons ce qui mérite d’exister.',
    },
  },
  profile: {
    label: {
      en: 'Profile',
      fr: 'Profil',
    },
    summary: {
      en: 'Journey · Vision',
      fr: 'Parcours · Vision',
    },
    description: {
      en: 'Journey, convictions, and practice—the foundations of the AkikSystems vision.',
      fr: 'Parcours, convictions et pratique : les fondations de la vision AkikSystems.',
    },
  },
  systems: {
    label: {
      en: 'Systems',
      fr: 'Systèmes',
    },
    summary: {
      en: 'Products · Projects',
      fr: 'Produits · Projets',
    },
    description: {
      en: 'Software and products designed as coherent systems, from use to intent.',
      fr: 'Logiciels et produits conçus en systèmes cohérents, de l’usage à l’intention.',
    },
  },
  writings: {
    label: {
      en: 'Writings',
      fr: 'Écrits',
    },
    summary: {
      en: 'Essays · Notes',
      fr: 'Essais · Notes',
    },
    description: {
      en: 'Essays and notes on the ideas shaping systems and keeping thought in motion.',
      fr: 'Essais et notes sur les idées qui façonnent les systèmes et la pensée.',
    },
  },
  learning: {
    label: {
      en: 'Learning',
      fr: 'Apprentissage',
    },
    summary: {
      en: 'Dossiers · Training',
      fr: 'Dossiers · Formations',
    },
    description: {
      en: 'Training, professional dossiers, and projects built through learning.',
      fr: 'Formations, dossiers professionnels et projets construits par l’apprentissage.',
    },
  },
};

export const homeLegalPresentation: Record<
  LegalPageId,
  {
    summary: Record<Locale, string>;
    description: Record<Locale, string>;
  }
> = {
  privacy: {
    summary: {
      en: 'Data · Protection',
      fr: 'Données · Protection',
    },
    description: {
      en: 'How your data is collected, protected, and used—with transparency.',
      fr: 'Comment vos données sont collectées, protégées et utilisées, en transparence.',
    },
  },
  legal: {
    summary: {
      en: 'Publisher · Responsibility',
      fr: 'Éditeur · Responsabilité',
    },
    description: {
      en: 'Publishing and legal information, with responsibilities stated clearly.',
      fr: 'Informations éditoriales et juridiques, avec des responsabilités claires.',
    },
  },
  cookies: {
    summary: {
      en: 'Preferences · Control',
      fr: 'Préférences · Contrôle',
    },
    description: {
      en: 'Cookie and optional-service preferences, always under your control.',
      fr: 'Préférences de cookies et services optionnels, toujours sous votre contrôle.',
    },
  },
};
