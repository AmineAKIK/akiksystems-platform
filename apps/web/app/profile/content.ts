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
    stackLabel: string;
    stack: Array<{ icon: ProfileIcon; name: string; detail: string }>;
    updated: string;
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
  principles: {
    eyebrow: string;
    title: string;
    body: string;
    relate: {
      eyebrow: string;
      title: string;
      body: string;
      groupLabel: string;
      center: { title: [string, string]; caption: [string, string] };
      loopCaption: string;
      detailLabel: string;
      labels: { brings: string; avoids: string; asks: string };
      /** Clockwise from the top of the loop. */
      nodes: [ProfileLens, ProfileLens, ProfileLens, ProfileLens];
    };
    result: { eyebrow: string; title: string; body: string };
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
    chain: [string, string, string, string, string, string, string, string];
    diagram: {
      asked: string;
      whole: string;
      observed: string;
      simple: string;
      conflicts: string;
      ready: string;
      free: string;
      invisible: string;
      usable: string;
      unexpected: string;
    };
    emblem: {
      eyebrow: string;
      title: string;
      alt: string;
      /** Reading order used by the stacked (mobile) legend. */
      items: Array<{ id: ProfileEmblemPart; name: string; key: string; text: string }>;
      quote: string;
    };
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
  figure: { value: string; label: string } | null;
  source: string | null;
  brings: string;
  avoids: string;
  asks: string;
}

export interface ProfileCaseStep {
  tab: string;
  lead: string;
  example: string;
  question: string;
  alt: string;
}

export type ProfileEmblemPart = 'eagle' | 'serpent' | 'olive' | 'sea' | 'stars';

