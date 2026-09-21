export const locales = ['en', 'fr'] as const;

export type Locale = (typeof locales)[number];

export interface UiDictionary {
  shell: {
    skipToContent: string;
    navigationLabel: string;
    menuLabel: string;
    homeLabel: string;
    profileLabel: string;
    currentContextLabel: string;
    languageUnavailableLabel: string;
  };
  home: {
    eyebrow: string;
    title: string;
    description: string;
    destinationsLabel: string;
    coreLabel: string;
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
    shell: {
      skipToContent: 'Skip to content',
      navigationLabel: 'Primary navigation',
      menuLabel: 'Menu',
      homeLabel: 'Home',
      profileLabel: 'Profile',
      currentContextLabel: 'Current context',
      languageUnavailableLabel: 'French unavailable',
    },
    home: {
      eyebrow: 'Independent software systems',
      title: 'Engineering made inspectable.',
      description:
        'Explore the systems, evidence, learning, writing, and collaboration paths that make up AkikSystems.',
      destinationsLabel: 'Explore AkikSystems',
      coreLabel: 'Five doors / one system',
    },
    about: {
      eyebrow: 'Runtime proof',
      title: 'Client navigation is enabled',
      description: 'This second route is reachable through React Router without a full-page navigation.',
      homeLink: 'Return to the server-rendered home route',
    },
  },
  fr: {
    shell: {
      skipToContent: 'Aller au contenu',
      navigationLabel: 'Navigation principale',
      menuLabel: 'Menu',
      homeLabel: 'Accueil',
      profileLabel: 'Profil',
      currentContextLabel: 'Contexte actuel',
      languageUnavailableLabel: 'Anglais indisponible',
    },
    home: {
      eyebrow: 'Systèmes logiciels indépendants',
      title: 'L’ingénierie rendue inspectable.',
      description:
        'Explorez les systèmes, les preuves, l’apprentissage, les écrits et les voies de collaboration qui composent AkikSystems.',
      destinationsLabel: 'Explorer AkikSystems',
      coreLabel: 'Cinq portes / un système',
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

export function requireExactLocale(
  value: string | undefined,
  expected: Locale,
): Locale {
  const locale = requireLocale(value);

  if (locale !== expected) {
    throw new Response('Route is not available for this locale.', {
      status: 404,
      statusText: 'Localized route not found',
    });
  }

  return locale;
}

export function dictionaryFor(locale: Locale): UiDictionary {
  return dictionaries[locale];
}

export function localeFromPathname(pathname: string): Locale | undefined {
  const firstSegment = pathname.split('/').filter(Boolean)[0];
  return isLocale(firstSegment) ? firstSegment : undefined;
}
