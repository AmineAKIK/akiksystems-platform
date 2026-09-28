import type { Locale } from '../i18n/locales';
import type { SystemsMedia, SystemsPageContent } from './systems.types';

const media = {
  hero: {
    alt: {
      en: 'Operations room showing a systems map across several screens.',
      fr: 'Salle d’opérations montrant une cartographie de systèmes sur plusieurs écrans.',
    },
    avif: '/systems/hero.avif',
    webp: '/systems/hero.webp',
    width: 1264,
    height: 848,
    priority: true,
    placeholder: true,
  },
  cirrus: {
    alt: {
      en: 'Multi-site energy orchestration interface.',
      fr: 'Interface d’orchestration énergétique multi-sites.',
    },
    avif: '/systems/cirrus.avif',
    webp: '/systems/cirrus.webp',
    width: 1024,
    height: 1024,
    placeholder: true,
  },
  mosaic: {
    alt: {
      en: 'Knowledge space connecting documents, images and metadata.',
      fr: 'Espace de connaissance reliant documents, images et métadonnées.',
    },
    avif: '/systems/mosaic.avif',
    webp: '/systems/mosaic.webp',
    width: 1024,
    height: 1024,
    placeholder: true,
  },
  radar: {
    alt: {
      en: 'Validation and deployment terminal for configurations.',
      fr: 'Terminal de validation et de déploiement de configurations.',
    },
    avif: '/systems/radar-cli.avif',
    webp: '/systems/radar-cli.webp',
    width: 1024,
    height: 1024,
    placeholder: true,
  },
  sonar: {
    alt: {
      en: 'Circular visualization of signals and terrain feedback.',
      fr: 'Visualisation circulaire de signaux et retours terrain.',
    },
    avif: '/systems/sonar.avif',
    webp: '/systems/sonar.webp',
    width: 1024,
    height: 1024,
    placeholder: true,
  },
  detour: {
    alt: {
      en: 'Mobile interfaces for routes and field tasks.',
      fr: 'Interfaces mobiles de parcours et tâches terrain.',
    },
    avif: '/systems/detour.avif',
    webp: '/systems/detour.webp',
    width: 1024,
    height: 1024,
    placeholder: true,
  },
} as const;

function localizedMedia(key: keyof typeof media, locale: Locale): SystemsMedia {
  const source = media[key];
  return {
    alt: source.alt[locale],
    avif: source.avif,
    webp: source.webp,
    width: source.width,
    height: source.height,
    placeholder: source.placeholder,
    ...('priority' in source ? { priority: source.priority } : {}),
  };
}

