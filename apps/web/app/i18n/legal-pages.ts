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
  updatedAtIso: string;
  sections: readonly LegalSection[];
}

export interface LegalPageDefinition {
  id: LegalPageId;
  slug: Record<Locale, string>;
  label: Record<Locale, string>;
  content: Record<Locale, LegalPageContent>;
}

const updatedAtIso = '2026-09-29';
const legalNoticeUpdatedAtIso = '2026-09-30';

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
          'How the code-only AkikSystems public site handles technical and personal data.',
        updatedLabel: 'Last updated',
        updatedAt: '29 September 2026',
        updatedAtIso,
        sections: [
          {
            id: 'controller',
            title: 'Who is responsible',
            paragraphs: [
              'Amine AKIK, publishing under the AkikSystems name, is responsible for the processing described on this page.',
            ],
          },
          {
            id: 'public-browsing',
            title: 'Public browsing',
            paragraphs: [
              'The public site does not use advertising trackers, audience-measurement scripts, third-party social widgets, user accounts, or a private administration.',
              'The application creates request and correlation identifiers and records limited technical events such as the requested path, HTTP method, response status, and processing duration. Infrastructure providers may also process connection data, including IP addresses, to deliver and secure the service.',
            ],
          },
          {
            id: 'no-application-database',
            title: 'No application database',
            paragraphs: [
              'The current public application is code-only. Published page content is stored in the repository and deployed with the application. AkikSystems does not use an application database to store editorial content, visitor profiles, submissions, or administration sessions.',
            ],
          },
          {
            id: 'contact',
            title: 'Contact data',
            paragraphs: [
              'The website does not currently provide a server-side contact form. If a future page introduces a mechanism that collects personal data, this policy will be updated before that collection is enabled.',
            ],
          },
          {
            id: 'hosting',
            title: 'Hosting and recipients',
            paragraphs: [
              'The application runs on a self-managed virtual private server provided in France by OVHcloud (OVH SAS). Technical data is limited to what is required to deliver, secure, observe, and troubleshoot the public service. AkikSystems does not sell personal data and does not disclose it to advertisers.',
              'Nginx access logs are rotated daily and kept for about fourteen days. The application container logs are rotated and limited to three files of ten megabytes; how long they are kept therefore depends on traffic volume.',
            ],
          },
          {
            id: 'rights',
            title: 'Your rights',
            paragraphs: [
              'Where the GDPR applies, you may request access, correction, deletion, restriction, portability, or object to processing, depending on the legal basis and circumstances. You may also lodge a complaint with the competent supervisory authority; in France, this is the CNIL.',
            ],
          },
        ],
      },
      fr: {
        eyebrow: 'Protection des données',
        title: 'Politique de confidentialité',
        description:
          'Comment le site public AkikSystems, désormais code-only, traite les données techniques et personnelles.',
        updatedLabel: 'Dernière mise à jour',
        updatedAt: '29 septembre 2026',
        updatedAtIso,
        sections: [
          {
            id: 'responsable',
            title: 'Responsable du traitement',
            paragraphs: [
              'Amine AKIK, qui publie sous le nom AkikSystems, est responsable des traitements décrits sur cette page.',
            ],
          },
          {
            id: 'navigation-publique',
            title: 'Navigation publique',
            paragraphs: [
              'Le site public n’utilise ni traceur publicitaire, ni outil de mesure d’audience, ni widget social tiers, ni compte utilisateur, ni administration privée.',
              'L’application crée des identifiants de requête et de corrélation et journalise des événements techniques limités : chemin demandé, méthode HTTP, statut de réponse et durée de traitement. Les prestataires d’infrastructure peuvent également traiter des données de connexion, notamment l’adresse IP, afin d’acheminer et de sécuriser le service.',
            ],
          },
          {
            id: 'aucune-base-applicative',
            title: 'Aucune base de données applicative',
            paragraphs: [
              'L’application publique actuelle est code-only. Les contenus publiés sont stockés dans le dépôt et déployés avec l’application. AkikSystems n’utilise pas de base de données applicative pour stocker des contenus éditoriaux, des profils visiteurs, des soumissions ou des sessions d’administration.',
            ],
          },
          {
            id: 'contact',
            title: 'Données de contact',
            paragraphs: [
              'Le site ne fournit actuellement aucun formulaire de contact traité côté serveur. Si une future page introduit un mécanisme collectant des données personnelles, la présente politique sera mise à jour avant son activation.',
            ],
          },
          {
            id: 'hebergement',
            title: 'Hébergement et destinataires',
            paragraphs: [
              'L’application fonctionne sur un serveur privé virtuel autogéré, fourni en France par OVHcloud (OVH SAS). Les données techniques sont limitées à ce qui est nécessaire pour fournir, sécuriser, observer et dépanner le service public. AkikSystems ne vend aucune donnée personnelle et ne la communique pas à des annonceurs.',
              'Les journaux d’accès Nginx sont soumis à une rotation quotidienne et conservés pendant environ quatorze jours. Les journaux applicatifs du conteneur sont soumis à une rotation limitée à trois fichiers de dix mégaoctets ; leur durée de conservation varie selon le volume d’activité.',
            ],
          },
          {
            id: 'droits',
            title: 'Vos droits',
            paragraphs: [
              'Lorsque le RGPD s’applique, vous pouvez demander l’accès, la rectification, l’effacement, la limitation, la portabilité ou vous opposer au traitement, selon sa base juridique et les circonstances. Vous pouvez également saisir l’autorité de contrôle compétente ; en France, il s’agit de la CNIL.',
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
          'Publisher, hosting, responsibility, and intellectual-property information for AkikSystems.',
        updatedLabel: 'Last updated',
        updatedAt: '30 September 2026',
        updatedAtIso: legalNoticeUpdatedAtIso,
        sections: [
          {
            id: 'publisher',
            title: 'Publisher',
            paragraphs: [
              'This website is published by Mohamed Amine Akik, sole trader (entrepreneur individuel, EI), trading as AkikSystems. The publication director is Mohamed Amine Akik.',
            ],
            items: [
              'Registered with the Poitiers Trade and Companies Register (RCS) under number 106 993 181',
              'Business address: 10 rue de Madame, 86100 Châtellerault, France',
              'Email: contact@akiksystems.com',
              'Phone: +33 6 68 53 98 71',
            ],
          },
          {
            id: 'hosting',
            title: 'Hosting',
            paragraphs: [
              'The application runs on a self-managed virtual private server provided in France by OVHcloud (OVH SAS), 2 rue Kellermann, 59100 Roubaix, France. Phone: +33 9 72 10 10 07. Website: ovhcloud.com.',
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
            id: 'responsibility',
            title: 'Responsibility',
            paragraphs: [
              'Reasonable care is taken to keep published information accurate and the service available. Information may nevertheless become incomplete or outdated, and uninterrupted availability cannot be guaranteed.',
            ],
          },
          {
            id: 'law',
            title: 'Applicable law',
            paragraphs: [
              'This website and this notice are governed by French law, subject to any mandatory rules that apply to the visitor.',
            ],
          },
        ],
      },
      fr: {
        eyebrow: 'Informations sur l’éditeur',
        title: 'Mentions légales',
        description:
          'Informations relatives à l’éditeur, à l’hébergement, à la responsabilité et à la propriété intellectuelle d’AkikSystems.',
        updatedLabel: 'Dernière mise à jour',
        updatedAt: '30 septembre 2026',
        updatedAtIso: legalNoticeUpdatedAtIso,
        sections: [
          {
            id: 'editeur',
            title: 'Éditeur',
            paragraphs: [
              'Ce site est édité par Mohamed Amine Akik, entrepreneur individuel (EI), sous le nom commercial AkikSystems. Le directeur de la publication est Mohamed Amine Akik.',
            ],
            items: [
              'Immatriculé au RCS de Poitiers sous le numéro 106 993 181',
              'Adresse de l’établissement : 10 rue de Madame, 86100 Châtellerault, France',
              'E-mail : contact@akiksystems.com',
              'Téléphone : 06 68 53 98 71',
            ],
          },
          {
            id: 'hebergement',
            title: 'Hébergement',
            paragraphs: [
              'L’application fonctionne sur un serveur privé virtuel autogéré, fourni en France par OVHcloud (OVH SAS), 2 rue Kellermann, 59100 Roubaix, France. Téléphone : 09 72 10 10 07. Site : ovhcloud.com.',
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
            id: 'responsabilite',
            title: 'Responsabilité',
            paragraphs: [
              'Un soin raisonnable est apporté à l’exactitude des informations publiées et à la disponibilité du service. Certaines informations peuvent néanmoins devenir incomplètes ou obsolètes et une disponibilité ininterrompue ne peut être garantie.',
            ],
          },
          {
            id: 'droit',
            title: 'Droit applicable',
            paragraphs: [
              'Le site et les présentes mentions sont soumis au droit français, sous réserve des règles impératives applicables au visiteur.',
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
        description: 'Current cookie and browser-storage policy for the public AkikSystems site.',
        updatedLabel: 'Last updated',
        updatedAt: '29 September 2026',
        updatedAtIso,
        sections: [
          {
            id: 'public-pages',
            title: 'Public pages',
            paragraphs: [
              'AkikSystems does not currently set advertising, audience-measurement, personalisation, social-network, authentication, or administration cookies on public pages.',
              'The locale is expressed in the URL rather than stored in a cookie. Essential navigation does not require persistent browser storage.',
            ],
          },
          {
            id: 'consent',
            title: 'Consent',
            paragraphs: [
              'No consent banner is shown because the current application does not use optional cookies or comparable tracking technologies.',
            ],
          },
          {
            id: 'future-changes',
            title: 'Future changes',
            paragraphs: [
              'If optional cookies or comparable technologies are introduced later, this page will be updated and an appropriate consent mechanism will be provided before activation where consent is required.',
            ],
          },
        ],
      },
      fr: {
        eyebrow: 'Stockage dans le navigateur',
        title: 'Politique relative aux cookies',
        description:
          'Politique actuelle relative aux cookies et au stockage navigateur du site public AkikSystems.',
        updatedLabel: 'Dernière mise à jour',
        updatedAt: '29 septembre 2026',
        updatedAtIso,
        sections: [
          {
            id: 'pages-publiques',
            title: 'Pages publiques',
            paragraphs: [
              'AkikSystems ne dépose actuellement aucun cookie publicitaire, de mesure d’audience, de personnalisation, de réseau social, d’authentification ou d’administration sur les pages publiques.',
              'La langue est exprimée dans l’URL et non stockée dans un cookie. La navigation essentielle ne nécessite aucun stockage persistant dans le navigateur.',
            ],
          },
          {
            id: 'consentement',
            title: 'Consentement',
            paragraphs: [
              'Aucun bandeau de consentement n’est affiché puisque l’application actuelle n’utilise aucun cookie facultatif ni technologie de suivi comparable.',
            ],
          },
          {
            id: 'evolutions',
            title: 'Évolutions futures',
            paragraphs: [
              'Si des cookies facultatifs ou des technologies comparables sont ajoutés ultérieurement, cette page sera mise à jour et un mécanisme de consentement adapté sera présenté avant leur activation lorsque le consentement est requis.',
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