export const profilePageContent: Record<Locale, ProfilePageContent> = {
  fr: {
    meta: {
      title: 'Profil — Mohamed Amine Akik',
      description:
        'Fondateur d’AkikSystems, développeur full-stack : une expérience industrielle exigeante, deux entreprises dirigées, et des logiciels métier en ligne et testables.',
    },
    identity: {
      eyebrow: 'Profil',
      name: ['Mohamed Amine', 'Akik'],
      photoLabel: 'Portrait de Mohamed Amine Akik',
      role: 'Fondateur d’AkikSystems',
      roleDetail: 'développeur full-stack',
      intro:
        'Je conçois, construis et livre des logiciels de bout en bout. Je pars du besoin, je tiens toute la chaîne, de la donnée à l’interface jusqu’à la production, et je livre quelque chose de solide, que l’équipe peut exploiter et faire évoluer sans moi.',
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
          'Une expérience industrielle dans des environnements exigeants en qualité et en technicité, et une première entreprise dirigée.',
        workLabel: 'Expérience',
        educationLabel: 'Formation',
        work: [
          {
            period: '2026 —',
            title: 'Fondateur, AkikSystems',
            place: 'Châtellerault',
            detail:
              'Conception et développement de logiciels métier et opérationnels : Sentinel, ProtoCap.',
          },
          { period: '2026 —', title: 'L’Oréal', place: 'Cosmétique dermatologique' },
          { period: '2023 — 2025', title: 'Marelli', place: 'Électronique automobile' },
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
            period: '2009 — 2010',
            title: 'Baccalauréat programmation et technologies',
            place: 'Tunisie',
          },
          {
            period: '2010 — 2012',
            title: 'Technicien réseaux et télécoms, stage chez Tunisie Telecom',
            place: 'Sousse, Tunisie',
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
      stackLabel: 'Stack du projet',
      stack: [
        { icon: 'screen', name: 'TypeScript · React', detail: 'Trois espaces, contrôles RGAA' },
        { icon: 'server', name: 'Node.js · Express', detail: 'API, sessions JWT par espace' },
        { icon: 'database', name: 'PostgreSQL', detail: 'Relationnel et JSONB, 50 migrations' },
        { icon: 'shield', name: 'Zod', detail: 'Entrées et configuration validées' },
        { icon: 'check', name: 'Tests · Playwright', detail: 'Près de 1 400 tests, 161 parcours' },
        { icon: 'package', name: 'Docker · Compose', detail: 'Images non-root, sur VPS' },
      ],
      updated: 'Mis à jour le 29 sept. 2026',
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
                'Près de 1 400 tests unitaires, 161 parcours navigateur Playwright, CI en six jobs sur base PostgreSQL réelle.',
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
    principles: {
      eyebrow: 'Ce qui guide mon travail',
      title: 'Un logiciel métier ne vaut que par ce qu’il change dans le travail réel.',
      body: 'Beaucoup d’outils ajoutent un écran sans retirer de charge, ou répondent parfaitement au mauvais problème. Mon travail commence donc avant le code : comprendre ce qui se passe, pour qui, et ce qu’une solution va déplacer. Il continue après : tester, livrer quelque chose de fiable, et dire clairement ce qui est prouvé et ce qui ne l’est pas encore.',
      relate: {
        eyebrow: 'Ce que je relie',
        title: 'Quatre regards, une boucle de conception.',
        body: 'Code, infrastructure, terrain et management : quatre expériences vécues, présentes dans chaque décision de conception.',
        groupLabel: 'Quatre regards reliés en boucle autour d’une vision systémique',
        center: { title: ['Vision', 'systémique'], caption: ['Relier, arbitrer,', 'concevoir.'] },
        loopCaption: 'Chaque tour affine la solution',
        detailLabel: 'Détail du regard choisi',
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
            figure: null,
            source: 'Titre professionnel d’État Développeur web et web mobile (RNCP, 2026).',
            brings: 'Savoir ce qu’une idée coûte à construire, à tester et à maintenir.',
            avoids: 'Les promesses impossibles à tenir, et la dette qu’on découvre trop tard.',
            asks: 'Comment le tester ? Qui le maintiendra ? Que se passe-t-il quand ça casse ?',
          },
          {
            id: 'management',
            name: 'Management',
            description:
              'Coordonner équipes, priorités et ressources, jusqu’aux délais et au budget.',
            figure: { value: '2', label: 'entreprises dirigées' },
            source:
              'AkikTex, sous-traitance textile (2012 – 2014), puis AkikSystems (depuis 2026).',
            brings:
              'Savoir ce qu’une solution demande aux équipes, en temps, en moyens et en changement.',
            avoids: 'Les outils imposés qu’une équipe n’a ni le temps ni l’envie d’adopter.',
            asks: 'Qui décide ? Qui porte le changement ? Avec quel budget et quel délai ?',
          },
          {
            id: 'field',
            name: 'Terrain',
            description:
              'Voir l’usage réel, les contraintes concrètes et les effets sur le travail.',
            figure: null,
            source:
              'Industrie exigeante : cosmétique dermatologique, électronique automobile, maroquinerie de luxe.',
            brings:
              'Du réel : le retour d’expérience, les signaux faibles, les contraintes qu’on ne voit pas depuis un schéma.',
            avoids: 'Les solutions théoriques, déconnectées de l’exploitation ou du besoin.',
            asks: 'Qui va vraiment l’utiliser ? Dans quelles conditions ? Que se passera-t-il en production ?',
          },
          {
            id: 'infrastructure',
            name: 'Infrastructure',
            description: 'Réseaux, serveurs, postes : tout ce sur quoi le logiciel tourne.',
            figure: null,
            source:
              'Technicien réseaux et télécoms (2011), technicien d’assistance informatique (2025).',
            brings: 'Savoir où et comment le logiciel va réellement tourner.',
            avoids: 'Les solutions qui marchent en démonstration et tombent en production.',
            asks: 'Où va-t-il tourner ? Sur quel réseau, quels postes ? Que fait-on en cas de panne ?',
          },
        ],
      },
      result: {
        eyebrow: 'Le résultat',
        title: 'Ce que ça change dans un projet.',
        body: 'Les contraintes de production, d’équipe et d’exploitation entrent dans la conception dès le cadrage, au lieu d’être découvertes à la mise en service.',
      },
    },
    capabilities: {
      eyebrow: 'Capacités',
      title: ['De l’idée à la maintenance,', 'tout le cycle.'],
      tablistLabel: 'Étapes du cycle',
      groups: ['Avant de coder', 'Construire et livrer', 'Faire vivre'],
      labels: { does: 'Ce que je fais', receives: 'Ce que vous recevez', proof: 'Déjà en service' },
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
          proof: 'Sentinel : modèle relationnel et JSONB, 50 migrations immuables.',
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
          proof: 'ProtoCap : une démonstration servie séparément de la version réelle.',
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
          proof: 'Sentinel : sauvegarde et restauration testées.',
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
      eyebrow: 'Le sens du slogan',
      title: 'Systemic Scale',
      lead: ['Intervenir sur une partie.', 'Évaluer sur une frontière plus large.'],
      body: 'Une intervention peut être locale alors que ses effets ne le sont pas. Je choisis un périmètre assez large pour voir où vont les effets, et assez limité pour pouvoir décider.',
      method: {
        eyebrow: 'Ma manière d’intervenir',
        intro:
          'Quatre temps, illustrés par un exemple : des ressources matérielles partagées entre plusieurs équipes, avec des retards et des conflits qui reviennent.',
      },
      tablistLabel: 'Les quatre temps',
      stepLabel: 'Temps',
      labels: { example: 'Dans l’exemple', question: 'La question à se poser' },
      steps: [
        {
          tab: 'Lire la demande',
          lead: 'Je pars de la demande, sans la confondre avec le problème.',
          example:
            'La demande reçue : « Automatisez l’attribution des ressources pour réduire les délais. »',
          question: 'La demande contient-elle déjà une solution ?',
          alt: 'La chaîne complète d’une ressource, de la réservation à la disponibilité. La demande ne vise que l’attribution.',
        },
        {
          tab: 'Élargir le regard',
          lead: 'Je regarde toute la chaîne, là où le travail se fait vraiment.',
          example:
            'Une ressource peut être « libre » dans le système sans être prête : elle doit être vérifiée, parfois remise en état, puis retrouvée. En urgence, les équipes tiennent une liste parallèle des ressources vraiment prêtes.',
          question: 'Qu’est-ce qui reste hors du cadre et change pourtant la décision ?',
          alt: 'Toute la chaîne est regardée. Vérification, remise en état et localisation sont invisibles pour le système.',
        },
        {
          tab: 'Agir au bon endroit',
          lead: 'J’interviens là où le problème se produit, pas seulement là où il se voit.',
          example:
            'Automatiser tout de suite aurait accéléré des décisions fondées sur une information peu fiable. L’état réel est d’abord rendu fiable ; seuls les cas simples sont automatisés, les conflits restent à la coordination.',
          question: 'Ce problème est-il résolu, ou seulement déplacé ?',
          alt: 'Deux interventions ciblées : l’état « prête » est confirmé à la vérification, l’attribution n’est automatisée que pour les cas simples.',
        },
        {
          tab: 'Vérifier l’effet',
          lead: 'Je mesure ce qui a vraiment changé, et je corrige au bon niveau.',
          example:
            'Les recherches informelles diminuent et les conflits sont repérés plus tôt. Mais certaines équipes réservent désormais très tôt, à titre provisoire : la conception est rouverte sur ce point, et seulement sur celui-là.',
          question: 'L’effet attendu est-il observé, ou seulement l’outil livré ?',
          alt: 'Après la mise en service, un effet inattendu revient vers la réservation : des demandes provisoires déposées très tôt.',
        },
      ],
      chain: [
        'Réservation',
        'Attribution',
        'Utilisation',
        'Retour',
        'Vérification',
        'Remise en état',
        'Localisation',
        'Disponible',
      ],
      diagram: {
        asked: 'Ce qu’on me demande',
        whole: 'Ce que je regarde : toute la chaîne',
        observed: 'Ce que j’observe après la mise en service',
        simple: 'Automatisé pour les cas simples',
        conflicts: 'Les conflits restent à la coordination',
        ready: 'État « prête » confirmé explicitement',
        free: '« Libre » pour le système',
        invisible: 'Invisible pour le système',
        usable: 'Vraiment utilisable',
        unexpected: 'Effet inattendu : des réservations provisoires, déposées très tôt',
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
        'Founder of AkikSystems, full-stack developer: demanding industrial experience, two companies led, and business software that is live and testable.',
    },
    identity: {
      eyebrow: 'Profile',
      name: ['Mohamed Amine', 'Akik'],
      photoLabel: 'Portrait of Mohamed Amine Akik',
      role: 'Founder of AkikSystems',
      roleDetail: 'full-stack developer',
      intro:
        'I design, build and ship software end to end. I start from the need, own the whole chain, from data to interface to production, and deliver something solid that the team can run and evolve without me.',
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
        title: 'From the field to software.',
        intro:
          'Industrial experience in environments demanding on quality and technical precision, and a first company led.',
        workLabel: 'Experience',
        educationLabel: 'Education',
        work: [
          {
            period: '2026 —',
            title: 'Founder, AkikSystems',
            place: 'Châtellerault, France',
            detail: 'Designing and building business and operational software: Sentinel, ProtoCap.',
          },
          { period: '2026 —', title: 'L’Oréal', place: 'Dermatological cosmetics' },
          { period: '2023 — 2025', title: 'Marelli', place: 'Automotive electronics' },
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
            period: '2009 — 2010',
            title: 'Baccalaureate in programming and technology',
            place: 'Tunisia',
          },
          {
            period: '2010 — 2012',
            title: 'Network and telecoms technician, internship at Tunisie Telecom',
            place: 'Sousse, Tunisia',
          },
        ],
      },
    },
    project: {
      label: 'Current project',
      follow: { label: 'View the project', href: '/en/systems#sentinel' },
      name: 'Sentinel',
      summary:
        'Shop-floor incident tracking: a production anomaly followed from report to shared knowledge, without ever losing the trail of decisions.',
      roleLabel: 'My role',
      role: 'Design and development',
      stackLabel: 'Project stack',
      stack: [
        {
          icon: 'screen',
          name: 'TypeScript · React',
          detail: 'Three workspaces, accessibility checks',
        },
        { icon: 'server', name: 'Node.js · Express', detail: 'API, JWT sessions per workspace' },
        { icon: 'database', name: 'PostgreSQL', detail: 'Relational and JSONB, 50 migrations' },
        { icon: 'shield', name: 'Zod', detail: 'Inputs and configuration validated' },
        { icon: 'check', name: 'Tests · Playwright', detail: 'About 1,400 tests, 161 journeys' },
        { icon: 'package', name: 'Docker · Compose', detail: 'Non-root images, on a VPS' },
      ],
      updated: 'Updated 29 Sept 2026',
    },
    stack: {
      eyebrow: 'Stack',
      title: ['My stack,', 'and where to verify it.'],
      intro:
        'Each technology points to the system that uses it: live, testable, and linked to its card on the Systems page.',
      provenIn: { one: 'Proven in 1 system', many: 'Proven in {count} systems' },
      regionLabel: 'Evidence for',
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
                'Nearly 1,400 unit tests, 161 Playwright browser journeys, a six-job CI pipeline on a real PostgreSQL database.',
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
    principles: {
      eyebrow: 'What guides my work',
      title: 'Business software is only worth what it changes in real work.',
      body: 'Many tools add a screen without removing any load, or perfectly answer the wrong problem. So my work starts before the code: understanding what is happening, for whom, and what a solution will shift. It continues after: testing, shipping something reliable, and saying clearly what is proven and what is not yet.',
      relate: {
        eyebrow: 'What I connect',
        title: 'Four perspectives, one design loop.',
        body: 'Code, infrastructure, the field and management: four lived experiences, present in every design decision.',
        groupLabel: 'Four perspectives connected in a loop around a systemic view',
        center: { title: ['Systemic', 'view'], caption: ['Connect, weigh,', 'design.'] },
        loopCaption: 'Every turn refines the solution',
        detailLabel: 'Detail of the selected perspective',
        labels: {
          brings: 'What it brings',
          avoids: 'What it avoids',
          asks: 'Questions I ask',
        },
        nodes: [
          {
            id: 'code',
            name: 'Code',
            description: 'Writing, testing and shipping software that holds up over time.',
            figure: null,
            source: 'Web and Mobile Web Developer, French state professional title (RNCP, 2026).',
            brings: 'Knowing what an idea costs to build, to test and to maintain.',
            avoids: 'Promises that cannot be kept, and debt discovered too late.',
            asks: 'How do we test it? Who will maintain it? What happens when it breaks?',
          },
          {
            id: 'management',
            name: 'Management',
            description:
              'Coordinating teams, priorities and resources, down to deadlines and budget.',
            figure: { value: '2', label: 'companies led' },
            source: 'AkikTex, textile subcontracting (2012–2014), then AkikSystems (since 2026).',
            brings: 'Knowing what a solution asks of teams in time, means and change.',
            avoids: 'Tools imposed on a team that has neither the time nor the will to adopt them.',
            asks: 'Who decides? Who carries the change? On what budget and timeline?',
          },
          {
            id: 'field',
            name: 'Field',
            description: 'Seeing real use, concrete constraints and the effects on the work.',
            figure: null,
            source:
              'Demanding industry: dermatological cosmetics, automotive electronics, luxury leather goods.',
            brings:
              'Reality: lessons learned, weak signals, the constraints you cannot see from a diagram.',
            avoids: 'Theoretical solutions, disconnected from operations or from the need.',
            asks: 'Who will really use it? Under what conditions? What will happen in production?',
          },
          {
            id: 'infrastructure',
            name: 'Infrastructure',
            description: 'Networks, servers, workstations: everything the software runs on.',
            figure: null,
            source: 'Network and telecoms technician (2011), IT support technician (2025).',
            brings: 'Knowing where and how the software will actually run.',
            avoids: 'Solutions that work in the demo and fall over in production.',
            asks: 'Where will it run? On which network, which machines? What do we do when it goes down?',
          },
        ],
      },
      result: {
        eyebrow: 'The result',
        title: 'What it changes in a project.',
        body: 'Production, team and operating constraints enter the design at scoping, instead of being discovered at go-live.',
      },
    },
    capabilities: {
      eyebrow: 'Capabilities',
      title: ['From idea to maintenance,', 'the whole cycle.'],
      tablistLabel: 'Stages of the cycle',
      groups: ['Before the code', 'Build and ship', 'Keep it alive'],
      labels: { does: 'What I do', receives: 'What you receive', proof: 'Already in service' },
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
        },
        {
          name: 'Design',
          group: 0,
          purpose: 'Give the system a shape before building it.',
          services: [
            'User journeys and mock-ups',
            'Data model',
            'Architecture and reasoned technical choices',
            'Security and access rights from the start',
          ],
          deliverable: 'Mock-ups and design documentation',
          proof: 'Sentinel: relational and JSONB model, 50 immutable migrations.',
        },
        {
          name: 'Validate',
          group: 0,
          purpose: 'Test the idea before investing in it.',
          services: [
            'Clickable prototype or demonstrator',
            'Trials with real users',
            'Adjustments before development',
            'Decision: continue, adjust or stop',
          ],
          deliverable: 'Tested prototype',
          proof: 'ProtoCap: a demo served separately from the live version.',
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
          proof: 'Sentinel: tested backup and restore.',
        },
        {
          name: 'Evolve',
          group: 2,
          purpose: 'Improve from what actually happens.',
          services: [
            'Measuring real effects',
            'User feedback',
            'Bug fixes and feature evolution',
            'Security updates',
          ],
          deliverable: 'Evolution roadmap',
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
      eyebrow: 'What the tagline means',
      title: 'Systemic Scale',
      lead: ['Act on one part.', 'Judge across a wider boundary.'],
      body: 'An intervention can be local while its effects are not. I choose a scope wide enough to see where the effects go, and narrow enough to still decide.',
      method: {
        eyebrow: 'How I intervene',
        intro:
          'Four stages, shown through one example: equipment shared between several teams, with recurring delays and conflicts.',
      },
      tablistLabel: 'The four stages',
      stepLabel: 'Stage',
      labels: { example: 'In the example', question: 'The question to ask' },
      steps: [
        {
          tab: 'Read the request',
          lead: 'I start from the request, without mistaking it for the problem.',
          example: 'The request received: “Automate resource allocation to cut delays.”',
          question: 'Does the request already contain a solution?',
          alt: 'The full chain of a resource, from booking to availability. The request only targets allocation.',
        },
        {
          tab: 'Widen the view',
          lead: 'I look at the whole chain, where the work really happens.',
          example:
            'A resource can be “free” in the system without being ready: it has to be checked, sometimes repaired, then found. In a rush, teams keep a parallel list of the resources that are truly ready.',
          question: 'What sits outside the frame yet still changes the decision?',
          alt: 'The whole chain is examined. Checking, repair and locating are invisible to the system.',
        },
        {
          tab: 'Act where it counts',
          lead: 'I intervene where the problem happens, not only where it shows.',
          example:
            'Automating straight away would have sped up decisions built on unreliable information. The real state is made reliable first; only simple cases are automated, and conflicts stay with coordination.',
          question: 'Is this problem solved, or only moved?',
          alt: 'Two targeted interventions: the “ready” state is confirmed at the check, and allocation is automated only for simple cases.',
        },
        {
          tab: 'Check the effect',
          lead: 'I measure what really changed, and correct at the right level.',
          example:
            'Informal searches go down and conflicts are spotted earlier. But some teams now book very early, provisionally: the design is reopened on that point, and on that point only.',
          question: 'Is the expected effect observed, or just the tool delivered?',
          alt: 'After go-live, an unexpected effect loops back to booking: provisional requests filed very early.',
        },
      ],
      chain: ['Booking', 'Allocation', 'Use', 'Return', 'Check', 'Repair', 'Locating', 'Available'],
      diagram: {
        asked: 'What I am asked for',
        whole: 'What I look at: the whole chain',
        observed: 'What I observe after go-live',
        simple: 'Automated for simple cases',
        conflicts: 'Conflicts stay with coordination',
        ready: '“Ready” state confirmed explicitly',
        free: '“Free” for the system',
        invisible: 'Invisible to the system',
        usable: 'Truly usable',
        unexpected: 'Unexpected effect: provisional bookings, filed very early',
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
    },
    cta: {
      eyebrow: 'Work together',
      title: ['Business software to design,', 'take over or make reliable?'],
      action: {
        label: 'Start a conversation',
        href: 'mailto:contact@akiksystems.com?subject=First%20conversation',
      },
    },
  },
};
