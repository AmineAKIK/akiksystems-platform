import type { Locale } from '../i18n/locales';

export type SystemsStatus = 'building' | 'deployed' | 'private' | 'experimental' | 'archived';

export interface SystemsAction {
  label: string;
  href: string;
  kind: 'primary' | 'secondary';
}

export interface SystemsStation {
  id: 'cirrus' | 'mosaique' | 'radar-cli' | 'sonar' | 'detour';
  name: string;
  function: string;
  status: SystemsStatus;
  statusLabel: string;
  note: string;
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
    title: string;
    state: string;
    intro: string;
  };
  rail: Array<{ index: string; label: string }>;
  atlas: {
    eyebrow: string;
    name: string;
    updated: string;
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
    secondary: SystemsAction;
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
      title: 'ATELIER AKIKSYSTEMS',
      state: 'OUVERT',
      intro: 'Une composition produit immersive pour entrer dans la chaîne d’opérations.',
    },
    rail: [
      { index: '01', label: 'CONCEVOIR' },
      { index: '02', label: 'ASSEMBLER' },
      { index: '03', label: 'TESTER' },
      { index: '04', label: 'DÉPLOYER' },
      { index: '05', label: 'OBSERVER' },
    ],
    atlas: {
      eyebrow: 'POSTE DE TRAVAIL OUVERT',
      name: 'ATLAS / OPS',
      updated: 'Mis à jour aujourd’hui',
      summary: 'Un espace pour transformer les décisions complexes en chaînes d’action lisibles.',
      status: 'building',
      statusLabel: 'EN CONSTRUCTION',
      note: 'Architecture, priorités et signaux restent volontairement inspectables.',
      bullets: [
        'Clarifier la chaîne de décision',
        'Tester les relais d’équipe',
        'Préparer la mise en ligne',
      ],
      actions: [
        { label: 'Prévisualiser', href: '#operation', kind: 'primary' },
        { label: 'Inspecter', href: '#workbench', kind: 'secondary' },
        { label: 'Demander un accès', href: '#perspectives', kind: 'secondary' },
      ],
    },
    operation: {
      eyebrow: 'STATIONS OPÉRATIONNELLES',
      title: 'EN OPÉRATION',
      intro: 'Des outils vivants, au travail dans leur environnement réel.',
    },
    stations: [
      {
        id: 'cirrus',
        name: 'CIRRUS',
        function: 'Lire les transformations lentes avant qu’elles ne deviennent visibles.',
        status: 'deployed',
        statusLabel: 'FLUX ACTIF',
        note: 'Orchestration et circulation des décisions.',
      },
      {
        id: 'mosaique',
        name: 'MOSAÏQUE',
        function: 'Assembler des points de vue sans les aplatir.',
        status: 'building',
        statusLabel: 'OUVERT',
        note: 'Composition collective.',
      },
      {
        id: 'radar-cli',
        name: 'RADAR CLI',
        function: 'Détecter les signaux faibles depuis le terminal.',
        status: 'deployed',
        statusLabel: 'EN LIGNE',
        note: 'Outil de détection.',
      },
      {
        id: 'sonar',
        name: 'SONAR',
        function: 'Écouter la profondeur d’une situation avant d’agir.',
        status: 'deployed',
        statusLabel: 'EN OPÉRATION',
        note: 'Lecture profonde.',
      },
      {
        id: 'detour',
        name: 'DÉTOUR',
        function: 'Produire une autre route quand le chemin se ferme.',
        status: 'building',
        statusLabel: 'SUR INVITATION',
        note: 'Trajectoires alternatives.',
      },
    ],
    manifesto: {
      eyebrow: 'NOTRE MOUVEMENT',
      lines: ['Construire,', 'observer,', 'ajuster.'],
      body: 'Tous nos systèmes partagent le même geste : faire, regarder ce que le réel répond, puis remettre l’ouvrage en mouvement.',
      signature: 'SYSTEMS IN MOTION · AKIKSYSTEMS',
    },
    workbench: {
      eyebrow: 'OUTILS / WORKBENCH',
      title: 'ÉTABLI',
      intro: 'Outils, scripts et petites pièces pour accélérer le travail quotidien.',
      tools: [
        {
          name: 'TRACE',
          function: 'Consigner les décisions',
          environment: 'NAVIGATEUR',
          action: 'OUVRIR',
        },
        {
          name: 'RELAIS',
          function: 'Passer le témoin proprement',
          environment: 'SLACK',
          action: 'INSTALLER',
        },
        {
          name: 'BALISE',
          function: 'Vérifier une mise en ligne',
          environment: 'TERMINAL',
          action: 'COPIER',
        },
        {
          name: 'SILLON',
          function: 'Rejouer un parcours',
          environment: 'SCRIPT',
          action: 'CONSULTER',
        },
      ],
    },
    perspectives: {
      eyebrow: 'PERSPECTIVES',
      title: 'Les systèmes commencent souvent par une hypothèse.',
      body: 'Avant l’outil, il y a une question. Une tension. Une manière différente de regarder ce qui pourrait fonctionner.',
      primary: {
        label: 'Construire un système ensemble',
        href: '/fr/travailler-ensemble',
        kind: 'primary',
      },
      secondary: {
        label: 'Lire nos perspectives',
        href: '/fr/ecrits',
        kind: 'secondary',
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
      title: 'AKIKSYSTEMS WORKSHOP',
      state: 'OPEN',
      intro: 'An immersive product composition for entering the chain of operations.',
    },
    rail: [
      { index: '01', label: 'DESIGN' },
      { index: '02', label: 'ASSEMBLE' },
      { index: '03', label: 'TEST' },
      { index: '04', label: 'DEPLOY' },
      { index: '05', label: 'OBSERVE' },
    ],
    atlas: {
      eyebrow: 'OPEN WORKSTATION',
      name: 'ATLAS / OPS',
      updated: 'Updated today',
      summary: 'A space for turning complex decisions into readable chains of action.',
      status: 'building',
      statusLabel: 'BUILDING',
      note: 'Architecture, priorities and signals remain deliberately inspectable.',
      bullets: ['Clarify the decision chain', 'Test team handoffs', 'Prepare the release'],
      actions: [
        { label: 'Preview', href: '#operation', kind: 'primary' },
        { label: 'Inspect', href: '#workbench', kind: 'secondary' },
        { label: 'Request access', href: '#perspectives', kind: 'secondary' },
      ],
    },
    operation: {
      eyebrow: 'OPERATIONAL STATIONS',
      title: 'IN OPERATION',
      intro: 'Living tools, at work in their real environment.',
    },
    stations: [
      {
        id: 'cirrus',
        name: 'CIRRUS',
        function: 'Read slow transformations before they become visible.',
        status: 'deployed',
        statusLabel: 'ACTIVE FLOW',
        note: 'Decision orchestration and circulation.',
      },
      {
        id: 'mosaique',
        name: 'MOSAÏQUE',
        function: 'Assemble viewpoints without flattening them.',
        status: 'building',
        statusLabel: 'OPEN',
        note: 'Collective composition.',
      },
      {
        id: 'radar-cli',
        name: 'RADAR CLI',
        function: 'Detect weak signals from the terminal.',
        status: 'deployed',
        statusLabel: 'ONLINE',
        note: 'Detection tool.',
      },
      {
        id: 'sonar',
        name: 'SONAR',
        function: 'Listen to the depth of a situation before acting.',
        status: 'deployed',
        statusLabel: 'IN OPERATION',
        note: 'Deep reading.',
      },
      {
        id: 'detour',
        name: 'DÉTOUR',
        function: 'Produce another route when the path closes.',
        status: 'building',
        statusLabel: 'BY INVITATION',
        note: 'Alternative trajectories.',
      },
    ],
    manifesto: {
      eyebrow: 'OUR MOVEMENT',
      lines: ['Build,', 'observe,', 'adjust.'],
      body: 'Every system shares the same gesture: make something, watch what reality returns, then put the work back in motion.',
      signature: 'SYSTEMS IN MOTION · AKIKSYSTEMS',
    },
    workbench: {
      eyebrow: 'TOOLS / WORKBENCH',
      title: 'WORKBENCH',
      intro: 'Tools, scripts and small pieces that speed up everyday work.',
      tools: [
        { name: 'TRACE', function: 'Record decisions', environment: 'BROWSER', action: 'OPEN' },
        {
          name: 'RELAIS',
          function: 'Hand work over cleanly',
          environment: 'SLACK',
          action: 'INSTALL',
        },
        { name: 'BALISE', function: 'Verify a release', environment: 'TERMINAL', action: 'COPY' },
        { name: 'SILLON', function: 'Replay a path', environment: 'SCRIPT', action: 'VIEW' },
      ],
    },
    perspectives: {
      eyebrow: 'PERSPECTIVES',
      title: 'Systems often begin with a hypothesis.',
      body: 'Before the tool comes a question. A tension. A different way of looking at what might work.',
      primary: {
        label: 'Build a system together',
        href: '/en/work-with-us',
        kind: 'primary',
      },
      secondary: {
        label: 'Read our perspectives',
        href: '/en/writings',
        kind: 'secondary',
      },
    },
  },
};
