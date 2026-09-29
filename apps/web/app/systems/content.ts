import type { Locale } from '../i18n/locales';

export type SystemsStatus = 'building' | 'deployed' | 'private' | 'experimental' | 'archived';

export interface SystemsAction {
  label: string;
  href: string;
  kind: 'primary' | 'secondary';
  disabled?: boolean;
}

export interface SystemsStation {
  id: 'protocap' | 'alkhawarizmi' | 'oria' | 'akiksystems';
  name: string;
  function: string;
  status: SystemsStatus;
  statusLabel: string;
  note: string;
  /** External page the whole card opens, for stations that have one. */
  href?: string;
  /** Accessible name of the interactive map, for stations that have one. */
  mapLabel?: string;
}

export interface SystemsTool {
  name: string;
  function: string;
  environment: string;
  action: string;
}

export interface SystemsPageContent {
  meta: {
    title: string;
    description: string;
  };
  hero: {
    eyebrow: string;
    title: [string, string];
    state: string;
    intro: [string, string];
  };
  rail: Array<{ index: string; label: string }>;
  sentinel: {
    eyebrow: string;
    name: string;
    updated: string;
    mapLabel: string;
    summary: string;
    status: SystemsStatus;
    statusLabel: string;
    note: string;
    bullets: string[];
    actions: SystemsAction[];
  };
  operation: {
    eyebrow: string;
    title: string;
    intro: string;
  };
  stations: SystemsStation[];
  manifesto: {
    eyebrow: string;
    lines: [string, string, string];
    body: string;
    signature: string;
  };
  workbench: {
    eyebrow: string;
    title: string;
    intro: string;
    tools: SystemsTool[];
  };
  perspectives: {
    eyebrow: string;
    title: string;
    body: string;
    primary: SystemsAction;
  };
}