function contentFor(locale: Locale): SystemsPageContent {
  const fr = locale === 'fr';

  return {
    nav: {
      home: fr ? 'Accueil' : 'Home',
      menu: fr ? 'Menu' : 'Menu',
      perspectives: 'Perspectives',
      profile: fr ? 'Profil' : 'Profile',
      writings: fr ? 'Écrits' : 'Writings',
    },
    hero: {
      eyebrow: fr ? 'SYSTÈMES / systemic scale' : 'SYSTEMS / systemic scale',
      title: fr ? 'ATELIER AKIKSYSTEMS' : 'AKIKSYSTEMS WORKSHOP',
      state: fr ? 'OUVERT' : 'OPEN',
      intro: fr
        ? 'Une composition produit immersive pour entrer dans la chaîne d’opérations.'
        : 'An immersive product composition for entering the operations chain.',
      media: localizedMedia('hero', locale),
    },
    rail: [
      { index: '01', label: fr ? 'CONCEVOIR' : 'DESIGN', target: '#atlas' },
      { index: '02', label: fr ? 'ASSEMBLER' : 'ASSEMBLE', target: '#operations' },
      { index: '03', label: fr ? 'TESTER' : 'TEST', target: '#operations' },
      { index: '04', label: fr ? 'DÉPLOYER' : 'DEPLOY', target: '#workbench' },
      { index: '05', label: fr ? 'OBSERVER' : 'OBSERVE', target: '#perspectives' },
    ],
    atlas: {
      eyebrow: fr ? 'POSTE DE TRAVAIL OUVERT' : 'OPEN WORKSTATION',
      name: 'ATLAS / OPS',
      status: 'building',
      statusLabel: fr ? 'EN CONSTRUCTION' : 'IN PROGRESS',
      updated: fr ? 'Mis à jour aujourd’hui' : 'Updated today',
      summary: fr
        ? 'Un espace pour transformer les décisions complexes en chaînes d’action lisibles.'
        : 'A space for turning complex decisions into readable chains of action.',
      notes: fr
        ? [
            'Clarifier la chaîne de décision',
            'Tester les relais d’équipe',
            'Préparer la mise en ligne',
          ]
        : ['Clarify the decision chain', 'Test team handoffs', 'Prepare the release'],
      actions: [
        { label: fr ? 'Prévisualiser' : 'Preview', href: '#operations', kind: 'primary' },
        { label: fr ? 'Inspecter' : 'Inspect', href: '#workbench', kind: 'secondary' },
        {
          label: fr ? 'Demander un accès' : 'Request access',
          href: fr ? '/fr/travailler-ensemble' : '/en/work-with-us',
          kind: 'secondary',
        },
      ],
      toolbarSubtitle: fr ? 'ATELIER · CHAÎNE ACTIVE' : 'WORKSHOP · ACTIVE CHAIN',
      shareLabel: fr ? 'Partager l’atelier' : 'Share workshop',
      views: {
        label: fr ? 'VUES' : 'VIEWS',
        active: 0,
        items: fr
          ? ['Flux vivant', 'Décisions', 'Relais', 'Archives']
          : ['Live flow', 'Decisions', 'Handoffs', 'Archives'],
      },
      mapLabel: fr
        ? 'Carte abstraite du flux de décision ATLAS / OPS'
        : 'Abstract map of the ATLAS / OPS decision flow',
      journal: {
        label: fr ? 'JOURNAL DE CHANTIER' : 'WORK LOG',
        body: fr
          ? 'Le relais « activer » est prêt à être éprouvé sur le terrain.'
          : 'The “activate” handoff is ready to be tested in the field.',
        action: fr ? 'OUVRIR LE TEST' : 'OPEN TEST',
      },
      placeholder: true,
    },
    operations: {
      eyebrow: fr ? 'STATIONS OPÉRATIONNELLES' : 'OPERATIONAL STATIONS',
      title: fr ? 'EN OPÉRATION' : 'IN OPERATION',
      intro: fr
        ? 'Des outils vivants, au travail dans leur environnement réel.'
        : 'Living tools at work in their real environment.',
    },
    stations: [
      {
        id: 'cirrus',
        name: 'CIRRUS',
        function: fr
          ? 'Lire les transformations lentes avant qu’elles ne deviennent visibles.'
          : 'Read slow transformations before they become visible.',
        status: 'deployed',
        statusLabel: fr ? 'EN LIGNE' : 'ONLINE',
        media: localizedMedia('cirrus', locale),
        action: { label: fr ? 'Ouvrir' : 'Open', href: '#cirrus', kind: 'quiet' },
        placeholder: true,
      },
      {
        id: 'mosaic',
        name: 'MOSAÏQUE',
        function: fr
          ? 'Assembler des points de vue sans les aplatir.'
          : 'Assemble points of view without flattening them.',
        status: 'building',
        statusLabel: fr ? 'OUVERT' : 'OPEN',
        media: localizedMedia('mosaic', locale),
        action: { label: fr ? 'Ouvrir' : 'Open', href: '#mosaic', kind: 'quiet' },
        placeholder: true,
      },
      {
        id: 'radar-cli',
        name: 'RADAR CLI',
        function: fr
          ? 'Détecter les signaux faibles depuis le terminal.'
          : 'Detect weak signals from the terminal.',
        status: 'deployed',
        statusLabel: fr ? 'EN LIGNE' : 'ONLINE',
        media: localizedMedia('radar', locale),
        action: { label: fr ? 'Ouvrir' : 'Open', href: '#radar-cli', kind: 'quiet' },
        placeholder: true,
      },
      {
        id: 'sonar',
        name: 'SONAR',
        function: fr
          ? 'Écouter la profondeur d’une situation avant d’agir.'
          : 'Listen to the depth of a situation before acting.',
        status: 'deployed',
        statusLabel: fr ? 'EN OPÉRATION' : 'IN OPERATION',
        media: localizedMedia('sonar', locale),
        action: { label: fr ? 'Ouvrir' : 'Open', href: '#sonar', kind: 'quiet' },
        placeholder: true,
      },
      {
        id: 'detour',
        name: 'DÉTOUR',
        function: fr
          ? 'Produire une autre route quand le chemin se ferme.'
          : 'Produce another route when the path closes.',
        status: 'private',
        statusLabel: fr ? 'SUR INVITATION' : 'BY INVITATION',
        media: localizedMedia('detour', locale),
        action: {
          label: fr ? 'Demander un accès' : 'Request access',
          href: fr ? '/fr/travailler-ensemble' : '/en/work-with-us',
          kind: 'quiet',
        },
        placeholder: true,
      },
    ],
    manifesto: {
      eyebrow: fr ? 'NOTRE MOUVEMENT' : 'OUR MOVEMENT',
      lines: fr ? ['Construire,', 'observer,', 'ajuster.'] : ['Build,', 'observe,', 'adjust.'],
      body: fr
        ? 'Tous nos systèmes partagent le même geste : faire, regarder ce que le réel répond, puis remettre l’ouvrage en mouvement.'
        : 'All our systems share the same gesture: make, observe what reality returns, then put the work back in motion.',
      signature: 'SYSTEMS IN MOTION · AKIKSYSTEMS',
    },
    workbench: {
      title: fr ? 'ÉTABLI' : 'WORKBENCH',
      intro: fr
        ? 'Outils, scripts et petites pièces pour accélérer le travail quotidien.'
        : 'Tools, scripts and small pieces that accelerate everyday work.',
      columns: {
        name: fr ? 'NOM' : 'NAME',
        function: fr ? 'FONCTION' : 'FUNCTION',
        environment: fr ? 'ENVIRONNEMENT' : 'ENVIRONMENT',
        access: fr ? 'ACCÈS' : 'ACCESS',
      },
      tools: [
        {
          name: 'TRACE',
          function: fr ? 'Consigner les décisions' : 'Record decisions',
          environment: fr ? 'NAVIGATEUR' : 'BROWSER',
          action: { label: fr ? 'OUVRIR' : 'OPEN', href: '#trace', kind: 'quiet' },
          placeholder: true,
        },
        {
          name: 'RELAIS',
          function: fr ? 'Passer le témoin proprement' : 'Hand work over cleanly',
          environment: 'SLACK',
          action: { label: fr ? 'INSTALLER' : 'INSTALL', href: '#relais', kind: 'quiet' },
          placeholder: true,
        },
        {
          name: 'BALISE',
          function: fr ? 'Vérifier une mise en ligne' : 'Verify a release',
          environment: 'TERMINAL',
          action: { label: fr ? 'COPIER' : 'COPY', href: '#balise', kind: 'quiet' },
          placeholder: true,
        },
        {
          name: 'SILLON',
          function: fr ? 'Rejouer un parcours' : 'Replay a journey',
          environment: 'SCRIPT',
          action: { label: fr ? 'CONSULTER' : 'VIEW', href: '#sillon', kind: 'quiet' },
          placeholder: true,
        },
      ],
    },
    perspectives: {
      eyebrow: 'PERSPECTIVES',
      title: fr
        ? 'Les systèmes commencent souvent par une hypothèse.'
        : 'Systems often begin with a hypothesis.',
      intro: fr
        ? 'Avant l’outil, il y a une question. Une tension. Une manière différente de regarder ce qui pourrait fonctionner.'
        : 'Before the tool, there is a question. A tension. A different way of looking at what could work.',
      actions: [
        {
          label: fr ? 'Lire nos perspectives' : 'Read our perspectives',
          href: fr ? '/fr/ecrits' : '/en/writings',
          kind: 'secondary',
        },
        {
          label: fr ? 'Construire un système ensemble' : 'Build a system together',
          href: fr ? '/fr/travailler-ensemble' : '/en/work-with-us',
          kind: 'primary',
        },
      ],
    },
    footer: {
      brandTagline: 'SYSTEMIC SCALE',
      copyright: '© 2026 AkikSystems',
      legal: fr
        ? [
            { href: '/fr/confidentialite', label: 'Confidentialité' },
            { href: '/fr/mentions-legales', label: 'Mentions légales' },
            { href: '/fr/cookies', label: 'Cookies' },
          ]
        : [
            { href: '/en/privacy', label: 'Privacy' },
            { href: '/en/legal-notice', label: 'Legal notice' },
            { href: '/en/cookies', label: 'Cookies' },
          ],
    },
  };
}

export const systemsPageContent: Record<Locale, SystemsPageContent> = {
  en: contentFor('en'),
  fr: contentFor('fr'),
};
