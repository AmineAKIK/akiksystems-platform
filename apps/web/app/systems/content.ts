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
  note: string;
  visual: 'flow' | 'mosaic' | 'radar' | 'sonar' | 'detour';
}

export interface SystemsTool {
  name: string;
  function: string;
  environment: string;
  status: SystemsStatus;
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
    summary: string;
    status: SystemsStatus;
    note: string;
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

const shared = {
  stations: [
    { id: 'cirrus', name: 'CIRRUS', status: 'deployed', visual: 'flow' },
    { id: 'mosaique', name: 'MOSAÏQUE', status: 'building', visual: 'mosaic' },
    { id: 'radar-cli', name: 'RADAR CLI', status: 'experimental', visual: 'radar' },
    { id: 'sonar', name: 'SONAR', status: 'building', visual: 'sonar' },
    { id: 'detour', name: 'DÉTOUR', status: 'experimental', visual: 'detour' },
  ] as const,
  tools: [
    { name: 'TRACE', status: 'deployed' },
    { name: 'RELAIS', status: 'private' },
    { name: 'BALISE', status: 'experimental' },
    { name: 'SILLON', status: 'building' },
  ] as const,
};

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
      { index: '02', label: 'OBSERVER' },
      { index: '03', label: 'TESTER' },
      { index: '04', label: 'AFFINER' },
      { index: '05', label: 'PARTAGER' },
    ],
    atlas: {
      eyebrow: 'POSTE DE TRAVAIL / 001',
      name: 'ATLAS / OPS',
      summary: 'Un espace pour transformer les décisions complexes en chaînes d’action lisibles.',
      status: 'building',
      note: 'Architecture, priorités et signaux restent volontairement inspectables.',
      actions: [
        { label: 'Prévisualiser', href: '#operation', kind: 'primary' },
        { label: 'Inspecter', href: '#workbench', kind: 'secondary' },
        { label: 'Notes d’atelier', href: '#perspectives', kind: 'secondary' },
      ],
    },
    operation: {
      eyebrow: 'STATIONS OPÉRATIONNELLES',
      title: 'EN OPÉRATION',
      intro:
        'Cinq surfaces, un même atelier : observer les flux, comparer les signaux et ajuster sans masquer les décisions.',
    },
    stations: shared.stations.map((station) => {
      const copy = {
        cirrus: {
          function:
            'Orchestrer des flux énergétiques et rendre les décisions opératoires visibles.',
          note: 'Flux, dépendances et bascules dans une même station.',
        },
        mosaique: {
          function: 'Assembler des signaux dispersés en une vue exploitable.',
          note: 'Une surface dense pour croiser plusieurs lectures sans perdre le contexte.',
        },
        'radar-cli': {
          function:
            'Explorer relations, alertes et bascules depuis une interface compacte.',
          note:
            'Le détail reste accessible sans transformer la station en tableau de bord décoratif.',
        },
        sonar: {
          function: 'Écouter les pulsations d’un système avant qu’il ne dévie.',
          note: 'Lecture rapide, signal court, sortie immédiate.',
        },
        detour: {
          function: 'Produire une alternative avant le chemin évident.',
          note: 'Deux chemins sont comparés avant de retenir une trajectoire.',
        },
      }[station.id];
      return { ...station, ...copy };
    }),
    manifesto: {
      eyebrow: 'MODE DE TRAVAIL',
      lines: ['Construire,', 'observer,', 'ajuster.'],
      body:
        'Tous nos systèmes partagent le même geste : faire, regarder ce que le réel répond, puis remettre l’ouvrage en mouvement.',
    },
    workbench: {
      eyebrow: 'OUTILS / WORKBENCH',
      title: 'ÉTABLI',
      intro:
        'Quatre outils compacts pour documenter, relayer, signaler et reprendre le travail.',
      tools: shared.tools.map((tool) => {
        const copy = {
          TRACE: { function: 'Capturer la décision', environment: 'atelier' },
          RELAIS: { function: 'Passer le relais proprement', environment: 'équipe' },
          BALISE: { function: 'Voir ce qui mérite attention', environment: 'terminal' },
          SILLON: {
            function: 'Reprendre une piste sans perdre le contexte',
            environment: 'local',
          },
        }[tool.name];
        return { ...tool, ...copy };
      }),
    },
    perspectives: {
      eyebrow: 'PERSPECTIVES',
      title: 'Les systèmes commencent souvent par une hypothèse.',
      body:
        'Avant l’outil, il y a une question. Une tension. Une manière différente de regarder ce qui pourrait fonctionner.',
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
        'AkikSystems workshop: software systems, tools, and experiments presented as an inspectable chain of operations.',
    },
    hero: {
      eyebrow: 'SYSTEMS / SYSTEMIC SCALE',
      title: 'AKIKSYSTEMS WORKSHOP',
      state: 'OPEN',
      intro: 'An immersive product composition for entering the operating chain.',
    },
    rail: [
      { index: '01', label: 'DESIGN' },
      { index: '02', label: 'OBSERVE' },
      { index: '03', label: 'TEST' },
      { index: '04', label: 'REFINE' },
      { index: '05', label: 'SHARE' },
    ],
    atlas: {
      eyebrow: 'WORKSTATION / 001',
      name: 'ATLAS / OPS',
      summary: 'A space for turning complex decisions into readable chains of action.',
      status: 'building',
      note: 'Architecture, priorities, and signals remain deliberately inspectable.',
      actions: [
        { label: 'Preview', href: '#operation', kind: 'primary' },
        { label: 'Inspect', href: '#workbench', kind: 'secondary' },
        { label: 'Workshop notes', href: '#perspectives', kind: 'secondary' },
      ],
    },
    operation: {
      eyebrow: 'OPERATIONAL STATIONS',
      title: 'IN OPERATION',
      intro:
        'Five surfaces, one workshop: observe flows, compare signals, and adjust without hiding decisions.',
    },
    stations: shared.stations.map((station) => {
      const copy = {
        cirrus: {
          function: 'Orchestrate energy flows and make operational decisions visible.',
          note: 'Flows, dependencies, and switches in one station.',
        },
        mosaique: {
          function: 'Assemble dispersed signals into an actionable view.',
          note:
            'A dense surface for crossing multiple readings without losing context.',
        },
        'radar-cli': {
          function:
            'Explore relations, alerts, and switches through a compact interface.',
          note:
            'Detail remains accessible without turning the station into a decorative dashboard.',
        },
        sonar: {
          function: 'Listen to a system’s pulse before it drifts.',
          note: 'Fast reading, short signal, immediate exit.',
        },
        detour: {
          function: 'Produce an alternative before the obvious path.',
          note: 'Two paths are compared before a trajectory is retained.',
        },
      }[station.id];
      return { ...station, ...copy };
    }),
    manifesto: {
      eyebrow: 'WORKING MODE',
      lines: ['Build,', 'observe,', 'adjust.'],
      body:
        'Every system shares the same gesture: make something, watch what reality returns, then put the work back in motion.',
    },
    workbench: {
      eyebrow: 'TOOLS / WORKBENCH',
      title: 'WORKBENCH',
      intro: 'Four compact tools to document, relay, signal, and resume work.',
      tools: shared.tools.map((tool) => {
        const copy = {
          TRACE: { function: 'Capture the decision', environment: 'workshop' },
          RELAIS: { function: 'Hand work over cleanly', environment: 'team' },
          BALISE: { function: 'See what deserves attention', environment: 'terminal' },
          SILLON: {
            function: 'Resume a path without losing context',
            environment: 'local',
          },
        }[tool.name];
        return { ...tool, ...copy };
      }),
    },
    perspectives: {
      eyebrow: 'PERSPECTIVES',
      title: 'Systems often begin with a hypothesis.',
      body:
        'Before the tool comes a question. A tension. A different way of looking at what might work.',
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
