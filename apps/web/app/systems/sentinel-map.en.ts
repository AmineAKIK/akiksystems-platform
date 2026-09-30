/** English for the Sentinel map, keyed by its French strings (see sentinel-map.js). */
const dictionary: Record<string, string> = {
  Calme: 'Calm',
  "NIVEAU D'ATTENTION · 0": 'ATTENTION LEVEL · 0',
  "Rien à décider. Traitement neutre, faible contraste : l'élément s'efface pour laisser la place à ce qui compte.":
    'Nothing to decide. Neutral, low-contrast treatment: the element steps back to make room for what matters.',
  'À surveiller': 'Watch',
  "NIVEAU D'ATTENTION · 1": 'ATTENTION LEVEL · 1',
  'Attention sans action immédiate. Accent doux, contraste mesuré.':
    'Attention without immediate action. Soft accent, measured contrast.',
  'À traiter': 'Act on it',
  "NIVEAU D'ATTENTION · 2": 'ATTENTION LEVEL · 2',
  'Action attendue. Accent affirmé mais sobre, position prioritaire dans la lecture.':
    'Action expected. Firm but restrained accent, first in reading order.',
  Critique: 'Critical',
  "NIVEAU D'ATTENTION · 3": 'ATTENTION LEVEL · 3',
  'Enjeu réel et urgent. Contraste fort par la place et la position, sans saturation extrême ni clignotement.':
    'Real, urgent stakes. Strong contrast through placement and position, with no extreme saturation or blinking.',
  'Carte interactive de Sentinel : cycle des incidents, rôles, architecture, sécurité, design et livraison':
    'Interactive map of Sentinel: incident lifecycle, roles, architecture, security, design and delivery',
  'Activer ou couper les animations': 'Turn animations on or off',
  'ANIMATION · ': 'ANIMATION · ',
  'Vues de la carte': 'Map views',
  Soutenance: 'Presentation',
  'Diaporama de soutenance Sentinel': 'Sentinel project presentation',
  'Lancer ou arrêter le parcours guidé': 'Start or stop the guided tour',
  PARCOURIR: 'TOUR',
  'SURVOLER · CLIQUER': 'HOVER · CLICK',
  ARRÊTER: 'STOP',
  INTERACTIF: 'INTERACTIVE',
  'Que fait Sentinel, et pour qui ?': 'What does Sentinel do, and for whom?',
  Orbite: 'Orbit',
  "Vue d'ensemble : les espaces de Sentinel autour de la boucle d'apprentissage":
    "Overview: Sentinel's spaces around the learning loop",
  Finalité: 'Purpose',
  'Maîtrise collective': 'Collective mastery',
  'Suivi des incidents industriels': 'Industrial incident tracking',
  'Une application full-stack qui suit une anomalie de production de la déclaration à la capitalisation. Elle structure les décisions humaines et leur trace : elle ne pilote pas les machines et ne remplace pas une GMAO.':
    "A full-stack app that follows a production anomaly from report to lasting knowledge. It structures human decisions and their trail: it doesn't control machines and doesn't replace a CMMS.",
  Atelier: 'Workshop',
  Signaler: 'Report',
  'Boucle · 01': 'Loop · 01',
  "L'opérateur établit la vérité à la source : ligne, machine, robot, tête, état d'anomalie et produit. Signaler doit être rapide, juste, sans friction ni crainte de l'erreur. Une seule anomalie active par emplacement.":
    'The operator establishes the truth at the source: line, machine, robot, head, anomaly state and product. Reporting must be fast, accurate, frictionless and free of fear of error. One active anomaly per location.',
  Opérateur: 'Operator',
  Résoudre: 'Resolve',
  'Boucle · 02': 'Loop · 02',
  "La maintenance prend en charge, met en attente avec un motif, reprend, puis clôture. Le responsable priorise et arbitre les demandes de correction ou d'annulation, dans la même transaction que la décision.":
    'Maintenance takes it on, puts it on hold with a reason, resumes, then closes. The supervisor prioritizes and arbitrates correction or cancellation requests, in the same transaction as the decision.',
  Responsable: 'Supervisor',
  Documenter: 'Document',
  'Boucle · 03': 'Loop · 03',
  "Une clôture exige une note d'intervention. Chaque mutation écrit son acteur, son contexte et des snapshots dans un journal append-only : la trace reste intelligible même après anonymisation d'un compte.":
    'Closing requires an intervention note. Every mutation records its actor, context and snapshots in an append-only log: the trail stays readable even after an account is anonymized.',
  "Note d'intervention": 'Intervention note',
  Apprendre: 'Learn',
  'Boucle · 04': 'Loop · 04',
  'Signaler, résoudre, documenter, apprendre, mieux signaler : la spirale par laquelle le collectif progresse au lieu de répéter. La valeur de Sentinel ne tient pas au temps gagné, mais à la progression durable des personnes.':
    "Report, resolve, document, learn, report better: the spiral through which the team improves instead of repeating itself. Sentinel's value is not time saved but people's lasting growth.",
  'Cet incident clôturé alimente-t-il une mémoire réutilisable, ou disparaît-il dans un journal ?':
    'Does this closed incident feed reusable memory, or vanish into a log?',
  'Principe P5': 'Principle P5',
  'Où en est un incident, et que peut-on en faire ?':
    'Where does an incident stand, and what next?',
  "Cycle de vie d'un incident : statuts et transitions autorisées":
    'Incident lifecycle: statuses and allowed transitions',
  Invariant: 'Invariant',
  '1 seul incident actif / emplacement': 'Only 1 active incident / location',
  CRÉATION: 'CREATION',
  'Déclarer un incident': 'Report an incident',
  "Les trois rôles peuvent déclarer : ligne, machine, robot, tête, état et produit. Effets : statut OPEN non pris, snapshot du déclarant, événement CREATED. La création n'ajoute aucun suivi.":
    'All three roles can report: line, machine, robot, head, state and product. Effects: status OPEN unclaimed, reporter snapshot, CREATED event. Creation adds no follower.',
  'Prendre en charge': 'Take charge',
  'Réservé à la maintenance, sur un incident OPEN sans arbitrage ouvert. Revendique un incident non pris ou transfère un incident pris par un autre technicien. Un technicien déjà affecté ne peut pas se réaffecter.':
    'Maintenance only, on an OPEN incident with no open arbitration. Claims an unclaimed incident or transfers one taken by another technician. An assigned technician cannot reassign to themselves.',
  'Mettre en attente': 'Put on hold',
  "La maintenance suspend un incident pris, sans arbitrage ouvert, avec un motif non vide. L'affectation est conservée ; le motif courant est enregistré dans waiting_reason.":
    'Maintenance suspends a claimed incident, with no open arbitration, giving a non-empty reason. The assignment is kept; the current reason is stored in waiting_reason.',
  'Motif requis': 'Reason required',
  Reprendre: 'Resume',
  "Retour à OPEN, affectation conservée. Tout technicien de maintenance peut reprendre, afin de ne pas bloquer une équipe en cas d'absence ; un transfert explicite passe ensuite par TAKE.":
    "Back to OPEN, assignment kept. Any maintenance technician can resume, so a team isn't blocked by an absence; an explicit transfer then goes through TAKE.",
  "close + note d'intervention": 'close + intervention note',
  Clôturer: 'Close',
  "Sur un incident OPEN pris, sans arbitrage ouvert, avec une note d'intervention obligatoire. Un incident en attente doit d'abord être repris. La date et l'acteur de clôture sont historisés.":
    'On a claimed OPEN incident, with no open arbitration and a mandatory intervention note. An on-hold incident must be resumed first. Closing date and actor are recorded.',
  'Note requise': 'Note required',
  'invalidate + motif': 'invalidate + reason',
  'Invalider une clôture': 'Invalidate a closure',
  "Le responsable invalide une clôture, avec un motif obligatoire. L'incident passe INVALIDATED ; il n'est pas réouvert. Un incident terminal ne redevient jamais actif.":
    'The supervisor invalidates a closure, with a mandatory reason. The incident becomes INVALIDATED; it is not reopened. A terminal incident never becomes active again.',
  'Annuler un incident non pris': 'Cancel an unclaimed incident',
  "Responsable ou maintenance, uniquement si l'incident n'est pas pris et sans arbitrage ouvert. Un opérateur, lui, passe par une demande d'annulation que le responsable arbitre.":
    'Supervisor or maintenance, only if the incident is unclaimed with no open arbitration. An operator instead files a cancellation request that the supervisor arbitrates.',
  'cancel · responsable': 'cancel · supervisor',
  'Annuler un incident en attente': 'Cancel an on-hold incident',
  "Décision de supervision réservée au responsable. L'incident est conservé intégralement dans l'historique, mais exclu des indicateurs opérationnels actifs.":
    'A supervisory decision reserved for the supervisor. The incident is kept in full in the history but excluded from active operational metrics.',
  'Non pris': 'Unclaimed',
  'Statut · OPEN non pris': 'Status · OPEN, unclaimed',
  'Incident déclaré, à prendre': 'Incident reported, unclaimed',
  'Statut actif : is_taken, technicien et date de prise sont nuls, et la base interdit toute combinaison incohérente de ces trois champs. Une seule anomalie active peut exister pour un emplacement machine.':
    'Active status: is_taken, technician and claim date are null, and the database forbids any inconsistent combination of these three fields. Only one active anomaly can exist per machine location.',
  Actif: 'Active',
  Pris: 'Taken',
  'Statut · OPEN pris': 'Status · OPEN, taken',
  'En cours de traitement': 'In progress',
  'Revendiqué par un technicien de maintenance. Côté maintenance, seul le technicien affecté peut le modifier ; le responsable peut toujours éditer les champs descriptifs, et un autre technicien peut le reprendre par TAKE.':
    'Claimed by a maintenance technician. On the maintenance side, only the assigned technician can edit it; the supervisor can always edit descriptive fields, and another technician can take it over via TAKE.',
  'En attente': 'On hold',
  'Traitement suspendu': 'Work suspended',
  "Suspendu avec un motif. Un incident PENDING est toujours pris. Seul le responsable peut l'annuler ; pour clôturer, il faut d'abord reprendre.":
    'Suspended with a reason. A PENDING incident is always claimed. Only the supervisor can cancel it; to close it, it must be resumed first.',
  'Toujours pris': 'Always claimed',
  Clôturé: 'Closed',
  'Intervention clôturée': 'Intervention closed',
  "Clôturé avec une note d'intervention. Un incident terminal ne redevient jamais actif. C'est ce qui alimente la base de connaissance : la mémoire de l'atelier.":
    "Closed with an intervention note. A terminal incident never becomes active again. This is what feeds the knowledge base: the workshop's memory.",
  Annulé: 'Canceled',
  'Déclaration annulée': 'Report canceled',
  "Conservée dans l'historique, exclue des indicateurs actifs. L'archivage forcé d'une ligne annule aussi ses incidents actifs — motif line_archived — et rend leurs arbitrages caducs, dans la même transaction.":
    'Kept in history, excluded from active metrics. Force-archiving a line also cancels its active incidents — reason line_archived — and voids their arbitrations, in the same transaction.',
  Invalidé: 'Invalidated',
  'Clôture invalidée': 'Closure invalidated',
  "Une clôture jugée non recevable par un responsable, avec son motif. Elle reste tracée ; annulations et invalidations n'alimentent ni les KPI actifs ni la base de connaissance.":
    'A closure a supervisor deemed unacceptable, with its reason. It stays on record; cancellations and invalidations feed neither active KPIs nor the knowledge base.',
  Arbitrage: 'Arbitration',
  'une demande ouverte bloque les mutations concurrentes':
    'an open request blocks concurrent mutations',
  Autorité: 'Authority',
  "la policy backend décide — le frontend n'en est que le miroir":
    'the backend policy decides — the frontend only mirrors it',
  'Qui peut faire quoi ?': 'Who can do what?',
  Rôles: 'Roles',
  'Matrice des permissions par rôle Atelier': 'Permission matrix by Workshop role',
  'Policy serveur · canPerform': 'Server policy · canPerform',
  "Les trois rôles déclarent. Une seule anomalie active peut exister par emplacement machine, et la création n'ajoute aucun suivi automatique.":
    'All three roles report. Only one active anomaly can exist per machine location, and creation adds no automatic follow.',
  'Demander / retirer une correction (sa déclaration)':
    'Request / withdraw a correction (own report)',
  "Seul l'opérateur déclarant, sur sa propre déclaration active et sans autre arbitrage ouvert. Seuls les champs demandés sont stockés dans le cas d'arbitrage.":
    'Only the reporting operator, on their own active report with no other open arbitration. Only the requested fields are stored in the arbitration case.',
  'Demander / retirer une annulation (déclaration non prise)':
    'Request / withdraw a cancellation (unclaimed report)',
  "Possible tant que la déclaration n'est pas prise, avec un motif. La demande peut être retirée tant qu'elle attend l'arbitrage.":
    'Allowed while the report is unclaimed, with a reason. The request can be withdrawn while awaiting arbitration.',
  'Modifier un incident actif non pris': 'Edit an unclaimed active incident',
  "Responsable ou maintenance (DIRECT_EDIT). Une mise à jour sans écart réel répond NO_CHANGES : ni écriture, ni événement d'audit trompeur.":
    'Supervisor or maintenance (DIRECT_EDIT). An update with no real change returns NO_CHANGES: no write, no misleading audit event.',
  'Modifier un incident actif pris': 'Edit a claimed active incident',
  'Le responsable édite les champs descriptifs ; la maintenance seulement si elle est le technicien affecté (EDIT_AFTER_TAKE).':
    'The supervisor edits descriptive fields; maintenance only if it is the assigned technician (EDIT_AFTER_TAKE).',
  'Prendre / transférer un incident': 'Take / transfer an incident',
  'Prise en charge ou transfert explicite, réservés à la maintenance. Un technicien déjà affecté ne peut pas se réaffecter.':
    'Taking charge or explicit transfer, reserved for maintenance. An assigned technician cannot reassign to themselves.',
  'Mettre en attente / reprendre / clôturer': 'Put on hold / resume / close',
  "Les actions de traitement. Une maintenance remplaçante peut suspendre, reprendre ou clôturer pour ne pas bloquer une équipe en cas d'absence.":
    "The handling actions. A stand-in maintenance tech can suspend, resume or close so a team isn't blocked by an absence.",
  "Responsable ou maintenance, uniquement si l'incident n'est pas pris et sans arbitrage ouvert.":
    'Supervisor or maintenance, only if the incident is unclaimed with no open arbitration.',
  'Décision de supervision, réservée au responsable.':
    'A supervisory decision, reserved for the supervisor.',
  'Arbitrer correction / annulation': 'Arbitrate correction / cancellation',
  "Approuver ou rejeter. La décision et la transition de l'incident partagent la même transaction ; « Annuler » la modale ne consulte jamais le cas.":
    'Approve or reject. The decision and the incident transition share one transaction; “Cancel” on the modal never consults the case.',
  'Définir priorité / consigne': 'Set priority / instruction',
  'Le responsable priorise et laisse une consigne, lisible à distance sur le Board.':
    'The supervisor prioritizes and leaves an instruction, readable from afar on the Board.',
  "Avec un motif obligatoire ; l'incident passe INVALIDATED sans être réouvert.":
    'With a mandatory reason; the incident becomes INVALIDATED without being reopened.',
  'Suivre / ne plus suivre': 'Follow / unfollow',
  "Suivi strictement volontaire (l'étoile) : ni la création ni une décision d'arbitrage n'ajoutent de suivi.":
    'Following is strictly voluntary (the star): neither creation nor an arbitration decision adds a follower.',
  'Rôle · OPERATOR · signale': 'Role · OPERATOR · reports',
  "Établit la vérité à la source. Besoin : signaler vite et juste, sans friction ni crainte de l'erreur. Suit l'avancement de ses propres déclarations et peut demander une correction ou une annulation.":
    'Establishes the truth at the source. Need: report fast and accurately, without friction or fear of error. Tracks the progress of their own reports and can request a correction or cancellation.',
  'Rôle · MAINTENANCE · intervient et documente': 'Role · MAINTENANCE · acts and documents',
  "Résout et nourrit la mémoire. Besoin : comprendre vite pour bien agir, et transmettre ce qu'elle apprend. Prend en charge, met en attente, reprend et clôture avec une note d'intervention.":
    'Resolves and feeds the memory. Need: understand fast to act well, and pass on what it learns. Takes charge, puts on hold, resumes and closes with an intervention note.',
  'Rôle · RESPONSABLE · oriente': 'Role · RESPONSABLE · steers',
  'Arbitre pour le collectif. Besoin : une visibilité complète pour décider au bon moment. Priorise, arbitre, invalide une clôture, et seul accède au Journal transverse.':
    'Arbitrates for the team. Need: full visibility to decide at the right time. Prioritizes, arbitrates, invalidates closures, and alone accesses the cross-cutting Log.',
  ' actions sur 13': ' actions of 13',
  ' · si affecté': ' · if assigned',
  'Action · matrice des permissions': 'Action · permission matrix',
  AUTORISÉ: 'ALLOWED',
  'SI AFFECTÉ': 'IF ASSIGNED',
  REFUSÉ: 'DENIED',
  'Comment Sentinel est-il construit ?': 'How is Sentinel built?',
  'Architecture : navigateur, proxy, frontend, backend, PostgreSQL':
    'Architecture: browser, proxy, frontend, backend, PostgreSQL',
  "COUCHES D'UN MODULE BACKEND": 'LAYERS OF A BACKEND MODULE',
  'Méthode, URL, ordre des middlewares : authentification, headers, rate limiting.':
    'Method, URL, middleware order: authentication, headers, rate limiting.',
  'Parsing HTTP, validation Zod, code de réponse. Aucune règle métier.':
    'HTTP parsing, Zod validation, response code. No business rules.',
  "Transaction, invariants, orchestration. La policy actor-aware décide selon le rôle et l'état — c'est la source d'autorité.":
    'Transaction, invariants, orchestration. The actor-aware policy decides by role and state — it is the source of authority.',
  'SQL paramétré et mapping des lignes. Les contraintes SQL restent la dernière défense contre les courses concurrentes.':
    'Parameterized SQL and row mapping. SQL constraints remain the last defense against race conditions.',
  'Couche · route → controller → service → repository':
    'Layer · route → controller → service → repository',
  'TABLES · 6 GROUPES': 'TABLES · 6 GROUPS',
  Identités: 'Identities',
  'admin_accounts (admin unique, garanti par une clé singleton), sentinel_users et password_reset_requests. Les badges actifs sont uniques après normalisation.':
    'admin_accounts (single admin, enforced by a singleton key), sentinel_users and password_reset_requests. Active badges are unique after normalization.',
  Référentiel: 'Reference data',
  "production_lines et production_line_machines : projection normalisée synchronisée par trigger, qui garantit l'unicité globale des identifiants machine.":
    'production_lines and production_line_machines: a normalized projection synced by trigger, enforcing global uniqueness of machine IDs.',
  'workshop_incidents (état courant), workshop_incident_events (journal append-only) et workshop_incident_followers.':
    'workshop_incidents (current state), workshop_incident_events (append-only log) and workshop_incident_followers.',
  'workshop_arbitration_cases : machine à états ACTIVE, CONSULTED, APPROVED, REJECTED, WITHDRAWN, SUPERSEDED.':
    'workshop_arbitration_cases: state machine ACTIVE, CONSULTED, APPROVED, REJECTED, WITHDRAWN, SUPERSEDED.',
  "account_audit_events, line_audit_events et admin_system_audit_events, avec snapshots d'identité pour survivre à l'anonymisation.":
    'account_audit_events, line_audit_events and admin_system_audit_events, with identity snapshots to survive anonymization.',
  'notification_outbox : payload, statut, tentatives, prochaine tentative et destinataires déjà livrés pour une reprise idempotente.':
    'notification_outbox: payload, status, attempts, next attempt and already-delivered recipients for idempotent retries.',
  'Données · groupe de tables': 'Data · table group',
  "Qui peut entrer où, et qu'est-ce qui le garantit ?":
    'Who can enter where, and what guarantees it?',
  Sécurité: 'Security',
  'Sécurité : trois audiences de session cloisonnées et gardes HTTP':
    'Security: three isolated session audiences and HTTP guards',
  '3 audiences · http-only · strict': '3 audiences · http-only · strict',
  GARDES: 'GUARDS',
  SERVEUR: 'SERVER',
  'Sécurité applicative': 'Application security',
  'Gardes communes': 'Shared guards',
  "Chaque requête traverse des gardes serveur : le frontend ne fait qu'améliorer l'UX. Au démarrage, assertProductionConfig() refuse tout secret faible, origine non canonique ou hash Board invalide.":
    'Every request passes through server guards: the frontend only improves UX. At startup, assertProductionConfig() rejects any weak secret, non-canonical origin or invalid Board hash.',
  'Session admin': 'Admin session',
  "Le JWT porte adminId, username et sessionVersion. Il ne donne accès qu'à /api/admin : même origine, mais sessions strictement séparées. Un compte unique, garanti par la base.":
    'The JWT carries adminId, username and sessionVersion. It grants access only to /api/admin: same origin, but strictly separate sessions. A single account, enforced by the database.',
  DÉFENSES: 'DEFENSES',
  'JWT cloisonnés': 'Isolated JWTs',
  'HS256, issuer sentinel, audience et scope identiques, algorithmes en liste fermée, version de session comparée à la base. Un token Board ne peut pas être accepté comme token Atelier ou Admin.':
    'HS256, issuer sentinel, matching audience and scope, allowlisted algorithms, session version checked against the database. A Board token can never pass as a Workshop or Admin token.',
  'HTTP-only, signés, SameSite=Strict, Secure en production. Les guards ne lisent que signedCookies : une valeur altérée est refusée puis effacée.':
    'HTTP-only, signed, SameSite=Strict, Secure in production. Guards read only signedCookies: a tampered value is rejected, then cleared.',
  'Sur toute écriture, Origin (ou Referer) doit valoir exactement CLIENT_ORIGIN, et un Sec-Fetch-Site inter-sites est refusé — en plus de SameSite=Strict.':
    'On every write, Origin (or Referer) must exactly equal CLIENT_ORIGIN, and a cross-site Sec-Fetch-Site is rejected — on top of SameSite=Strict.',
  "Rotation de mot de passe, changement de rôle ou de badge, désactivation : incrément atomique de session_version, sessions coupées immédiatement plutôt qu'à l'expiration du JWT.":
    'Password rotation, role or badge change, deactivation: atomic increment of session_version, sessions cut immediately rather than at JWT expiry.',
  'Limite globale par IP, limite renforcée sur les connexions, le support IA et la réauthentification admin. Compteurs en mémoire de processus : adaptés à une réplique unique ; plusieurs répliques exigeraient un stockage partagé.':
    'Global per-IP limit, stricter limits on logins, AI support and admin re-authentication. Counters live in process memory: fine for a single replica; several replicas would need shared storage.',
  'Défense · couche HTTP': 'Defense · HTTP layer',
  'Quelle règle guide chaque écran ?': 'What rule guides each screen?',
  "Doctrine de design : sept principes et quatre niveaux d'attention":
    'Design doctrine: seven principles and four attention levels',
  '7 principes · 4 niveaux': '7 principles · 4 levels',
  'Finalité · design.md §1': 'Purpose · design.md §1',
  "La maîtrise plutôt que l'optimisation": 'Mastery over optimization',
  "Sentinel est un outil qui s'efface pour que l'atelier se maîtrise lui-même : une mémoire commune, une vision du réel sans zone d'ombre, une compréhension qui permet d'agir. Chaque principe est une règle de décision qu'on peut opposer à une proposition d'interface.":
    'Sentinel is a tool that steps back so the workshop can master itself: a shared memory, a view of reality with no blind spots, an understanding that enables action. Each principle is a decision rule you can hold up against an interface proposal.',
  Hiérarchie: 'Hierarchy',
  'Hiérarchie sans agression': 'Hierarchy without aggression',
  "L'information importante se distingue par le contraste et la position, non par l'intensité : ni saturation maximale, ni clignotement, ni surface rouge. Le stress ne guide pas la décision, il la dégrade.":
    "Important information stands out through contrast and position, not intensity: no maximum saturation, no blinking, no red surfaces. Stress doesn't guide decisions, it degrades them.",
  "Cet élément attire l'œil parce qu'il est important, ou parce qu'il crie ?":
    'Does this element draw the eye because it matters, or because it shouts?',
  Silence: 'Silence',
  'Le silence par défaut': 'Silence by default',
  "L'état normal d'une interface est le calme : pas de décoration, pas d'animation qui attire l'attention sur l'interface elle-même, pas de champ affiché sans usage. L'attention est une ressource rare.":
    "An interface's normal state is calm: no decoration, no animation drawing attention to the interface itself, no field shown without a use. Attention is a scarce resource.",
  "Si je retire cet élément, l'utilisateur perd-il une information utile à sa décision ?":
    'If I remove this element, does the user lose information useful to their decision?',
  'Une question': 'One question',
  'Répondre à une question': 'Answer one question',
  "Chaque écran existe pour répondre à une question précise, pour un rôle donné. L'information vient à l'utilisateur ; il n'a ni à la chercher ni à reconstituer la situation.":
    'Every screen exists to answer a specific question, for a given role. Information comes to the user; they neither search for it nor piece the situation together.',
  'Quelle est la question à laquelle cet écran répond pour ce rôle ?':
    'What question does this screen answer for this role?',
  Couleur: 'Color',
  'La couleur comme langage': 'Color as a language',
  "La couleur encode un niveau d'attention, de façon constante dans toute l'application. Les tokens --attention-* sont la source unique : cartes, board, pilotage et badges les consomment tous.":
    'Color encodes an attention level, consistently across the whole app. The --attention-* tokens are the single source: cards, board, oversight and badges all consume them.',
  "Ce traitement correspond-il à un niveau d'attention réel et constant ailleurs dans l'application ?":
    'Does this treatment match a real attention level, used consistently elsewhere in the app?',
  Apprentissage: 'Learning',
  "De l'incident à l'apprentissage": 'From incident to learning',
  "Sentinel ne se limite pas à tracer : il capitalise. Un incident documenté alimente une mémoire qui fait progresser les personnes. La base de connaissance est un dispositif d'apprentissage, pas une archive.":
    "Sentinel doesn't just keep a record: it turns incidents into knowledge. A documented incident feeds a memory that helps people grow. The knowledge base is a learning tool, not an archive.",
  'Sans punir': 'No blame',
  'Responsabiliser sans punir': 'Accountability without blame',
  "La traçabilité valorise la contribution ; elle n'est pas un instrument de surveillance. Signaler, intervenir, se tromper de bonne foi doit rester sûr — l'erreur honnête se distingue de la faute.":
    'Traceability recognizes contribution; it is not a surveillance tool. Reporting, intervening and making good-faith mistakes must stay safe — an honest error is not misconduct.',
  "« Qui a fait quoi » donne-t-il envie de contribuer, ou crainte d'être pris en faute ?":
    'Does “who did what” make people want to contribute, or fear being caught out?',
  Temps: 'Time',
  'Le temps comme matière': 'Time as material',
  "Ce qui inquiète n'est pas qu'un incident existe, mais qu'il dure. La durée vécue est visible (« depuis 3 h ») et l'ancienneté doit moduler doucement le niveau d'attention, sans rupture brutale. La fonction existe ; son branchement sur les cartes est une évolution prévue.":
    'What worries people is not that an incident exists but that it lasts. Elapsed time is visible (“for 3 h”) and age should gently raise the attention level, without abrupt jumps. The function exists; wiring it into the cards is a planned change.',
  "Le temps écoulé est-il visible et porteur de sens, ou réduit à une date qu'il faut calculer ?":
    'Is elapsed time visible and meaningful, or reduced to a date you have to work out?',
  'Principe ': 'Principle ',
  "NIVEAUX D'ATTENTION": 'ATTENTION LEVELS',
  "P7 · ÂGE D'UN INCIDENT": 'P7 · INCIDENT AGE',
  ' J': ' D',
  "Ancienneté de l'incident en jours": 'Incident age in days',
  'DEPUIS ': 'FOR ',
  démo: 'demo',
  'ageAttentionLevel · paliers 1 · 3 · 7 j': 'ageAttentionLevel · steps 1 · 3 · 7 d',
  'Comment une modification arrive-t-elle en production ?': 'How does a change reach production?',
  Livraison: 'Delivery',
  'Chaîne de livraison : de la pull request au déploiement par digest':
    'Delivery chain: from pull request to deployment by digest',
  'Garde-fou': 'Safeguard',
  '6 checks requis avant fusion': '6 checks required before merge',
  '6 verts': '6 green',
  'main protégée': 'protected main',
  'Étape 01 · GitHub': 'Step 01 · GitHub',
  'Un ruleset actif protège main, sans acteur de bypass : pull request obligatoire, conversations résolues, branche à jour, force-push et suppression bloqués. Un commit porte une intention cohérente.':
    'An active ruleset protects main, with no bypass actor: pull request required, conversations resolved, branch up to date, force-push and deletion blocked. Each commit carries one coherent intent.',
  'Sans bypass': 'No bypass',
  'Étape 02 · GitHub Actions': 'Step 02 · GitHub Actions',
  'Six contrats CI indépendants': 'Six independent CI contracts',
  "Tous requis avant fusion — c'est la vraie barrière, pas une signature : le dépôt est mono-mainteneur, donc les approbations humaines sont volontairement fixées à 0. Survole chaque satellite pour voir ce qu'il contrôle.":
    'All required before merge — the real barrier, not a sign-off: the repo has a single maintainer, so human approvals are deliberately set to 0. Hover each satellite to see what it checks.',
  '6 CHECKS': '6 CHECKS',
  REQUIS: 'REQUIRED',
  'Format, lint, scripts TypeScript, build, couverture (seuils 80 / 75 / 70 / 85 %), fiabilité transverse et audit npm.':
    'Format, lint, TypeScript scripts, build, coverage (thresholds 80 / 75 / 70 / 85 %), cross-cutting reliability and npm audit.',
  'Format, lint, build, couverture (seuils 85 / 80 / 90 / 90 %) et audit npm.':
    'Format, lint, build, coverage (thresholds 85 / 80 / 90 / 90 %) and npm audit.',
  "PostgreSQL 15 réel, migrations complètes, suites d'intégration auth, comptes, lignes et cycle Atelier.":
    'Real PostgreSQL 15, full migrations, integration suites for auth, accounts, lines and the Workshop lifecycle.',
  "Chromium via Playwright, fixtures dédiées sur une base isolée, parcours mobiles, diagnostics conservés en cas d'échec.":
    'Chromium via Playwright, dedicated fixtures on an isolated database, mobile journeys, diagnostics kept on failure.',
  'Validation du Compose, construction des images, utilisateurs non-root, Nginx, Caddy et ShellCheck.':
    'Compose validation, image builds, non-root users, Nginx, Caddy and ShellCheck.',
  'Exercice de sauvegarde puis restauration, isolé, contre un PostgreSQL réel.':
    'Backup-then-restore drill, isolated, against a real PostgreSQL.',
  'Check requis · ': 'Required check · ',
  Requis: 'Required',
  'Étape 03 · fusion': 'Step 03 · merge',
  'Fusion par merge commit': 'Merge via merge commit',
  "Branche à jour exigée, conversations résolues, six checks verts. Fusion par merge commit uniquement : l'historique linéaire est désactivé volontairement, Sentinel publie après une vraie fusion, pas après un squash ou un rebase.":
    'Up-to-date branch required, conversations resolved, six green checks. Merge commits only: linear history is deliberately off, so Sentinel ships after a real merge, not a squash or rebase.',
  'Étape 04 · publication': 'Step 04 · publish',
  'Release immuable': 'Immutable release',
  'Le tag v* est immuable et la publication ne se déclenche jamais sur un push de tag : uniquement par workflow_dispatch depuis main, le commit du tag, le checkout et origin/main devant être identiques. Actions tierces épinglées par SHA, images publiées avec leurs digests.':
    'The v* tag is immutable and publishing never fires on a tag push: only via workflow_dispatch from main, with the tag commit, checkout and origin/main identical. Third-party actions pinned by SHA, images published with their digests.',
  Sauvegarde: 'Backup',
  'Étape 05 · exploitation': 'Step 05 · operations',
  'Sauvegarde avant tout': 'Backup first',
  "Dump gzip atomique avec checksum et rétention, verrou partagé avec la restauration. La restauration valide le dump dans une base temporaire — tables, ledger de migrations comparé aux fichiers du checkout — avant d'échanger les noms de base.":
    'Atomic gzip dump with checksum and retention, sharing a lock with restore. Restore validates the dump in a temporary database — tables, migration ledger checked against checkout files — before swapping database names.',
  Atomique: 'Atomic',
  'Pull par digest': 'Pull by digest',
  'Étape 06 · déploiement': 'Step 06 · deploy',
  'Images épinglées par digest': 'Images pinned by digest',
  "Le VPS exécute exactement l'image construite et vérifiée en CI : jamais de reconstruction locale. Le pull est non destructif, aucun conteneur en cours n'est remplacé.":
    'The VPS runs exactly the image built and verified in CI: never a local rebuild. The pull is non-destructive; no running container is replaced.',
  'Sans build': 'No build',
  Préflight: 'Preflight',
  'Étape 07 · déploiement': 'Step 07 · deploy',
  "Lit le .env du déploiement sans remplacer aucun service. Côté backend, le démarrage lui-même refuse un secret faible, une origine non canonique, un hash Board invalide ou un BUILD_SHA qui n'est pas un SHA complet.":
    "Reads the deployment .env without replacing any service. On the backend, startup itself rejects a weak secret, non-canonical origin, invalid Board hash or a BUILD_SHA that isn't a full SHA.",
  Déploiement: 'Deployment',
  'Étape 08 · déploiement': 'Step 08 · deploy',
  'Mise à jour sans arrêt gratuit': 'Updates without needless downtime',
  "docker compose up -d --no-build : seuls les conteneurs dont l'image ou la config change sont recréés — jamais de down pour une mise à jour normale. Les migrations s'appliquent sous verrou avant que le backend n'écoute.":
    'docker compose up -d --no-build: only containers whose image or config changed are recreated — never a down for a normal update. Migrations apply under lock before the backend listens.',
  'Étape 09 · preuve': 'Step 09 · proof',
  'La version égale le commit du tag': 'Version equals the tag commit',
  "/api/health interroge réellement PostgreSQL et publie le SHA Git complet embarqué dans l'image. La version doit égaler le commit du tag déployé, et le digest de l'image backend celui de la release : l'alignement du VPS se vérifie en une requête.":
    "/api/health really queries PostgreSQL and publishes the full Git SHA baked into the image. The version must equal the deployed tag's commit, and the backend image digest the release's: VPS alignment is checked in one request.",
  Vérifiable: 'Verifiable',
  'rollback · digests de la release précédente': 'rollback · previous release digests',
  'Procédure · production.md §12': 'Procedure · production.md §12',
  'Retour arrière par digest': 'Rollback by digest',
  "Le rollback ne reconstruit rien : on remet dans le .env le BUILD_SHA et les digests de la release précédente, puis pull, préflight, up, health. Si le schéma n'est pas rétrocompatible, on restaure la sauvegarde prise juste avant le déploiement.":
    "Rollback rebuilds nothing: put the previous release's BUILD_SHA and digests back in .env, then pull, preflight, up, health. If the schema isn't backward-compatible, restore the backup taken just before deployment.",
  'Sans rebuild': 'No rebuild',
  Pilotage: 'Oversight',
  Journal: 'Log',
  Connaissance: 'Knowledge',
  'Opér.': 'Oper.',
  'Resp.': 'Supv.',
  'Demander / retirer une correction': 'Request / withdraw a correction',
  'Demander / retirer une annulation': 'Request / withdraw a cancellation',
  '/ SENTINEL / CHAÎNE / ': '/ SENTINEL / CHAIN / ',
  'Espace · /workshop/*': 'Space · /workshop/*',
  'Déclarer, traiter, arbitrer, piloter et capitaliser. Trois rôles — Opérateur, Maintenance, Responsable — partagent les mêmes écrans ; la policy serveur décide de ce que chacun peut faire.':
    'Report, handle, arbitrate, oversee and turn into knowledge. Three roles — Operator, Maintenance, Supervisor — share the same screens; the server policy decides what each can do.',
  'Espace · /board': 'Space · /board',
  'Affichage grand écran en lecture seule, lisible de loin, qui ne doit jamais agresser. Il tourne entre alertes, incidents actifs et synthèse par ligne ; aucune action métier, aucune fuite des API Atelier.':
    'Read-only wall display, legible from afar, that must never feel aggressive. It cycles through alerts, active incidents and a per-line summary; no business actions, no leaks from the Workshop APIs.',
  'Lecture seule': 'Read-only',
  'Code bcrypt': 'bcrypt code',
  'Espace · /admin/*': 'Space · /admin/*',
  'Compte système unique : comptes, lignes et machines, sécurité, notifications, dashboards de qualité et audit consolidé. Les actions sensibles exigent une réauthentification.':
    'Single system account: accounts, lines and machines, security, notifications, quality dashboards and consolidated audit. Sensitive actions require re-authentication.',
  'Compte unique': 'Single account',
  Réauth: 'Reauth',
  'Que révèle la durée ?': 'What does age reveal?',
  'Vue · /workshop/pilotage': 'View · /workshop/pilotage',
  "Volumes créés et clôturés, taux de clôture, ancienneté maximale, tendances journalières (journée métier Europe/Paris) et classements par ligne, machine et type d'anomalie. Accessible aux trois rôles.":
    'Created and closed volumes, closure rate, maximum age, daily trends (Europe/Paris business day) and rankings by line, machine and anomaly type. Available to all three roles.',
  Tendances: 'Trends',
  'Trace transverse': 'Global trail',
  'Vue · /workshop/journal': 'View · /workshop/journal',
  "Que s'est-il passé dans l'atelier, tous incidents confondus ? Vue transverse des événements, filtrable, réservée au Responsable. L'Historique, lui, relit un incident précis.":
    'What happened in the workshop, across all incidents? A filterable cross-cutting view of events, reserved for the Supervisor. History, by contrast, replays a single incident.',
  'Mémoire réutilisable': 'Reusable memory',
  'Vue · /workshop/knowledge': 'View · /workshop/knowledge',
  'Base de connaissance': 'Knowledge base',
  "Ne retient que les incidents clôturés avec une intervention exploitable. Un dispositif d'apprentissage, pas une archive : chaque fiche se conçoit pour être assimilée, pas seulement lue.":
    'Keeps only closed incidents with a usable intervention. A learning tool, not an archive: each entry is designed to be absorbed, not just read.',
  Clôturés: 'Closed',
  'Asynchrone · notification_outbox': 'Asynchronous · notification_outbox',
  'Outbox de notifications': 'Notification outbox',
  'Les mails sont déposés dans une outbox avec la transaction métier, puis envoyés par un worker avec retries et backoff. Une panne SMTP ne défait jamais une décision déjà validée.':
    'Emails are written to an outbox within the business transaction, then sent by a worker with retries and backoff. An SMTP outage never undoes a decision already made.',
  'SMTP optionnel': 'Optional SMTP',
  'sql paramétré': 'param. sql',
  'clé jamais exposée au navigateur': 'key never exposed to the browser',
  Navigateur: 'Browser',
  'SPA React 18': 'React 18 SPA',
  'Client · frontend/src': 'Client · frontend/src',
  'SPA React 18 + TypeScript, Vite 8, React Router en Declarative Mode, pages chargées en lazy. Client fetch typé, annulable, avec timeout ; un chargement périmé ne peut jamais écraser un résultat plus récent. Aucun dangerouslySetInnerHTML ni secret côté client.':
    'React 18 + TypeScript SPA, Vite 8, React Router in Declarative Mode, lazy-loaded pages. Typed, cancelable fetch client with timeouts; a stale load can never overwrite a newer result. No dangerouslySetInnerHTML and no client-side secrets.',
  'Caddy · Nginx hôte': 'Caddy · host Nginx',
  "Topologie A : Caddy intégré, seul à publier 80/443. Topologie B, celle de l'instance publique : Nginx hôte, services publiés uniquement sur 127.0.0.1. Dans les deux cas /api/* va au backend, le reste au frontend.":
    'Topology A: bundled Caddy, the only thing publishing 80/443. Topology B, used by the public instance: host Nginx, services published only on 127.0.0.1. Either way, /api/* goes to the backend and the rest to the frontend.',
  '2 topologies': '2 topologies',
  'Conteneur · non-root': 'Container · non-root',
  'Nginx non-root, système de fichiers en lecture seule, sans capabilities Linux. Assets à cache long, index.html sans cache afin de préserver les déploiements de la SPA.':
    'Non-root Nginx, read-only filesystem, no Linux capabilities. Long-cached assets, uncached index.html to keep SPA deployments safe.',
  'Conteneur · Node 24': 'Container · Node 24',
  "Monolithe modulaire TypeScript, SQL direct sans ORM. Migrations appliquées sous verrou avant d'écouter, worker d'outbox, arrêt idempotent sur SIGTERM. /api/health interroge réellement PostgreSQL et publie le SHA Git déployé.":
    'Modular TypeScript monolith, direct SQL with no ORM. Migrations applied under lock before listening, outbox worker, idempotent shutdown on SIGTERM. /api/health really queries PostgreSQL and publishes the deployed Git SHA.',
  'Données · réseau interne': 'Data · internal network',
  '50 migrations append-only, checksum SHA-256 vérifié au démarrage : une migration modifiée fait refuser le démarrage. Les contraintes SQL — unicité, checks, triggers — doublent les règles métier critiques et ferment les courses concurrentes.':
    '50 append-only migrations, SHA-256 checksum verified at startup: a modified migration blocks startup. SQL constraints — uniqueness, checks, triggers — back up critical business rules and close race conditions.',
  'Jamais publié': 'Never published',
  'Support IA': 'AI support',
  'proxy borné': 'bounded proxy',
  'Module · support': 'Module · support',
  "Le backend est l'unique intermédiaire avec le fournisseur : entrées validées et bornées, rate limit par identité et IP, timeout, taille et schéma de la réponse contrôlés. La base de connaissance fonctionnelle est chargée depuis un document local.":
    'The backend is the sole intermediary with the provider: validated, bounded inputs, rate limits per identity and IP, timeouts, response size and schema checked. The functional knowledge base loads from a local document.',
  'Externe · optionnel': 'External · optional',
  'Fournisseur IA': 'AI provider',
  "Optionnel. Une absence de clé, un timeout ou une réponse invalide produit une erreur explicite sans bloquer le reste de l'application.":
    'Optional. A missing key, a timeout or an invalid response yields an explicit error without blocking the rest of the app.',
  'Dégradation douce': 'Soft degradation',
  'Worker outbox': 'Outbox worker',
  'Outbox durable': 'Durable outbox',
  "Les mails sont insérés avec la transaction métier, puis réservés par lots et envoyés avec retries et backoff. Reprise bornée, déduplication de la source, trace des succès, des skips et des abandons : jamais d'envoi au milieu d'une transaction.":
    'Emails are inserted with the business transaction, then claimed in batches and sent with retries and backoff. Bounded retries, source deduplication, a trail of successes, skips and give-ups: never a send mid-transaction.',
  "Sans SMTP, l'application reste pleinement fonctionnelle : la dégradation est journalisée au démarrage, elle ne bloque rien.":
    'Without SMTP, the app stays fully functional: the degradation is logged at startup and blocks nothing.',
  'JWT atelier': 'JWT workshop',
  'Session atelier': 'Workshop session',
  "Le JWT porte userId, badge, rôle et sessionVersion. Il ouvre /api/workshop et peut aussi lire la projection Board — sans réciprocité. Le badge est numérique, l'identifiant admin ne peut pas l'être : les namespaces sont disjoints.":
    'The JWT carries userId, badge, role and sessionVersion. It opens /api/workshop and can also read the Board projection — not the other way round. Badges are numeric, admin usernames cannot be: the namespaces are disjoint.',
  'Session board': 'Board session',
  "Obtenue avec un code local comparé à un hash bcrypt, puis révocable à tout moment par version. Elle ne donne accès qu'à la projection en lecture seule, jamais aux endpoints Atelier.":
    'Obtained with a local code checked against a bcrypt hash, then revocable at any time by version. It grants access only to the read-only projection, never to Workshop endpoints.',
  'Espace · /api/admin': 'Space · /api/admin',
  "Toutes les routes exigent une session admin, y compris les lectures sensibles. Réauthentification sur les actions sensibles : les quatre premiers échecs refusent l'action, le cinquième révoque toutes les sessions admin (SESSION_REVOKED).":
    'Every route requires an admin session, including sensitive reads. Re-authentication for sensitive actions: the first four failures reject the action, the fifth revokes all admin sessions (SESSION_REVOKED).',
  'Espace · /api/workshop': 'Space · /api/workshop',
  "Le middleware relit l'utilisateur à chaque requête sensible : existence, activation, rôle, session_version. Suspension ou changement de rôle : effet immédiat, sans attendre l'expiration du JWT.":
    'The middleware reloads the user on every sensitive request: existence, activation, role, session_version. Suspension or role change takes effect immediately, without waiting for the JWT to expire.',
  'Espace · /api/board': 'Space · /api/board',
  "Projection lecture seule, accessible avec un cookie Board ou Atelier. Cache-Control: no-store, y compris sur les erreurs. Le Board ne réutilise jamais les endpoints détaillés de l'Atelier.":
    "Read-only projection, accessible with a Board or Workshop cookie. Cache-Control: no-store, errors included. The Board never reuses the Workshop's detailed endpoints.",
  'Board ou Atelier': 'Board or Workshop',
  MAÎTRISE: 'MASTERY',
  'CLÉ JAMAIS EXPOSÉE': 'KEY NEVER EXPOSED',
  'AU NAVIGATEUR': 'TO THE BROWSER',
  'autres chemins': 'other paths',
  'avant bascule': 'before cutover',
  'sans rebuild': 'no rebuild',
  'tag immuable': 'immutable tag',
  signale: 'reports',
  intervient: 'intervenes',
  oriente: 'steers',
  optionnel: 'optional',
  'Statut · ': 'Status · ',
};

export default dictionary;