export const systemsPageContent: Record<Locale, SystemsPageContent> = {
  fr: {
    meta: {
      title: 'Systèmes',
      description:
        'Atelier AkikSystems : systèmes, outils et expériences logicielles présentés comme une chaîne d’opérations inspectable.',
    },
    hero: {
      eyebrow: 'SYSTÈMES / SYSTEMIC SCALE',
      title: ['LIBRES', 'PAR LA'],
      state: 'MAÎTRISE',
      intro: ['La machine prend la charge.', 'L’humain prend de la hauteur.'],
    },
    rail: [
      { index: '01', label: 'ANALYSER' },
      { index: '02', label: 'MODÉLISER' },
      { index: '03', label: 'IMPLÉMENTER' },
      { index: '04', label: 'MESURER' },
      { index: '05', label: 'ITÉRER' },
    ],
    sentinel: {
      eyebrow: 'SYSTÈME EN CONSTRUCTION',
      name: 'SENTINEL',
      updated: 'Mis à jour aujourd’hui',
      mapLabel:
        'Carte interactive de Sentinel : cycle des incidents, rôles, architecture, sécurité, design et livraison',
      summary:
        'Suivre une anomalie de production, de la déclaration à la capitalisation, sans jamais perdre la trace des décisions.',
      status: 'building',
      statusLabel: 'EN CONSTRUCTION',
      note: 'Parcourez la carte : chaque orbe, lien et pastille est inspectable.',
      bullets: ['Signaler vite et juste', 'Résoudre et documenter', 'Capitaliser pour apprendre'],
      actions: [
        { label: 'Ouvrir l’application', href: 'https://sentinel.akiksystems.fr', kind: 'primary' },
        { label: 'Demander un accès', href: '#', kind: 'secondary', disabled: true },
      ],
    },
    operation: {
      eyebrow: 'STATIONS OPÉRATIONNELLES',
      title: 'EN OPÉRATION',
      intro: 'ProtoCap rend l’attention au réel.',
    },
    stations: [
      {
        id: 'protocap',
        name: 'PROTOCAP',
        function: 'Huit outils de poste qui disent honnêtement ce qu’ils prouvent.',
        status: 'deployed',
        statusLabel: 'EN LIGNE',
        note: 'Démonstrateur d’ingénierie pour la ligne de production.',
        mapLabel: 'Carte interactive de ProtoCap',
      },
      {
        id: 'alkhawarizmi',
        name: 'AL-KHAWARIZMI',
        function: 'Des fiches systémiques pour apprendre le développement, nœud par nœud.',
        status: 'deployed',
        statusLabel: 'EN LIGNE',
        note: 'Fiches systémiques.',
        href: 'https://amineakik.github.io/alkhawarizmi/',
      },
      {
        id: 'oria',
        name: 'ORIA',
        function: 'Manger, dormir et récupérer selon son rythme, même en horaires atypiques.',
        status: 'deployed',
        statusLabel: 'EN LIGNE',
        note: 'Étude de cas.',
        href: 'https://amineakik.github.io/orianutrition/',
      },
      {
        id: 'akiksystems',
        name: 'AKIKSYSTEMS',
        function:
          'La plateforme que vous parcourez : rendu serveur, deux langues, livraison continue.',
        status: 'deployed',
        statusLabel: 'EN LIGNE',
        note: 'La plateforme et ses outils.',
      },
    ],
    manifesto: {
      eyebrow: 'NOTRE MOUVEMENT',
      lines: ['Concevoir,', 'mesurer,', 'améliorer.'],
      body: 'Chaque système suit une même discipline : formuler une hypothèse, mesurer ses effets dans le réel et ajuster avec précision.',
      signature: 'SYSTEMS IN MOTION · AKIKSYSTEMS',
    },
    workbench: {
      eyebrow: 'OUTILS / WORKBENCH',
      title: 'ÉTABLI',
      intro:
        'Un ensemble d’outils d’ingénierie conçu pour fiabiliser la livraison et l’exploitation de nos systèmes.',
      tools: [
        {
          name: 'DÉPLOIEMENT PAR SHA',
          function: 'Livrer un commit précis, revenir en arrière si la santé échoue',
          environment: 'SSH · DOCKER',
          action: 'EN PRODUCTION',
        },
        {
          name: 'CARTES ORBITALES',
          function: 'Explorer un système nœud par nœud, sous CSP stricte',
          environment: 'SVG · NAVIGATEUR',
          action: 'SENTINEL · PROTOCAP',
        },
        {
          name: 'SMOKE RESPONSIVE',
          function: 'Contrôler chaque page de 320 à 2560 px',
          environment: 'PLAYWRIGHT',
          action: 'À CHAQUE COMMIT',
        },
        {
          name: 'CONFIG VALIDÉE',
          function: 'Refuser de démarrer sur une configuration invalide',
          environment: 'NODE.JS · ZOD',
          action: 'AU DÉMARRAGE',
        },
      ],
    },
    perspectives: {
      eyebrow: 'PERSPECTIVES',
      title: 'Les systèmes commencent souvent par une hypothèse.',
      body: 'Avant l’outil, il y a une question. Une tension. Une manière différente de regarder ce qui pourrait fonctionner.',
      primary: {
        label: 'Construisons votre système',
        href: '/fr/travailler-ensemble',
        kind: 'secondary',
        disabled: true,
      },
    },
  },
  en: {
    meta: {
      title: 'Systems',
      description:
        'The AkikSystems workshop: systems, tools and software experiments presented as an inspectable chain of operations.',
    },
    hero: {
      eyebrow: 'SYSTEMS / SYSTEMIC SCALE',
      title: ['FREE', 'THROUGH'],
      state: 'MASTERY',
      intro: ['Machines take the grind.', 'People keep the growth.'],
    },
    rail: [
      { index: '01', label: 'ANALYZE' },
      { index: '02', label: 'MODEL' },
      { index: '03', label: 'IMPLEMENT' },
      { index: '04', label: 'MEASURE' },
      { index: '05', label: 'ITERATE' },
    ],
    sentinel: {
      eyebrow: 'SYSTEM UNDER CONSTRUCTION',
      name: 'SENTINEL',
      updated: 'Updated today',
      mapLabel:
        'Interactive map of Sentinel: incident cycle, roles, architecture, security, design and delivery',
      summary:
        'Follow a production anomaly from report to shared knowledge, without ever losing the trail of decisions.',
      status: 'building',
      statusLabel: 'BUILDING',
      note: 'Explore the map: every orb, link and chip can be inspected. Map content is in French.',
      bullets: ['Report fast and right', 'Resolve and document', 'Capitalise to learn'],
      actions: [
        { label: 'Open application', href: 'https://sentinel.akiksystems.fr', kind: 'primary' },
        { label: 'Request access', href: '#', kind: 'secondary', disabled: true },
      ],
    },
    operation: {
      eyebrow: 'OPERATIONAL STATIONS',
      title: 'IN OPERATION',
      intro: 'ProtoCap returns attention to reality.',
    },
    stations: [
      {
        id: 'protocap',
        name: 'PROTOCAP',
        function:
          'Eight shop-floor tools that state honestly what they prove. Map content is in French.',
        status: 'deployed',
        statusLabel: 'ONLINE',
        note: 'Engineering demonstrator for the production line.',
        mapLabel: 'ProtoCap interactive map',
      },
      {
        id: 'alkhawarizmi',
        name: 'AL-KHAWARIZMI',
        function: 'Systemic study cards for learning software development, node by node.',
        status: 'deployed',
        statusLabel: 'ONLINE',
        note: 'Systemic study cards.',
        href: 'https://amineakik.github.io/alkhawarizmi/',
      },
      {
        id: 'oria',
        name: 'ORIA',
        function: 'Eat, sleep and recover at your own pace, even on irregular hours.',
        status: 'deployed',
        statusLabel: 'ONLINE',
        note: 'Case study.',
        href: 'https://amineakik.github.io/orianutrition/',
      },
      {
        id: 'akiksystems',
        name: 'AKIKSYSTEMS',
        function:
          'The platform you are browsing: server rendering, two languages, continuous delivery.',
        status: 'deployed',
        statusLabel: 'ONLINE',
        note: 'The platform and its tools.',
      },
    ],
    manifesto: {
      eyebrow: 'OUR MOVEMENT',
      lines: ['Design,', 'measure,', 'improve.'],
      body: 'Every system follows the same discipline: frame a hypothesis, measure its real-world effects, and refine it with precision.',
      signature: 'SYSTEMS IN MOTION · AKIKSYSTEMS',
    },
    workbench: {
      eyebrow: 'TOOLS / WORKBENCH',
      title: 'WORKBENCH',
      intro:
        'An engineering toolset designed to make the delivery and operation of our systems more reliable.',
      tools: [
        {
          name: 'SHA DEPLOYMENT',
          function: 'Ship an exact commit, roll back if the health check fails',
          environment: 'SSH · DOCKER',
          action: 'IN PRODUCTION',
        },
        {
          name: 'ORBITAL MAPS',
          function: 'Explore a system node by node, under a strict CSP',
          environment: 'SVG · BROWSER',
          action: 'SENTINEL · PROTOCAP',
        },
        {
          name: 'RESPONSIVE SMOKE',
          function: 'Check every page from 320 to 2560 px',
          environment: 'PLAYWRIGHT',
          action: 'ON EVERY COMMIT',
        },
        {
          name: 'VALIDATED CONFIG',
          function: 'Refuse to start on an invalid configuration',
          environment: 'NODE.JS · ZOD',
          action: 'AT STARTUP',
        },
      ],
    },
    perspectives: {
      eyebrow: 'PERSPECTIVES',
      title: 'Systems often begin with a hypothesis.',
      body: 'Before the tool comes a question. A tension. A different way of looking at what might work.',
      primary: {
        label: 'Let’s build your system',
        href: '/en/work-with-us',
        kind: 'secondary',
        disabled: true,
      },
    },
  },
};
