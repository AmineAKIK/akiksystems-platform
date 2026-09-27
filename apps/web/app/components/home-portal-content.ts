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
      en: 'Let’s talk about a project, a collaboration, or a mission. Let’s build together what deserves to exist.',
      fr: 'Échangeons autour d’un projet, d’une collaboration ou d’une mission. Construisons ensemble ce qui mérite d’exister.',
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
      en: 'Journey, convictions, and way of working. What shapes the AkikSystems vision.',
      fr: 'Parcours, convictions et manière de travailler. Ce qui façonne la vision d’AkikSystems.',
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
      en: 'Software, products, and experiences designed as coherent systems. Every project connects use, technology, and intent.',
      fr: 'Logiciels, produits et expériences conçus comme des systèmes cohérents. Chaque projet relie usage, technique et intention.',
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
      en: 'Essays, articles, and notes around the ideas that shape systems. Published thinking that is precise and in motion.',
      fr: 'Essais, articles et notes autour des idées qui façonnent les systèmes. Une pensée publiée, précise et en mouvement.',
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
      en: 'Training, professional dossiers, and academic projects. What is built through learning and transmission.',
      fr: 'Formations, dossiers professionnels et projets académiques. Ce qui se construit en apprenant et en transmettant.',
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
      en: 'How your data is collected, protected, and used. A transparent and responsible approach.',
      fr: 'Comment vos données sont collectées, protégées et utilisées. Une approche transparente et responsable.',
    },
  },
  legal: {
    summary: {
      en: 'Publisher · Responsibility',
      fr: 'Éditeur · Responsabilité',
    },
    description: {
      en: 'Publishing, legal, and regulatory information for the site. A clear reading of responsibilities.',
      fr: 'Informations éditoriales, juridiques et réglementaires du site. Une lecture claire des responsabilités.',
    },
  },
  cookies: {
    summary: {
      en: 'Preferences · Control',
      fr: 'Préférences · Contrôle',
    },
    description: {
      en: 'Preferences related to cookies and optional services. You keep control of your experience.',
      fr: 'Préférences liées aux cookies et aux services optionnels. Vous gardez le contrôle de votre expérience.',
    },
  },
};
