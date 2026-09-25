import type {
  CommercialPageLegacyCompatibility,
  PublishedCommercialPage,
  PublicSystemReference,
} from '@akiksystems/db';
import { Container, Heading, Text } from '@akiksystems/ui';

import {
  destinationById,
  type GlobalDestinationId,
} from '../i18n/global-destinations';
import type { Locale } from '../i18n/locales';
import { SystemReference } from './system-reference';

export interface GlobalDestinationViewProps {
  destinationId: GlobalDestinationId;
  locale: Locale;
  systemReferences?: PublicSystemReference[];
  commercialContent?: PublishedCommercialPage | null;
}

function commercialHero(content: PublishedCommercialPage) {
  return content.version === 2
    ? {
        title: content.hero.title,
        introduction: content.hero.introduction,
      }
    : {
        title: content.title,
        introduction: content.introduction,
      };
}

function legacyCompatibility(
  content: PublishedCommercialPage,
): CommercialPageLegacyCompatibility {
  return content.version === 2
    ? content.legacy
    : {
        situationsTitle: content.situationsTitle,
        situationsBody: content.situationsBody,
        capabilitiesTitle: content.capabilitiesTitle,
        capabilitiesBody: content.capabilitiesBody,
        collaborationTitle: content.collaborationTitle,
        collaborationBody: content.collaborationBody,
        inquiryTitle: content.inquiryTitle,
        inquiryBody: content.inquiryBody,
        privacyNote: content.privacyNote,
      };
}

export function GlobalDestinationView({
  destinationId,
  locale,
  systemReferences = [],
  commercialContent = null,
}: GlobalDestinationViewProps) {
  const destination = destinationById(destinationId);
  const hero =
    commercialContent === null ? null : commercialHero(commercialContent);
  const legacyContent =
    commercialContent === null
      ? null
      : legacyCompatibility(commercialContent);

  return (
    <main className="aks-proof-page">
      <Container>
        <div className="aks-proof-stack">
          <Text size="sm" tone="muted">
            AkikSystems
          </Text>
          <Heading level={1} size="md">
            {hero?.title ?? destination.label[locale]}
          </Heading>
          <Text size="lg" tone="muted">
            {hero?.introduction ?? destination.description[locale]}
          </Text>
          {destinationId === 'work-with-us' && legacyContent !== null ? (
            <>
              {legacyContent.situationsTitle !== null ||
              legacyContent.situationsBody !== null ? (
                <section className="aks-admin-card">
                  <div className="aks-proof-stack">
                    {legacyContent.situationsTitle === null ? null : (
                      <Heading level={2} size="sm">
                        {legacyContent.situationsTitle}
                      </Heading>
                    )}
                    {legacyContent.situationsBody === null ? null : (
                      <Text>{legacyContent.situationsBody}</Text>
                    )}
                  </div>
                </section>
              ) : null}
              {legacyContent.capabilitiesTitle !== null ||
              legacyContent.capabilitiesBody !== null ? (
                <section className="aks-admin-card">
                  <div className="aks-proof-stack">
                    {legacyContent.capabilitiesTitle === null ? null : (
                      <Heading level={2} size="sm">
                        {legacyContent.capabilitiesTitle}
                      </Heading>
                    )}
                    {legacyContent.capabilitiesBody === null ? null : (
                      <Text>{legacyContent.capabilitiesBody}</Text>
                    )}
                  </div>
                </section>
              ) : null}
              {legacyContent.collaborationTitle !== null ||
              legacyContent.collaborationBody !== null ? (
                <section className="aks-admin-card">
                  <div className="aks-proof-stack">
                    {legacyContent.collaborationTitle === null ? null : (
                      <Heading level={2} size="sm">
                        {legacyContent.collaborationTitle}
                      </Heading>
                    )}
                    {legacyContent.collaborationBody === null ? null : (
                      <Text>{legacyContent.collaborationBody}</Text>
                    )}
                  </div>
                </section>
              ) : null}
              {legacyContent.inquiryTitle !== null ||
              legacyContent.inquiryBody !== null ? (
                <section className="aks-admin-card">
                  <div className="aks-proof-stack">
                    {legacyContent.inquiryTitle === null ? null : (
                      <Heading level={2} size="sm">
                        {legacyContent.inquiryTitle}
                      </Heading>
                    )}
                    {legacyContent.inquiryBody === null ? null : (
                      <Text>{legacyContent.inquiryBody}</Text>
                    )}
                  </div>
                </section>
              ) : null}
              {legacyContent.privacyNote === null ? null : (
                <Text data-commercial-privacy-note size="sm" tone="muted">
                  {legacyContent.privacyNote}
                </Text>
              )}
            </>
          ) : null}
          {systemReferences.length > 0 ? (
            <section
              aria-labelledby={`${destinationId}-system-references`}
              className="aks-related-system-references"
              data-work-with-us-proof={
                destinationId === 'work-with-us' ? '' : undefined
              }
            >
              <div className="aks-profile-section-heading">
                <Heading
                  id={`${destinationId}-system-references`}
                  level={2}
                  size="sm"
                >
                  {destinationId === 'work-with-us'
                    ? locale === 'fr'
                      ? 'Preuves sélectionnées'
                      : 'Selected proof'
                    : locale === 'fr'
                      ? 'Systèmes liés'
                      : 'Related Systems'}
                </Heading>
                <Text size="sm" tone="muted">
                  {destinationId === 'work-with-us'
                    ? locale === 'fr'
                      ? 'Une sélection volontairement courte de Systems publiés. Chaque carte renvoie vers le System complet, son périmètre et ses limites.'
                      : 'A deliberately short selection of published Systems. Each card links to the complete System, its scope, and its limits.'
                    : locale === 'fr'
                      ? 'Références publiées réutilisant le même contrat de preuve.'
                      : 'Published references using the same evidence contract.'}
                </Text>
              </div>
              <div className="aks-system-reference-grid">
                {systemReferences.map((reference) => (
                  <SystemReference key={reference.id} reference={reference} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </Container>
    </main>
  );
}
