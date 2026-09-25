import type { Locale } from './locales';

export const legalPageIds = ['privacy', 'legal', 'cookies'] as const;
export type LegalPageId = (typeof legalPageIds)[number];

export interface LegalSection {
  id: string;
  title: string;
  paragraphs?: readonly string[];
  items?: readonly string[];
}

export interface LegalPageContent {
  eyebrow: string;
  title: string;
  description: string;
  updatedLabel: string;
  updatedAt: string;
  sections: readonly LegalSection[];
}

export interface LegalPageDefinition {
  id: LegalPageId;
  slug: Record<Locale, string>;
  label: Record<Locale, string>;
  content: Record<Locale, LegalPageContent>;
}

const enUpdated = '25 September 2026';
const frUpdated = '25 septembre 2026';

export const legalPages: readonly LegalPageDefinition[] = [
  {
    id: 'privacy',
    slug: { en: 'privacy', fr: 'confidentialite' },
    label: { en: 'Privacy', fr: 'Confidentialité' },
    content: {
      en: {
        eyebrow: 'Data protection',
        title: 'Privacy policy',
        description:
          'How AkikSystems handles personal data when you browse this website or use its private administration.',
        updatedLabel: 'Last updated',
        updatedAt: enUpdated,
        sections: [
          {
            id: 'controller',
            title: 'Who is responsible',
            paragraphs: [
              'Amine AKIK, publishing under the AkikSystems name, is responsible for the processing described on this page. Privacy questions can be raised through the Work with us page.',
            ],
          },
          {
            id: 'public-browsing',
            title: 'Public browsing data',
            paragraphs: [
              'Public pages do not contain a contact form, advertising tracker, audience-measurement script, or third-party social widget. AkikSystems does not use public browsing data to create marketing profiles.',
              'The server creates request and correlation identifiers and records limited technical events such as the requested path, HTTP method, response status, and processing duration. Infrastructure providers may also process connection data, including IP addresses, to deliver and secure the service.',
            ],
          },
          {
            id: 'administration',
            title: 'Private administration data',
            paragraphs: [
              'The private administration is restricted to the configured administrator. It processes the administrator email address, password-derived authentication material, session information, two-factor authentication data when enabled, rate-limit records, and an audit trail for significant editorial actions.',
              'This processing is necessary to protect the service, control access, and maintain the integrity and traceability of published content. It is not used for advertising or commercial profiling.',
            ],
          },
          {
            id: 'purposes',
            title: 'Purposes and legal grounds',
            items: [
              'Deliver public pages and media requested by the visitor.',
              'Maintain service security, diagnose failures, and prevent abuse on the basis of legitimate interests.',
              'Authenticate and secure the private administration on the basis of legitimate interests and the operation of the service.',
              'Meet legal obligations when applicable.',
            ],
          },
          {
            id: 'recipients',
            title: 'Recipients and hosting',
            paragraphs: [
              'Data is limited to the publisher and technical providers needed to operate the service. The application and its operational data are hosted using Railway services. Railway may rely on subprocessors and process data outside the European Economic Area under its contractual safeguards.',
              'AkikSystems does not sell personal data and does not disclose it to advertisers.',
            ],
          },
          {
            id: 'retention',
            title: 'Retention',
            paragraphs: [
              'Technical logs are kept only for the period reasonably necessary for security, incident investigation, and service operation, subject to the retention applied by the infrastructure provider. Administration records are retained while the account or audit evidence remains necessary, then deleted or anonymised unless a legal obligation requires longer retention.',
            ],
          },
          {
            id: 'rights',
            title: 'Your rights',
            paragraphs: [
              'Where the GDPR applies, you may request access, correction, deletion, restriction, portability, or object to processing, depending on the legal basis and circumstances. You may also lodge a complaint with the competent supervisory authority; in France, this is the CNIL.',
              'Use the Work with us page to submit a privacy request. Enough information may be requested to verify identity before acting on a request.',
            ],
          },
          {
            id: 'changes',
            title: 'Changes to this policy',
            paragraphs: [
              'This policy is updated when the service, its providers, or applicable requirements change. The date above identifies the current published version.',
            ],
          },
        ],
      },
      fr: {
        eyebrow: 'Protection des données',
        title: 'Politique de confidentialité',
        description:
          'La manière dont AkikSystems traite les données personnelles lors de la consultation du site ou de l’utilisation de son administration privée.',
        updatedLabel: 'Dernière mise à jour',
        updatedAt: frUpdated,
        sections: [
          {
            id: 'responsable',
            title: 'Responsable du traitement',
            paragraphs: [
              'Amine AKIK, qui publie sous le nom AkikSystems, est responsable des traitements décrits sur cette page. Toute question relative à la vie privée peut être adressée depuis la page Travailler ensemble.',
            ],
          },
          {
            id: 'navigation-publique',
            title: 'Données de navigation publique',
            paragraphs: [
              'Les pages publiques ne comportent ni formulaire de contact, ni traceur publicitaire, ni outil de mesure d’audience, ni widget social tiers. AkikSystems n’utilise pas les données de navigation publique pour établir des profils marketing.',
              'Le serveur crée des identifiants de requête et de corrélation et journalise des événements techniques limités : chemin demandé, méthode HTTP, statut de réponse et durée de traitement. Les prestataires d’infrastructure peuvent également traiter des données de connexion, notamment l’adresse IP, afin d’acheminer et de sécuriser le service.',
            ],
          },
          {
            id: 'administration',
            title: 'Données de l’administration privée',
            paragraphs: [
              'L’administration privée est réservée à l’administrateur configuré. Elle traite son adresse électronique, les éléments d’authentification dérivés du mot de passe, les informations de session, les données de double authentification lorsqu’elle est activée, les enregistrements de limitation de débit et une piste d’audit des actions éditoriales significatives.',
              'Ces traitements sont nécessaires pour protéger le service, contrôler les accès et préserver l’intégrité et la traçabilité des contenus publiés. Ils ne servent ni à la publicité ni au profilage commercial.',
            ],
          },
          {
            id: 'finalites',
            title: 'Finalités et bases juridiques',
            items: [
              'Fournir les pages et médias publics demandés par le visiteur.',
              'Sécuriser le service, diagnostiquer les incidents et prévenir les abus sur le fondement de l’intérêt légitime.',
              'Authentifier et sécuriser l’administration privée sur le fondement de l’intérêt légitime et des besoins de fonctionnement du service.',
              'Respecter les obligations légales applicables.',
            ],
          },
          {
            id: 'destinataires',
            title: 'Destinataires et hébergement',
            paragraphs: [
              'Les données sont limitées à l’éditeur et aux prestataires techniques nécessaires au fonctionnement du service. L’application et ses données opérationnelles sont hébergées au moyen des services Railway. Railway peut recourir à des sous-traitants et traiter des données hors de l’Espace économique européen dans le cadre de ses garanties contractuelles.',
              'AkikSystems ne vend aucune donnée personnelle et ne la communique pas à des annonceurs.',
            ],
          },
          {
            id: 'conservation',
            title: 'Durées de conservation',
            paragraphs: [
              'Les journaux techniques sont conservés uniquement pendant la durée raisonnablement nécessaire à la sécurité, à l’analyse des incidents et à l’exploitation du service, sous réserve des durées appliquées par le prestataire d’infrastructure. Les données d’administration sont conservées tant que le compte ou la preuve d’audit reste nécessaire, puis supprimées ou anonymisées sauf obligation légale contraire.',
            ],
          },
          {
            id: 'droits',
            title: 'Vos droits',
            paragraphs: [
              'Lorsque le RGPD s’applique, vous pouvez demander l’accès, la rectification, l’effacement, la limitation, la portabilité ou vous opposer au traitement, selon sa base juridique et les circonstances. Vous pouvez également saisir l’autorité de contrôle compétente ; en France, il s’agit de la CNIL.',
              'Utilisez la page Travailler ensemble pour exercer un droit. Des informations suffisantes pourront être demandées afin de vérifier votre identité avant de traiter la demande.',
            ],
          },
          {
            id: 'evolutions',
            title: 'Évolution de cette politique',
            paragraphs: [
              'Cette politique est mise à jour lorsque le service, ses prestataires ou les exigences applicables évoluent. La date ci-dessus identifie la version actuellement publiée.',
            ],
          },
        ],
      },
    },
  },
  {
    id: 'legal',
    slug: { en: 'legal-notice', fr: 'mentions-legales' },
    label: { en: 'Legal notice', fr: 'Mentions légales' },
    content: {
      en: {
        eyebrow: 'Publisher information',
        title: 'Legal notice',
        description:
          'Publisher, hosting, responsibility, and intellectual-property information for akiksystems.com.',
        updatedLabel: 'Last updated',
        updatedAt: enUpdated,
        sections: [
          {
            id: 'publisher',
            title: 'Publisher',
            paragraphs: [
              'This website is published by Amine AKIK under the AkikSystems name as an independent software and editorial activity. The publication director is Amine AKIK. Requests can be made through the Work with us page.',
            ],
          },
          {
            id: 'hosting',
            title: 'Hosting',
            paragraphs: [
              'The application is hosted by Railway Corporation, United States. Current corporate, contractual, and service information is available from railway.com and its legal documentation.',
            ],
          },
          {
            id: 'ownership',
            title: 'Intellectual property',
            paragraphs: [
              'Unless a page states otherwise, the structure, original text, visual identity, source-specific presentations, and original media published on this website belong to their respective author or rights holder. No transfer of rights is implied by public access.',
              'Short quotations and links are welcome when they identify the source and respect applicable law. Reproduction, adaptation, extraction, or redistribution beyond a lawful exception requires prior permission from the relevant rights holder.',
            ],
          },
          {
            id: 'external-links',
            title: 'External links',
            paragraphs: [
              'External links are provided for context or evidence. AkikSystems does not control third-party availability, security, or later changes and is not responsible for third-party content.',
            ],
          },
          {
            id: 'responsibility',
            title: 'Responsibility',
            paragraphs: [
              'Reasonable care is taken to keep published information accurate and the service available. Information may nevertheless become incomplete or outdated, and uninterrupted availability cannot be guaranteed. Technical and editorial material is provided for information and does not replace advice adapted to a specific situation.',
            ],
          },
          {
            id: 'law',
            title: 'Applicable law',
            paragraphs: [
              'This website and this notice are governed by French law, subject to any mandatory rules that apply to the visitor. Any dispute should first be raised with the publisher in an attempt to reach an amicable resolution.',
            ],
          },
        ],
      },
      fr: {
        eyebrow: 'Informations sur l’éditeur',
        title: 'Mentions légales',
        description:
          'Informations relatives à l’éditeur, à l’hébergement, à la responsabilité et à la propriété intellectuelle de akiksystems.com.',
        updatedLabel: 'Dernière mise à jour',
        updatedAt: frUpdated,
        sections: [
          {
            id: 'editeur',
            title: 'Éditeur',
            paragraphs: [
              'Ce site est édité par Amine AKIK sous le nom AkikSystems, dans le cadre d’une activité indépendante de création logicielle et éditoriale. Le directeur de la publication est Amine AKIK. Toute demande peut être adressée depuis la page Travailler ensemble.',
            ],
          },
          {
            id: 'hebergement',
            title: 'Hébergement',
            paragraphs: [
              'L’application est hébergée par Railway Corporation, aux États-Unis. Les informations sociales, contractuelles et techniques à jour sont accessibles sur railway.com et dans sa documentation juridique.',
            ],
          },
          {
            id: 'propriete',
            title: 'Propriété intellectuelle',
            paragraphs: [
              'Sauf indication contraire sur une page, la structure, les textes originaux, l’identité visuelle, les présentations propres aux sources et les médias originaux publiés sur ce site appartiennent à leur auteur ou titulaire de droits respectif. Leur consultation publique n’emporte aucune cession de droits.',
              'Les courtes citations et les liens sont bienvenus lorsqu’ils identifient la source et respectent la loi applicable. Toute reproduction, adaptation, extraction ou redistribution dépassant une exception légale exige l’autorisation préalable du titulaire des droits concerné.',
            ],
          },
          {
            id: 'liens-externes',
            title: 'Liens externes',
            paragraphs: [
              'Les liens externes sont fournis à titre de contexte ou de preuve. AkikSystems ne contrôle ni leur disponibilité, ni leur sécurité, ni leurs évolutions et n’est pas responsable des contenus tiers.',
            ],
          },
          {
            id: 'responsabilite',
            title: 'Responsabilité',
            paragraphs: [
              'Un soin raisonnable est apporté à l’exactitude des informations publiées et à la disponibilité du service. Certaines informations peuvent néanmoins devenir incomplètes ou obsolètes et une disponibilité ininterrompue ne peut être garantie. Les contenus techniques et éditoriaux sont fournis à titre informatif et ne remplacent pas un conseil adapté à une situation particulière.',
            ],
          },
          {
            id: 'droit',
            title: 'Droit applicable',
            paragraphs: [
              'Le site et les présentes mentions sont soumis au droit français, sous réserve des règles impératives applicables au visiteur. Tout différend devra d’abord être porté à la connaissance de l’éditeur afin de rechercher une solution amiable.',
            ],
          },
        ],
      },
    },
  },
  {
    id: 'cookies',
    slug: { en: 'cookies', fr: 'cookies' },
    label: { en: 'Cookies', fr: 'Cookies' },
    content: {
      en: {
        eyebrow: 'Browser storage',
        title: 'Cookie policy',
        description:
          'A precise account of cookies and similar browser storage used by AkikSystems.',
        updatedLabel: 'Last updated',
        updatedAt: enUpdated,
        sections: [
          {
            id: 'public-pages',
            title: 'Public pages',
            paragraphs: [
              'AkikSystems does not currently set advertising, audience-measurement, personalisation, or social-network cookies on public pages. No consent banner is shown because there are no optional cookies to accept or refuse.',
              'The locale is expressed in the URL rather than stored in a cookie. Essential navigation features do not require persistent browser storage.',
            ],
          },
          {
            id: 'admin-cookie',
            title: 'Strictly necessary administration cookie',
            paragraphs: [
              'After a successful administrator sign-in, the authentication service sets a session cookie with an AkikSystems-specific name. It is required to keep the private administration authenticated and cannot be disabled while using that area.',
            ],
            items: [
              'Purpose: authentication, session continuity, and protection of the private administration.',
              'Access: HttpOnly, so application scripts cannot read it.',
              'Transmission: Secure in production and SameSite=Lax.',
              'Scope: the website path; it is not an advertising or cross-site tracking cookie.',
              'Lifetime: the server-side session is configured for a maximum of 12 hours and may end earlier after sign-out or invalidation.',
            ],
          },
          {
            id: 'controls',
            title: 'Your controls',
            paragraphs: [
              'You can inspect, block, or delete cookies in your browser settings. Blocking the administration session cookie prevents authenticated administration but does not prevent access to public content.',
            ],
          },
          {
            id: 'changes',
            title: 'Future changes',
            paragraphs: [
              'If optional cookies or comparable tracking technologies are introduced, this page will be updated and an appropriate consent mechanism will be provided before they are activated where consent is required.',
            ],
          },
        ],
      },
      fr: {
        eyebrow: 'Stockage dans le navigateur',
        title: 'Politique relative aux cookies',
        description:
          'Présentation précise des cookies et stockages similaires utilisés par AkikSystems.',
        updatedLabel: 'Dernière mise à jour',
        updatedAt: frUpdated,
        sections: [
          {
            id: 'pages-publiques',
            title: 'Pages publiques',
            paragraphs: [
              'AkikSystems ne dépose actuellement aucun cookie publicitaire, de mesure d’audience, de personnalisation ou de réseau social sur les pages publiques. Aucun bandeau de consentement n’est affiché puisqu’aucun cookie facultatif n’est à accepter ou refuser.',
              'La langue est exprimée dans l’URL et non stockée dans un cookie. Les fonctions essentielles de navigation ne nécessitent aucun stockage persistant dans le navigateur.',
            ],
          },
          {
            id: 'cookie-administration',
            title: 'Cookie d’administration strictement nécessaire',
            paragraphs: [
              'Après une connexion réussie de l’administrateur, le service d’authentification dépose un cookie de session portant un nom propre à AkikSystems. Il est indispensable au maintien de la session dans l’administration privée et ne peut pas être désactivé pendant son utilisation.',
            ],
            items: [
              'Finalité : authentification, continuité de session et protection de l’administration privée.',
              'Accès : HttpOnly, ce qui empêche les scripts applicatifs de le lire.',
              'Transmission : Secure en production et SameSite=Lax.',
              'Portée : le chemin du site ; il ne s’agit ni d’un cookie publicitaire ni d’un traceur intersites.',
              'Durée : la session côté serveur est configurée pour une durée maximale de 12 heures et peut prendre fin plus tôt après déconnexion ou invalidation.',
            ],
          },
          {
            id: 'reglages',
            title: 'Vos réglages',
            paragraphs: [
              'Vous pouvez consulter, bloquer ou supprimer les cookies depuis les réglages de votre navigateur. Le blocage du cookie de session empêche l’utilisation authentifiée de l’administration, sans empêcher l’accès aux contenus publics.',
            ],
          },
          {
            id: 'evolutions',
            title: 'Évolutions futures',
            paragraphs: [
              'Si des cookies facultatifs ou des technologies de suivi comparables sont ajoutés, cette page sera mise à jour et un mécanisme de consentement adapté sera présenté avant leur activation lorsque le consentement est requis.',
            ],
          },
        ],
      },
    },
  },
];

export function legalPageById(id: LegalPageId): LegalPageDefinition {
  const page = legalPages.find((candidate) => candidate.id === id);
  if (page === undefined) throw new Error(`Unknown legal page: ${id}`);
  return page;
}

export function legalPageHref(id: LegalPageId, locale: Locale): string {
  return `/${locale}/${legalPageById(id).slug[locale]}`;
}
