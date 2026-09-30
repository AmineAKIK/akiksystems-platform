import type { Locale } from '../i18n/locales';

export type ProfileIcon =
  'screen' | 'server' | 'database' | 'layers' | 'check' | 'package' | 'link' | 'shield' | 'bolt';

export type ProfileSystemId = 'sentinel' | 'protocap';

export interface ProfileTimelineEntry {
  period: string;
  title: string;
  place: string;
  detail?: string;
}

export interface ProfileLink {
  label: string;
  href: string;
}

export interface ProfilePageContent {
  meta: {
    title: string;
    description: string;
  };
  identity: {
    eyebrow: string;
    name: [string, string];
    photoLabel: string;
    role: string;
    roleDetail: string;
    intro: string;
    contacts: {
      linkedin: ProfileLink;
      github: ProfileLink;
      email: ProfileLink & { ariaLabel: string };
      /** Null until a public number is chosen: a placeholder `tel:` link would be a broken action. */
      phone: (ProfileLink & { ariaLabel: string }) | null;
    };
    facts: Array<{ label: string; value: string }>;
    timeline: {
      eyebrow: string;
      title: string;
      intro: string;
      workLabel: string;
      educationLabel: string;
      work: ProfileTimelineEntry[];
      education: ProfileTimelineEntry[];
    };
  };
  project: {
    label: string;
    follow: ProfileLink;
    name: string;
    summary: string;
    roleLabel: string;
    role: string;
    factsLabel: string;
    facts: Array<{ icon: ProfileIcon; name: string; detail: string }>;
    live: { label: string; link: ProfileLink };
  };
  stack: {
    eyebrow: string;
    title: [string, string];
    intro: string;
    provenIn: { one: string; many: string };
    regionLabel: string;
    inspect: string;
    systems: Record<ProfileSystemId, { name: string; context: string; href: string }>;
    rows: Array<{
      icon: ProfileIcon;
      category: string;
      name: string;
      /** Index of the proof shown first; the others still count as evidence. */
      primary: number;
      proofs: Array<{ system: ProfileSystemId; description: string }>;
    }>;
  };
  perspectives: {
    eyebrow: string;
    title: string;
    body: string;
    tablistLabel: string;
    center: { title: [string, string]; caption: [string, string] };
    loopCaption: string;
    labels: { brings: string; avoids: string; asks: string };
    /** Clockwise from the top of the loop. */
    nodes: [ProfileLens, ProfileLens, ProfileLens, ProfileLens];
  };
  principles: {
    eyebrow: string;
    title: [string, string];
    /** One entry per paragraph. */
    body: string[];
    evidence: { lead: string; links: ProfileLink[] };
  };
  capabilities: {
    eyebrow: string;
    title: [string, string];
    tablistLabel: string;
    groups: [string, string, string];
    labels: { does: string; receives: string; proof: string };
    phases: Array<{
      name: string;
      group: 0 | 1 | 2;
      purpose: string;
      services: string[];
      deliverable: string;
      /** Where this step already runs in a real system; omitted when there is none to show. */
      proof?: string;
    }>;
    loopNote: string;
    throughout: { title: string; items: Array<{ title: string; body: string }> };
  };
  scale: {
    eyebrow: string;
    title: string;
    lead: [string, string];
    body: string;
    method: { eyebrow: string; intro: string };
    tablistLabel: string;
    stepLabel: string;
    labels: { example: string; question: string };
    steps: [ProfileCaseStep, ProfileCaseStep, ProfileCaseStep, ProfileCaseStep];
    logs: {
      caption: [string, string, string, string];
      logsLabel: string;
      causeLabel: string;
      unit: string;
      alarms: Array<{ label: string; count: string; value: number; kind: ProfileAlarmKind }>;
      tags: Record<ProfileAlarmKind | 'resolved', string>;
      cause: [ProfileLogCause, ProfileLogCause, ProfileLogCause, ProfileLogCause];
    };
  };
  emblem: {
    eyebrow: string;
    title: string;
    alt: string;
    /** Reading order used by the stacked (mobile) legend. */
    items: Array<{ id: ProfileEmblemPart; name: string; key: string; text: string }>;
    quote: string;
  };
  cta: {
    eyebrow: string;
    title: [string, string];
    action: ProfileLink;
  };
}

export interface ProfileLens {
  id: 'code' | 'management' | 'field' | 'infrastructure';
  name: string;
  description: string;
  source: string;
  brings: string;
  avoids: string;
  asks: string;
}

export interface ProfileCaseStep {
  tab: string;
  lead: string;
  example: string;
  question: string;
}

export type ProfileEmblemPart = 'eagle' | 'serpent';

export interface ProfileLogCause {
  title: string;
  text: string;
}

export type ProfileAlarmKind = 'managed' | 'caused' | 'own' | 'hypothesis';

/** French typography: a no-break space before « : ; ? ! » » and after « « », so a line never starts with a lone mark. */
function frenchTypography<T>(value: T): T {
  if (typeof value === 'string') {
    return value.replace(/ ([:;?!»])/g, '\u00a0$1').replace(/« /g, '«\u00a0') as T;
  }
  if (Array.isArray(value)) return value.map(frenchTypography) as T;
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, frenchTypography(entry)]),
    ) as T;
  }
  return value;
}

