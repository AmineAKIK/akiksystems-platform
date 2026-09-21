export const locales = ['en', 'fr'] as const;

export type Locale = (typeof locales)[number];

export interface UiDictionary {
  brand: string;
  shell: {
    skipToContent: string;
    navigationLabel: string;
    homeLabel: string;
    aboutLabel: string;
    systemsLabel: string;
    currentContextLabel: string;
  };
  home: {
    eyebrow: string;
    title: string;
    description: string;
    aboutLink: string;
  };
  about: {
    eyebrow: string;
    title: string;
    description: string;
    homeLink: string;
  };
}

const dictionaries = {
  en: {
    brand: 'AkikSystems',
    shell: {
      skipToContent: 'Skip to content',
      navigationLabel: 'Primary navigation',
      homeLabel: 'Home',
      aboutLabel: 'About',
      systemsLabel: 'Systems',
      currentContextLabel: 'Current context',
    },
    home: {
      eyebrow: 'AkikSystems',
      title: 'Platform walking skeleton',
      description: 'This page is rendered on the server and hydrated for client navigation.',
      aboutLink: 'Open the client-navigation proof route',
    },
    about: {
      eyebrow: 'Runtime proof',
      title: 'Client navigation is enabled',
      description: 'This second route is reachable through React Router without a full-page navigation.',
      homeLink: 'Return to the server-rendered home route',
    },
  },
  fr: {
    brand: 'AkikSystems',
    shell: {
      skipToContent: 'Aller au contenu',
      navigationLabel: 'Navigation principale',
      homeLabel: 'Accueil',
      aboutLabel: 'À propos',
      systemsLabel: 'Systèmes',
      currentContextLabel: 'Contexte actuel',
    },
    home: {
      eyebrow: 'AkikSystems',
      title: 'Squelette fonctionnel de la plateforme',
      description: 'Cette page est rendue côté serveur puis hydratée pour la navigation côté client.',
      aboutLink: 'Ouvrir la route de preuve de navigation',
    },
    about: {
      eyebrow: 'Preuve du runtime',
      title: 'La navigation côté client est active',
      description: 'Cette seconde route est accessible avec React Router sans rechargement complet.',
      homeLink: 'Retourner à la page d’accueil rendue côté serveur',
    },
  },
} satisfies Record<Locale, UiDictionary>;

export function isLocale(value: string | undefined): value is Locale {
  return value !== undefined && locales.some((locale) => locale === value);
}

export function requireLocale(value: string | undefined): Locale {
  if (!isLocale(value)) {
    throw new Response('Unsupported locale.', {
      status: 404,
      statusText: 'Locale not supported',
    });
  }

  return value;
}

export function dictionaryFor(locale: Locale): UiDictionary {
  return dictionaries[locale];
}

export function localeFromPathname(pathname: string): Locale | undefined {
  const firstSegment = pathname.split('/').filter(Boolean)[0];
  return isLocale(firstSegment) ? firstSegment : undefined;
}