const content: Record<Locale, ProfilePageContent> = {
  fr: {
    meta: {
      title: 'Profil — Mohamed Amine Akik',
      description:
        'Développeur full-stack et fondateur d’AkikSystems : des logiciels métier conçus depuis le terrain industriel, en ligne et vérifiables.',
    },
    identity: {
      eyebrow: 'Profil',
      name: ['Mohamed Amine', 'Akik'],
      photoLabel: 'Portrait de Mohamed Amine Akik',
      role: 'Fondateur d’AkikSystems',
      roleDetail: 'développeur full-stack',
      intro:
        'Je suis développeur, technicien d’infrastructure et d’assistance informatique, mais aussi ouvrier et manager. Plus que des titres, ce sont des mondes que j’ai traversés, et qui m’ont appris à regarder un système dans son ensemble : de la machine à l’humain, du code à l’infrastructure, de l’usage à l’organisation.',
      contacts: {
        linkedin: { label: 'LinkedIn', href: 'https://www.linkedin.com/in/amineakik' },
        github: { label: 'GitHub', href: 'https://github.com/AmineAKIK' },
        email: {
          label: 'E-mail',
          href: 'mailto:contact@akiksystems.com',
          ariaLabel: 'E-mail : contact@akiksystems.com',
        },
        phone: null,
      },
      facts: [
        { label: 'Basé à', value: 'Châtellerault, France' },
        { label: 'Langues', value: 'Français · Arabe · Anglais' },
      ],
      timeline: {
        eyebrow: 'Parcours',
        title: 'Du terrain au logiciel.',
        intro:
          'L’industrie, la direction d’une entreprise et l’informatique : trois terrains traversés avant de concevoir mes propres systèmes.',
        workLabel: 'Expérience',
        educationLabel: 'Formation',
        work: [
          {
            period: '2026 —',
            title: 'Fondateur, AkikSystems',
            place: 'Châtellerault',
            detail:
              'La structure à travers laquelle je conçois et réalise mes systèmes : Sentinel, ProtoCap.',
          },
          { period: '2026 —', title: 'L’Oréal', place: 'Cosmétique dermatologique' },
          {
            period: '2023 — 2025',
            title: 'Marelli',
            place: 'Conducteur de ligne · électronique automobile',
          },
          {
            period: '2022 — 2023',
            title: 'Ateliers Réunis du Centre-Ouest',
            place: 'Maroquinerie de luxe',
          },
          {
            period: '2012 — 2014',
            title: 'Cogérant, AkikTex',
            place: 'Sous-traitance textile, Tunisie',
            detail: 'Production, équipes, trésorerie et relation clients.',
          },
        ],
        education: [
          {
            period: '2025 — 2026',
            title: 'Développeur web et web mobile',
            place: 'Titre professionnel d’État inscrit au RNCP · préparé avec Studi',
          },
          {
            period: '2024 — 2025',
            title: 'Technicien d’assistance informatique',
            place: 'Titre professionnel d’État inscrit au RNCP · préparé avec Studi',
          },
          {
            period: '2010 — 2012',
            title: 'Technicien réseaux et télécoms, stage chez Tunisie Telecom',
            place: 'Sousse, Tunisie',
          },
          {
            period: '2009 — 2010',
            title: 'Baccalauréat programmation et technologies',
            place: 'Tunisie',
          },
        ],
      },
    },
    project: {
      label: 'Projet en cours',
      follow: { label: 'Consulter le projet', href: '/fr/systems#sentinel' },
      name: 'Sentinel',
      summary:
        'Le suivi des incidents d’atelier : une anomalie de production suivie de la déclaration à la capitalisation, sans jamais perdre la trace des décisions.',
      roleLabel: 'Mon rôle',
      role: 'Conception et développement',
      factsLabel: 'Ce qui se vérifie',
      facts: [
        { icon: 'server', name: 'En ligne', detail: 'Instance publique de démonstration' },
        { icon: 'check', name: 'Testé', detail: 'Plus de 1 400 tests, 161 parcours navigateur' },
        {
          icon: 'layers',
          name: 'Documenté',
          detail: 'Conception, design, technique, exploitation',
        },
        { icon: 'package', name: 'Versionné', detail: 'Releases immuables et traçables' },
      ],
      live: {
        label: 'Instance publique',
        link: { label: 'sentinel.akiksystems.fr', href: 'https://sentinel.akiksystems.fr' },
      },
    },
    stack: {
      eyebrow: 'Stack',
      title: ['Ma stack,', 'et où la vérifier.'],
      intro:
        'Chaque technologie renvoie au système qui l’utilise : en ligne, testable, et relié à sa carte sur la page Systèmes.',
      provenIn: { one: 'Prouvé dans 1 système', many: 'Prouvé dans {count} systèmes' },
      regionLabel: 'Preuve pour',
      inspect: 'Inspecter le système',
      systems: {
        sentinel: {
          name: 'Sentinel',
          context: 'Suivi des incidents d’atelier',
          href: '/fr/systems#sentinel',
        },
        protocap: {
          name: 'ProtoCap',
          context: 'Outils pour la ligne de production',
          href: '/fr/systems#protocap',
        },
      },
      rows: [
        {
          icon: 'screen',
          category: 'Front-end',
          name: 'TypeScript · React',
          primary: 0,
          proofs: [
            {
              system: 'sentinel',
              description:
                'Interfaces des trois espaces, hooks d’orchestration, requêtes annulables, responsive et contrôles RGAA. 787 tests unitaires côté interface.',
            },
            {
              system: 'protocap',
              description:
                'Application installable (PWA), états persistés localement avec migrations de version, parcours testés sur Chromium et WebKit.',
            },
          ],
        },
        {
          icon: 'server',
          category: 'Back-end',
          name: 'Node.js · Express',
          primary: 1,
          proofs: [
            {
              system: 'sentinel',
              description:
                'API validée par Zod, sessions JWT en cookies HTTP-only séparées par espace, limitation de débit, démarrage refusé si la configuration est invalide.',
            },
            {
              system: 'protocap',
              description:
                'Serveur qui encadre l’IA : authentification, limites de débit et de coût, contenu de référence détenu côté serveur.',
            },
          ],
        },
        {
          icon: 'database',
          category: 'Données',
          name: 'PostgreSQL',
          primary: 0,
          proofs: [
            {
              system: 'sentinel',
              description:
                'Modèle relationnel et JSONB, 50 migrations immuables vérifiées par empreinte, transactions et verrous, 165 tests d’intégration sur base réelle.',
            },
          ],
        },
        {
          icon: 'check',
          category: 'Qualité',
          name: 'Tests automatisés',
          primary: 0,
          proofs: [
            {
              system: 'sentinel',
              description:
                'Plus de 1 400 tests unitaires, 161 parcours navigateur Playwright, CI en six jobs sur base PostgreSQL réelle.',
            },
            {
              system: 'protocap',
              description:
                'Tests par mutation, preuves rouge puis verte, audits d’accessibilité axe, recette finale en 45 points fermés avec preuve.',
            },
          ],
        },
        {
          icon: 'package',
          category: 'Exploitation',
          name: 'Docker · déploiement',
          primary: 0,
          proofs: [
            {
              system: 'sentinel',
              description:
                'Images non-root publiées par empreinte, Docker Compose derrière un proxy, sauvegarde et restauration testées, sur VPS.',
            },
            {
              system: 'protocap',
              description:
                'Image multi-étapes non-root, deux origines séparées (réelle et démo), sondes de santé et de disponibilité.',
            },
          ],
        },
        {
          icon: 'link',
          category: 'Intégrations',
          name: 'IA · API de LLM',
          primary: 0,
          proofs: [
            {
              system: 'protocap',
              description:
                'Assistante IA branchée sur une API de LLM, données transmises minimisées, 14 cas de référence évalués automatiquement.',
            },
          ],
        },
      ],
    },
    perspectives: {
      eyebrow: 'Ce que je relie',
      title: 'Quatre regards, une boucle de conception.',
      body: 'Chaque monde du parcours est devenu une question que je pose à chaque projet. Les contraintes de production, d’équipe et d’exploitation entrent ainsi dans la conception dès le cadrage, au lieu d’être découvertes à la mise en service.',
      tablistLabel: 'Quatre regards reliés en boucle autour d’une vision systémique',
      center: { title: ['Vision', 'systémique'], caption: ['Relier, arbitrer,', 'concevoir.'] },
      loopCaption: 'Chaque tour affine la solution',
      labels: {
        brings: 'Ce que ça apporte',
        avoids: 'Ce que ça évite',
        asks: 'Questions que je me pose',
      },
      nodes: [
        {
          id: 'code',
          name: 'Code',
          description: 'Écrire, tester et livrer du logiciel qui tient dans le temps.',
          source:
            'Sentinel et ProtoCap, en ligne. Titre professionnel d’État Développeur web et web mobile (RNCP, 2026).',
          brings: 'Savoir ce qu’une idée coûte à construire, à tester et à maintenir.',
          avoids: 'Les promesses impossibles à tenir, et la dette qu’on découvre trop tard.',
          asks: 'Comment le tester ? Qui le maintiendra ? Que se passe-t-il quand ça casse ?',
        },
        {
          id: 'management',
          name: 'Management',
          description:
            'Coordonner équipes, priorités et ressources, jusqu’aux délais et au budget.',
          source:
            'Cogérant d’AkikTex, sous-traitance textile (2012 – 2014) : production, équipes, trésorerie, clients.',
          brings:
            'Savoir ce qu’une solution demande aux équipes, en temps, en moyens et en changement.',
          avoids: 'Les outils imposés qu’une équipe n’a ni le temps ni l’envie d’adopter.',
          asks: 'Qui décide ? Qui porte le changement ? Avec quel budget et quel délai ?',
        },
        {
          id: 'field',
          name: 'Terrain',
          description: 'Voir l’usage réel, les contraintes concrètes et les effets sur le travail.',
          source:
            'Production industrielle : électronique automobile, cosmétique dermatologique, maroquinerie de luxe.',
          brings:
            'Du réel : le retour d’expérience, les signaux faibles, les contraintes qu’on ne voit pas depuis un schéma.',
          avoids: 'Les solutions théoriques, déconnectées de l’exploitation ou du besoin.',
          asks: 'Qui va vraiment l’utiliser ? Dans quelles conditions ? Que se passera-t-il en production ?',
        },
        {
          id: 'infrastructure',
          name: 'Infrastructure',
          description: 'Réseaux, serveurs, postes : tout ce sur quoi le logiciel tourne.',
          source:
            'Technicien réseaux et télécoms (2010 – 2012), technicien d’assistance informatique (2025).',
          brings: 'Savoir où et comment le logiciel va réellement tourner.',
          avoids: 'Les solutions qui marchent en démonstration et tombent en production.',
          asks: 'Où va-t-il tourner ? Sur quel réseau, quels postes ? Que fait-on en cas de panne ?',
        },
      ],
    },
    principles: {
      eyebrow: 'Ce qui guide mon travail',
      title: ['La machine prend la charge ;', 'l’humain prend de la hauteur.'],
      body: [
        'Qu’il s’agisse d’un système machine-machine, où priment la robustesse et les flux, d’un logiciel métier, qui doit épouser le travail de ceux qui l’utilisent, ou d’un service grand public, où tout part des personnes et de leurs contextes, ma démarche reste la même : comprendre avant de construire, et remonter jusqu’aux causes plutôt que traiter les symptômes.',
        'Cette démarche repose sur une conviction : la technologie doit augmenter notre maîtrise du réel, pas nous en éloigner. Personne ne devrait avoir à compenser durablement les défauts d’un système ou d’une machine. Je l’ai vécu en conduite de ligne : c’est trop souvent l’opérateur qui compense le système, au lieu d’être soutenu par lui. L’automatisation n’a de sens que si elle libère de l’attention pour ce qui exige du jugement et de la décision. Et un problème bien traité ne doit pas seulement disparaître : sa résolution doit produire de la connaissance et simplifier le système.',
        'Cette question de la maîtrise dépasse pour moi le logiciel. De la révolution scientifique à la révolution industrielle, puis numérique et aujourd’hui algorithmique, nos systèmes n’ont cessé de gagner en puissance et en abstraction. Nous devons préserver notre capacité à saisir ce qu’ils font, pourquoi ils le font et comment ils transforment nos manières d’agir. Cela commence par ramener l’attention sur le réel et reprendre le temps d’observer et de modéliser.',
        'Je me situe entre le pourquoi et le comment, entre la conception et la réalisation, entre l’humain et la machine. Mon travail : comprendre en profondeur pour concevoir juste, puis maîtriser la technique pour en faire quelque chose de concret, utile et durable. Je ne veux ni penser des systèmes que je serais incapable de construire, ni construire des systèmes dont je n’aurais pas interrogé le sens.',
      ],
      evidence: {
        lead: 'Ces principes ne restent pas des intentions : ils gouvernent déjà la conception de mes systèmes.',
        links: [
          {
            label: 'La doctrine de design de Sentinel',
            href: 'https://github.com/AmineAKIK/sentinel-fullstack/blob/main/docs/design.md',
          },
          {
            label: 'La synthèse opérationnelle de ProtoCap',
            href: 'https://protocap-production.up.railway.app/rapport',
          },
        ],
      },
    },
    capabilities: {
      eyebrow: 'Capacités',
      title: ['De l’idée à la maintenance,', 'tout le cycle.'],
      tablistLabel: 'Étapes du cycle',
      groups: ['Avant de coder', 'Construire et livrer', 'Faire vivre'],
      labels: {
        does: 'Ce que je fais',
        receives: 'Ce que vous recevez',
        proof: 'Déjà mis en œuvre',
      },
      phases: [
        {
          name: 'Cadrer',
          group: 0,
          purpose: 'Comprendre le besoin réel avant de parler de solution.',
          services: [
            'Observation du terrain et de l’existant',
            'Entretiens avec les utilisateurs',
            'Périmètre, priorités et contraintes',
            'Critères de réussite fixés à l’avance',
          ],
          deliverable: 'Note de cadrage',
          proof:
            'Sentinel : acteurs, droits et cycle de vie complet des incidents, fixés dans un dossier de conception.',
        },
        {
          name: 'Concevoir',
          group: 0,
          purpose: 'Donner une forme au système avant de le construire.',
          services: [
            'Parcours utilisateurs et maquettes',
            'Modèle de données',
            'Architecture et choix techniques argumentés',
            'Sécurité et droits d’accès dès le départ',
          ],
          deliverable: 'Maquettes et dossier de conception',
          proof:
            'Sentinel : une doctrine d’interface en sept principes, un modèle de données versionné en 50 migrations.',
        },
        {
          name: 'Valider',
          group: 0,
          purpose: 'Éprouver l’idée avant d’y investir.',
          services: [
            'Prototype cliquable ou démonstrateur',
            'Essais avec de vrais utilisateurs',
            'Ajustements avant développement',
            'Décision : poursuivre, ajuster ou arrêter',
          ],
          deliverable: 'Prototype testé',
          proof:
            'ProtoCap : une proposition d’essai pilote co-rédigée, et une démonstration isolée de la version réelle.',
        },
        {
          name: 'Développer',
          group: 1,
          purpose: 'Construire par étapes utiles, visibles à chaque livraison.',
          services: [
            'Interfaces web et mobile',
            'API et règles métier',
            'Base de données et migrations',
            'Intégrations : paiement, e-mail, IA',
          ],
          deliverable: 'Incréments démontrables',
          proof: 'Sentinel : trois espaces, atelier, board et administration, sur une même API.',
        },
        {
          name: 'Tester et sécuriser',
          group: 1,
          purpose: 'Trouver les défauts avant les utilisateurs.',
          services: [
            'Tests unitaires, d’intégration et navigateur',
            'Accessibilité',
            'Revue de code',
            'Sécurité applicative et dépendances',
          ],
          deliverable: 'Qualité vérifiée à chaque changement',
          proof: 'Sentinel : près de 1 400 tests unitaires et 161 parcours navigateur.',
        },
        {
          name: 'Déployer',
          group: 1,
          purpose: 'Mettre en production sans surprise.',
          services: [
            'Conteneurisation',
            'Intégration et déploiement continus',
            'Configuration par environnement',
            'Retour arrière prévu',
          ],
          deliverable: 'Mise en production documentée',
          proof: 'AkikSystems : déploiement par commit, avec retour arrière automatique.',
        },
        {
          name: 'Exploiter',
          group: 2,
          purpose: 'Garder le système disponible et sûr.',
          services: [
            'Surveillance et sondes de santé',
            'Sauvegardes et restaurations testées',
            'Gestion des incidents',
            'Support aux utilisateurs',
          ],
          deliverable: 'Procédures d’exploitation',
          proof:
            'Sentinel : sauvegarde et restauration testées. ProtoCap : sondes de santé et de disponibilité.',
        },
        {
          name: 'Faire évoluer',
          group: 2,
          purpose: 'Améliorer à partir de ce qui se passe vraiment.',
          services: [
            'Mesure des effets réels',
            'Retours des utilisateurs',
            'Maintenance corrective et évolutive',
            'Mises à jour de sécurité',
          ],
          deliverable: 'Feuille de route des évolutions',
          proof:
            'Sentinel : neuf versions candidates et leurs audits archivés. ProtoCap : 13 PR de remédiation, closes avec preuve.',
        },
      ],
      loopNote:
        'Le cycle se reboucle : ce qu’on observe en production nourrit le cadrage de l’évolution suivante.',
      throughout: {
        title: 'Tout au long du projet',
        items: [
          {
            title: 'Gestion de projet',
            body: 'Découpage en lots, planning, suivi de l’avancement, risques signalés tôt.',
          },
          {
            title: 'Collaboration',
            body: 'Points réguliers, démonstrations, décisions tracées, travail avec vos équipes.',
          },
          {
            title: 'Documentation',
            body: 'Technique, utilisateur et exploitation, tenue à jour à chaque évolution.',
          },
          {
            title: 'Transparence',
            body: 'Le statut réel de chaque livrable : ce qui est fait, ce qui reste, ce qui bloque.',
          },
        ],
      },
    },
    scale: {
      eyebrow: 'La signature d’AkikSystems',
      title: 'Systemic Scale',
      lead: ['Intervenir sur une partie.', 'Évaluer sur une frontière plus large.'],
      body: 'Une intervention peut être locale alors que ses effets ne le sont pas. Je choisis un périmètre assez large pour voir où vont les effets, et assez limité pour pouvoir décider.',
      method: {
        eyebrow: 'Ma manière d’intervenir',
        intro:
          'Quatre temps, illustrés par un cas réel : une machine de conditionnement dont les journaux accumulaient les alarmes.',
      },
      tablistLabel: 'Les quatre temps',
      stepLabel: 'Temps',
      labels: { example: 'Dans ce cas', question: 'La question à se poser' },
      steps: [
        {
          tab: 'Lire la demande',
          lead: 'Je pars de la demande, sans la confondre avec le problème.',
          example:
            'La demande : réduire les arrêts. Les journaux machine alignent des dizaines de libellés d’alarme, et le réflexe est de traiter chacun comme un problème à part, en commençant par le plus fréquent.',
          question: 'La demande contient-elle déjà une solution ?',
        },
        {
          tab: 'Élargir le regard',
          lead: 'Je regarde tout le système, là où le travail se fait vraiment.',
          example:
            'Sur place, je sépare le problème réel du problème causé. L’alarme la plus fréquente n’a pas d’impact : la machine écarte d’elle-même le produit concerné. À l’inverse, « magasin vide » et « défaut de prise » ne sont pas deux pannes : près de 90 occurrences viennent d’une même cellule de détection désynchronisée.',
          question: 'Qu’est-ce qui reste hors du cadre et change pourtant la décision ?',
        },
        {
          tab: 'Agir au bon endroit',
          lead: 'J’interviens là où le problème se produit, pas seulement là où il se voit.',
          example:
            'Plutôt que de régler la prise ou de surveiller le magasin, la cellule est repositionnée. Les autres alarmes gardent leur propre diagnostic, et ce qui n’est pas prouvé reste une hypothèse, affichée comme telle.',
          question: 'Ce problème est-il résolu, ou seulement déplacé ?',
        },
        {
          tab: 'Vérifier l’effet',
          lead: 'Je mesure ce qui a vraiment changé, et je dis ce qui reste incertain.',
          example:
            'La remontée de production coïncide avec un changement d’équipe : l’effet est cohérent, pas encore attribuable, et un suivi est prévu. Le raisonnement, lui, devient une proposition d’outil pour aider les opérateurs à remonter du symptôme à la cause.',
          question: 'L’effet observé est-il vraiment dû à l’intervention ?',
        },
      ],
      logs: {
        caption: [
          'Ce qu’on me demande : faire baisser ces alarmes',
          'Ce que je regarde : ce qui produit chaque alarme',
          'Où j’interviens : sur la cause, pas sur ses symptômes',
          'Ce que j’observe ensuite',
        ],
        logsLabel: 'Journaux machine',
        causeLabel: 'Ce qui les produit',
        unit: 'occurrences',
        alarms: [
          { label: 'Couvercle mal clipsé', count: '95 – 97', value: 97, kind: 'managed' },
          { label: 'Magasin d’étuis vide', count: '48', value: 48, kind: 'caused' },
          { label: 'Basculeur d’étuis bloqué', count: '44 – 48', value: 48, kind: 'own' },
          { label: 'Défaut de prise des étuis', count: '41 – 45', value: 45, kind: 'caused' },
          { label: 'Bourrage du bol', count: '38 – 39', value: 39, kind: 'hypothesis' },
          { label: 'Pliage d’un petit rabat', count: '16 – 17', value: 17, kind: 'own' },
        ],
        tags: {
          managed: 'Géré, sans impact',
          caused: 'Causé',
          own: 'Cause propre',
          hypothesis: 'Hypothèse ouverte',
          resolved: 'Plus observé',
        },
        cause: [
          {
            title: 'Six problèmes à traiter ?',
            text: 'Lue telle quelle, la liste appelle six corrections séparées, en commençant par la première.',
          },
          {
            title: 'Une cellule désynchronisée',
            text: 'Un tapis avance sans l’autre : l’étui arrive de travers, la prise par aspiration échoue et le magasin se vide.',
          },
          {
            title: 'Cellule repositionnée',
            text: 'Une seule correction, sur la cause. Les deux alarmes qu’elle produisait ne sont pas traitées une à une.',
          },
          {
            title: 'Plus aucun défaut d’étui',
            text: 'Constaté sur le reste de la journée pour les deux alarmes qu’elle produisait. Une journée : c’est un signal, pas encore une preuve.',
          },
        ],
      },
    },
    emblem: {
      eyebrow: 'L’emblème AkikSystems',
      title: 'Ce que dit l’emblème',
      alt: 'Emblème AkikSystems : un aigle et un serpent entre deux branches d’olivier, au-dessus de la mer, sous trois étoiles',
      items: [
        {
          id: 'eagle',
          name: 'L’aigle',
          key: 'La vue d’ensemble',
          text: 'Prendre de la hauteur pour voir le système entier, ses liens et ses effets.',
        },
        {
          id: 'serpent',
          name: 'Le serpent',
          key: 'Le terrain',
          text: 'Rester au ras du sol, là où les choses se passent vraiment. La prudence de celui qui connaît le terrain.',
        },
      ],
      quote: 'La hauteur du regard ne vaut rien sans la connaissance du sol.',
    },
    cta: {
      eyebrow: 'Travailler ensemble',
      title: ['Un logiciel métier à concevoir,', 'reprendre ou fiabiliser ?'],
      action: {
        label: 'Commencer une conversation',
        href: 'mailto:contact@akiksystems.com?subject=Premier%20%C3%A9change',
      },
    },
  },
  en: {
    meta: {
      title: 'Profile — Mohamed Amine Akik',
      description:
        'Full-stack developer and founder of AkikSystems: live, verifiable business software grounded in real industrial operations.',
    },
    identity: {
      eyebrow: 'Profile',
      name: ['Mohamed Amine', 'Akik'],
      photoLabel: 'Portrait of Mohamed Amine Akik',
      role: 'Founder of AkikSystems',
      roleDetail: 'full-stack developer',
      intro:
        'I am a developer and an infrastructure and IT support technician, but I have also worked on the shop floor and managed a business. More than job titles, these are worlds I have experienced first-hand. They taught me to see a system as a whole: from machines to people, from code to infrastructure, and from day-to-day use to the organisation around it.',
      contacts: {
        linkedin: { label: 'LinkedIn', href: 'https://www.linkedin.com/in/amineakik' },
        github: { label: 'GitHub', href: 'https://github.com/AmineAKIK' },
        email: {
          label: 'Email',
          href: 'mailto:contact@akiksystems.com',
          ariaLabel: 'Email: contact@akiksystems.com',
        },
        phone: null,
      },
      facts: [
        { label: 'Based in', value: 'Châtellerault, France' },
        { label: 'Languages', value: 'French · Arabic · English' },
      ],
      timeline: {
        eyebrow: 'Background',
        title: 'From the shop floor to software.',
        intro:
          'Industrial production, running a business and IT: three worlds I worked in before designing my own systems.',
        workLabel: 'Experience',
        educationLabel: 'Education',
        work: [
          {
            period: '2026 —',
            title: 'Founder, AkikSystems',
            place: 'Châtellerault, France',
            detail:
              'The company through which I design and build my systems: Sentinel and ProtoCap.',
          },
          { period: '2026 —', title: 'L’Oréal', place: 'Dermatological cosmetics' },
          {
            period: '2023 — 2025',
            title: 'Marelli',
            place: 'Production line operator · automotive electronics',
          },
          {
            period: '2022 — 2023',
            title: 'Ateliers Réunis du Centre-Ouest',
            place: 'Luxury leather goods',
          },
          {
            period: '2012 — 2014',
            title: 'Co-owner and managing director, AkikTex',
            place: 'Textile subcontracting, Tunisia',
            detail: 'Production, teams, cash flow and client relationships.',
          },
        ],
        education: [
          {
            period: '2025 — 2026',
            title: 'Web and Mobile Web Developer',
            place: 'French state professional title, listed in the RNCP · prepared with Studi',
          },
          {
            period: '2024 — 2025',
            title: 'IT Support Technician',
            place: 'French state professional title, listed in the RNCP · prepared with Studi',
          },
          {
            period: '2010 — 2012',
            title: 'Network and telecoms technician, internship at Tunisie Telecom',
            place: 'Sousse, Tunisia',
          },
          {
            period: '2009 — 2010',
            title: 'Baccalaureate in programming and technology',
            place: 'Tunisia',
          },
        ],
      },
    },
    project: {
      label: 'Current project',
      follow: { label: 'View the project', href: '/en/systems#sentinel' },
      name: 'Sentinel',
      summary:
        'Shop-floor incident tracking: each production issue is followed from initial report to shared knowledge, without ever losing the decision trail.',
      roleLabel: 'My role',
      role: 'Design and development',
      factsLabel: 'What can be verified',
      facts: [
        { icon: 'server', name: 'Live', detail: 'Public demonstration instance' },
        { icon: 'check', name: 'Tested', detail: 'Over 1,400 tests, 161 browser journeys' },
        { icon: 'layers', name: 'Documented', detail: 'Design, UX, technical, operations' },
        { icon: 'package', name: 'Versioned', detail: 'Immutable, traceable releases' },
      ],
      live: {
        label: 'Public instance',
        link: { label: 'sentinel.akiksystems.fr', href: 'https://sentinel.akiksystems.fr' },
      },
    },
    stack: {
      eyebrow: 'Stack',
      title: ['My stack,', 'and where to see it in action.'],
      intro:
        'Each technology points to the system that uses it: live, testable, and linked to its card on the Systems page.',
      provenIn: { one: 'Proven in 1 system', many: 'Proven in {count} systems' },
      regionLabel: 'Evidence in',
      inspect: 'Inspect the system',
      systems: {
        sentinel: {
          name: 'Sentinel',
          context: 'Shop-floor incident tracking',
          href: '/en/systems#sentinel',
        },
        protocap: {
          name: 'ProtoCap',
          context: 'Tools for the production line',
          href: '/en/systems#protocap',
        },
      },
      rows: [
        {
          icon: 'screen',
          category: 'Front-end',
          name: 'TypeScript · React',
          primary: 0,
          proofs: [
            {
              system: 'sentinel',
              description:
                'Interfaces for all three workspaces, orchestration hooks, cancelable requests, responsive layouts and checks against RGAA, the French accessibility standard. 787 front-end unit tests.',
            },
            {
              system: 'protocap',
              description:
                'Installable app (PWA), locally persisted state with versioned migrations, journeys tested on Chromium and WebKit.',
            },
          ],
        },
        {
          icon: 'server',
          category: 'Back-end',
          name: 'Node.js · Express',
          primary: 1,
          proofs: [
            {
              system: 'sentinel',
              description:
                'Zod-validated API, JWT sessions in HTTP-only cookies scoped per workspace, rate limiting, startup refused when configuration is invalid.',
            },
            {
              system: 'protocap',
              description:
                'A server that keeps the AI in check: authentication, rate and cost limits, reference content held server-side.',
            },
          ],
        },
        {
          icon: 'database',
          category: 'Data',
          name: 'PostgreSQL',
          primary: 0,
          proofs: [
            {
              system: 'sentinel',
              description:
                'Relational and JSONB model, 50 immutable checksum-verified migrations, transactions and locks, 165 integration tests against a real database.',
            },
          ],
        },
        {
          icon: 'check',
          category: 'Quality',
          name: 'Automated testing',
          primary: 0,
          proofs: [
            {
              system: 'sentinel',
              description:
                'Over 1,400 unit tests, 161 Playwright browser journeys, a six-job CI pipeline on a real PostgreSQL database.',
            },
            {
              system: 'protocap',
              description:
                'Mutation testing, red-then-green evidence, axe accessibility audits, a final 45-point acceptance run closed with proof.',
            },
          ],
        },
        {
          icon: 'package',
          category: 'Operations',
          name: 'Docker · deployment',
          primary: 0,
          proofs: [
            {
              system: 'sentinel',
              description:
                'Non-root images published by digest, Docker Compose behind a proxy, tested backup and restore, on a VPS.',
            },
            {
              system: 'protocap',
              description:
                'Multi-stage non-root image, two separate origins (live and demo), health and readiness probes.',
            },
          ],
        },
        {
          icon: 'link',
          category: 'Integrations',
          name: 'AI · LLM APIs',
          primary: 0,
          proofs: [
            {
              system: 'protocap',
              description:
                'An AI assistant on an LLM API, with minimized data sent and 14 reference cases evaluated automatically.',
            },
          ],
        },
      ],
    },
    perspectives: {
      eyebrow: 'What I connect',
      title: 'Four perspectives, one design loop.',
      body: 'Each part of my background has become a set of questions I bring to every project. Production, team and operational constraints are built into the design from the scoping stage, rather than discovered at go-live.',
      tablistLabel: 'Four perspectives connected in a loop around a systemic view',
      center: { title: ['Systemic', 'view'], caption: ['Connect, balance,', 'design.'] },
      loopCaption: 'Every turn refines the solution',
      labels: { brings: 'What it brings', avoids: 'What it avoids', asks: 'Questions I ask' },
      nodes: [
        {
          id: 'code',
          name: 'Code',
          description: 'Writing, testing and shipping software that holds up over time.',
          source:
            'Sentinel and ProtoCap, live. Web and Mobile Web Developer, French state professional title (RNCP, 2026).',
          brings: 'Knowing what an idea costs to build, to test and to maintain.',
          avoids: 'Promises that cannot be kept, and debt discovered too late.',
          asks: 'How do we test it? Who will maintain it? What happens when it breaks?',
        },
        {
          id: 'management',
          name: 'Management',
          description:
            'Coordinating teams, priorities and resources, including timelines and budgets.',
          source:
            'Co-owner and managing director of AkikTex, textile subcontracting (2012 – 2014): production, teams, cash flow, clients.',
          brings: 'Understanding what a solution demands of teams in time, resources and change.',
          avoids: 'Tools imposed on a team that has neither the time nor the will to adopt them.',
          asks: 'Who decides? Who owns the change? What are the budget and timeline?',
        },
        {
          id: 'field',
          name: 'On the ground',
          description:
            'Seeing how things are really used, the practical constraints and the impact on work.',
          source:
            'Industrial production: automotive electronics, dermatological cosmetics, luxury leather goods.',
          brings:
            'First-hand evidence: lessons learned, early warning signs and constraints that no diagram can reveal.',
          avoids: 'Theoretical solutions, disconnected from operations or from the need.',
          asks: 'Who will really use it? Under what conditions? What will happen in production?',
        },
        {
          id: 'infrastructure',
          name: 'Infrastructure',
          description: 'Networks, servers, workstations: everything the software runs on.',
          source: 'Network and telecoms technician (2010 – 2012), IT support technician (2025).',
          brings: 'Knowing where and how the software will actually run.',
          avoids: 'Solutions that work in the demo and fall over in production.',
          asks: 'Where will it run? On which network, which machines? What do we do when it goes down?',
        },
      ],
    },
    principles: {
      eyebrow: 'What guides my work',
      title: ['Machines carry the load.', 'People rise above it.'],
      body: [
        'Whether it is a machine-to-machine system, where robustness and flow come first; a business application, which must fit the work of the people who use it; or a consumer service, where everything begins with people and their circumstances, my approach remains the same: understand before building, and trace problems back to their causes rather than treating their symptoms.',
        'This approach rests on one conviction: technology should strengthen our grasp of reality, not distance us from it. No one should have to compensate indefinitely for the flaws of a system or machine. I learned this first-hand while operating a production line: too often, the operator compensates for the system instead of being supported by it. Automation only makes sense when it frees attention for work that requires judgement and decision-making. And a problem properly addressed should do more than disappear: solving it should create knowledge and simplify the system.',
        'For me, this question of control extends beyond software. From the scientific revolution to the industrial, digital and now algorithmic revolutions, our systems have grown ever more powerful and abstract. We must preserve our ability to understand what they do, why they do it and how they reshape the way we act. That begins with bringing our attention back to reality and taking the time to observe and model it.',
        'I work between the why and the how, between design and implementation, and between people and machines. My role is to understand deeply enough to design with purpose, then command the technology well enough to make the result concrete, useful and durable. I want neither to design systems I could not build nor to build systems whose purpose I have not questioned.',
      ],
      evidence: {
        lead: 'These principles are not just intentions: they already govern how I design my systems.',
        links: [
          {
            label: 'Sentinel’s design doctrine',
            href: 'https://github.com/AmineAKIK/sentinel-fullstack/blob/main/docs/design.md',
          },
          {
            label: 'ProtoCap’s operational summary',
            href: 'https://protocap-production.up.railway.app/rapport',
          },
        ],
      },
    },
    capabilities: {
      eyebrow: 'Capabilities',
      title: ['From idea to maintenance,', 'the whole cycle.'],
      tablistLabel: 'Stages of the cycle',
      groups: ['Before coding', 'Build and ship', 'Keep it running'],
      labels: {
        does: 'What I do',
        receives: 'What you receive',
        proof: 'Already put into practice',
      },
      phases: [
        {
          name: 'Scope',
          group: 0,
          purpose: 'Understand the real need before talking about a solution.',
          services: [
            'Observing the field and what already exists',
            'User interviews',
            'Scope, priorities and constraints',
            'Success criteria set upfront',
          ],
          deliverable: 'Scoping note',
          proof:
            'Sentinel: actors, permissions and the complete incident lifecycle, defined in a design specification.',
        },
        {
          name: 'Design',
          group: 0,
          purpose: 'Give the system a shape before building it.',
          services: [
            'User journeys and mock-ups',
            'Data model',
            'Architecture and justified technical choices',
            'Security and access rights from the start',
          ],
          deliverable: 'Mock-ups and design documentation',
          proof:
            'Sentinel: an interface doctrine in seven principles, a data model versioned across 50 migrations.',
        },
        {
          name: 'Validate',
          group: 0,
          purpose: 'Test the idea before investing in it.',
          services: [
            'Clickable prototype or proof of concept',
            'Trials with real users',
            'Adjustments before development',
            'Decision: continue, adjust or stop',
          ],
          deliverable: 'Tested prototype',
          proof:
            'ProtoCap: a co-written pilot proposal, and a demo isolated from the live version.',
        },
        {
          name: 'Develop',
          group: 1,
          purpose: 'Build in useful steps, visible at every release.',
          services: [
            'Web and mobile interfaces',
            'APIs and business rules',
            'Database and migrations',
            'Integrations: payments, email, AI',
          ],
          deliverable: 'Demonstrable increments',
          proof: 'Sentinel: three workspaces, shop floor, board and admin, on one API.',
        },
        {
          name: 'Test and secure',
          group: 1,
          purpose: 'Find the defects before users do.',
          services: [
            'Unit, integration and browser tests',
            'Accessibility',
            'Code review',
            'Application and dependency security',
          ],
          deliverable: 'Quality checked on every change',
          proof: 'Sentinel: nearly 1,400 unit tests and 161 browser journeys.',
        },
        {
          name: 'Deploy',
          group: 1,
          purpose: 'Go to production without surprises.',
          services: [
            'Containerization',
            'Continuous integration and delivery',
            'Per-environment configuration',
            'Rollback planned',
          ],
          deliverable: 'Documented release',
          proof: 'AkikSystems: deployment by commit, with automatic rollback.',
        },
        {
          name: 'Operate',
          group: 2,
          purpose: 'Keep the system available and safe.',
          services: [
            'Monitoring and health probes',
            'Tested backups and restores',
            'Incident handling',
            'User support',
          ],
          deliverable: 'Operating procedures',
          proof: 'Sentinel: tested backup and restore. ProtoCap: health and readiness probes.',
        },
        {
          name: 'Evolve',
          group: 2,
          purpose: 'Improve from what actually happens.',
          services: [
            'Measuring real effects',
            'User feedback',
            'Corrective maintenance and enhancements',
            'Security updates',
          ],
          deliverable: 'Improvement roadmap',
          proof:
            'Sentinel: nine release candidates and their archived audits. ProtoCap: 13 remediation PRs, closed with proof.',
        },
      ],
      loopNote:
        'The cycle loops back: what we observe in production feeds the scoping of the next iteration.',
      throughout: {
        title: 'Throughout the project',
        items: [
          {
            title: 'Project management',
            body: 'Work split into batches, planning, progress tracking, risks flagged early.',
          },
          {
            title: 'Collaboration',
            body: 'Regular check-ins, demos, recorded decisions, working alongside your teams.',
          },
          {
            title: 'Documentation',
            body: 'Technical, user and operations docs, kept current with every change.',
          },
          {
            title: 'Transparency',
            body: 'The real status of every deliverable: what is done, what remains, what is blocked.',
          },
        ],
      },
    },
    scale: {
      eyebrow: 'The AkikSystems signature',
      title: 'Systemic Scale',
      lead: ['Act on one part.', 'Assess across a wider boundary.'],
      body: 'An intervention may be local even when its effects are not. I choose a scope broad enough to trace those effects, yet bounded enough to make a decision.',
      method: {
        eyebrow: 'How I intervene',
        intro:
          'Four stages, shown through a real case: a packaging machine whose logs kept piling up alarms.',
      },
      tablistLabel: 'The four stages',
      stepLabel: 'Stage',
      labels: { example: 'In this case', question: 'The question to ask' },
      steps: [
        {
          tab: 'Read the request',
          lead: 'I start from the request, without mistaking it for the problem.',
          example:
            'The request: reduce stoppages. The machine logs list dozens of alarm labels, and the reflex is to treat each one as a separate problem, starting with the most frequent.',
          question: 'Does the request already contain a solution?',
        },
        {
          tab: 'Widen the view',
          lead: 'I look at the whole system, where the work really happens.',
          example:
            'On site, I distinguish the underlying problem from the problems it causes. The most frequent alarm has no operational impact: the machine automatically rejects the affected product. By contrast, “magazine empty” and “pick failure” are not two separate faults: nearly 90 occurrences stem from a single detection sensor that is out of sync.',
          question: 'What sits outside the frame yet still changes the decision?',
        },
        {
          tab: 'Act where it counts',
          lead: 'I intervene where the problem originates, not only where it surfaces.',
          example:
            'Rather than adjusting the pick mechanism or monitoring the magazine, I reposition the sensor. The other alarms retain their own diagnosis, and anything unproven remains clearly identified as a hypothesis.',
          question: 'Is this problem solved, or only moved?',
        },
        {
          tab: 'Check the effect',
          lead: 'I measure what really changed, and say what remains uncertain.',
          example:
            'The increase in output coincides with a shift change: the result is consistent with the intervention, but cannot yet be attributed to it, so further monitoring is planned. The diagnostic method itself becomes a proposal for a tool that helps operators trace symptoms back to their causes.',
          question: 'Is the observed effect really due to the intervention?',
        },
      ],
      logs: {
        caption: [
          'What I am asked to do: reduce these alarms',
          'What I look at: what produces each alarm',
          'Where I intervene: on the cause, not its symptoms',
          'What I observe next',
        ],
        logsLabel: 'Machine logs',
        causeLabel: 'What produces them',
        unit: 'occurrences',
        alarms: [
          { label: 'Lid not clipped properly', count: '95 – 97', value: 97, kind: 'managed' },
          { label: 'Carton magazine empty', count: '48', value: 48, kind: 'caused' },
          { label: 'Carton tipper jammed', count: '44 – 48', value: 48, kind: 'own' },
          { label: 'Carton pick failure', count: '41 – 45', value: 45, kind: 'caused' },
          { label: 'Bowl jam', count: '38 – 39', value: 39, kind: 'hypothesis' },
          { label: 'Small flap folding', count: '16 – 17', value: 17, kind: 'own' },
        ],
        tags: {
          managed: 'Handled, no impact',
          caused: 'Caused',
          own: 'Independent cause',
          hypothesis: 'Open hypothesis',
          resolved: 'No longer observed',
        },
        cause: [
          {
            title: 'Six problems to fix?',
            text: 'Read as it stands, the list calls for six separate fixes, starting with the first.',
          },
          {
            title: 'One sensor out of sync',
            text: 'One conveyor advances without the other: the carton arrives crooked, the suction pick fails and the magazine runs empty.',
          },
          {
            title: 'Sensor repositioned',
            text: 'A single fix, on the cause. The two alarms it produced are not handled one by one.',
          },
          {
            title: 'No more carton faults',
            text: 'Observed over the rest of the day for the two alarms it produced. One day: a signal, not yet proof.',
          },
        ],
      },
    },
    emblem: {
      eyebrow: 'The AkikSystems emblem',
      title: 'What the emblem says',
      alt: 'AkikSystems emblem: an eagle and a serpent between two olive branches, above the sea, beneath three stars',
      items: [
        {
          id: 'eagle',
          name: 'The eagle',
          key: 'The big picture',
          text: 'Rising high enough to see the whole system, its links and its effects.',
        },
        {
          id: 'serpent',
          name: 'The serpent',
          key: 'The ground',
          text: 'Staying close to the ground, where things really happen. The caution of someone who knows the terrain.',
        },
      ],
      quote: 'A high vantage point is worth nothing without knowing the ground.',
    },
    cta: {
      eyebrow: 'Work together',
      title: ['A business application to design,', 'take over or make more reliable?'],
      action: {
        label: 'Start a conversation',
        href: 'mailto:contact@akiksystems.com?subject=First%20conversation',
      },
    },
  },
};

export const profilePageContent: Record<Locale, ProfilePageContent> = {
  ...content,
  fr: frenchTypography(content.fr),
};
