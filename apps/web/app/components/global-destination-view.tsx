import type { PublishedCommercialPage, PublicSystemReference } from '@akiksystems/db';
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

export function GlobalDestinationView({
  destinationId,
  locale,
  systemReferences = [],
  commercialContent = null,
}: GlobalDestinationViewProps) {
  const destination = destinationById(destinationId);

  return (
    <main className="aks-proof-page">
      <Container>
        <div className="aks-proof-stack">
          <Text size="sm" tone="muted">
            AkikSystems
          </Text>
          <Heading level={1} size="md">
            {commercialContent?.title ?? destination.label[locale]}
          </Heading>
          <Text size="lg" tone="muted">
            {commercialContent?.introduction ?? destination.description[locale]}
          </Text>
          {destinationId === 'work-with-us' && commercialContent !== null ? (
            <>
              {commercialContent.situationsTitle !== null ||
              commercialContent.situationsBody !== null ? (
                <section className="aks-admin-card">
                  <div className="aks-proof-stack">
                    {commercialContent.situationsTitle === null ? null : (
                      <Heading level={2} size="sm">
                        {commercialContent.situationsTitle}
                      </Heading>
                    )}
                    {commercialContent.situationsBody === null ? null : (
                      <Text>{commercialContent.situationsBody}</Text>
                    )}
                  </div>
                </section>
              ) : null}
              {commercialContent.capabilitiesTitle !== null ||
              commercialContent.capabilitiesBody !== null ? (
                <section className="aks-admin-card">
                  <div className="aks-proof-stack">
                    {commercialContent.capabilitiesTitle === null ? null : (
                      <Heading level={2} size="sm">
                        {commercialContent.capabilitiesTitle}
                      </Heading>
                    )}
                    {commercialContent.capabilitiesBody === null ? null : (
                      <Text>{commercialContent.capabilitiesBody}</Text>
                    )}
                  </div>
                </section>
              ) : null}
              {commercialContent.collaborationTitle !== null ||
              commercialContent.collaborationBody !== null ? (
                <section className="aks-admin-card">
                  <div className="aks-proof-stack">
                    {commercialContent.collaborationTitle === null ? null : (
                      <Heading level={2} size="sm">
                        {commercialContent.collaborationTitle}
                      </Heading>
                    )}
                    {commercialContent.collaborationBody === null ? null : (
                      <Text>{commercialContent.collaborationBody}</Text>
                    )}
                  </div>
                </section>
              ) : null}
              {commercialContent.inquiryTitle !== null ||
              commercialContent.inquiryBody !== null ? (
                <section className="aks-admin-card">
                  <div className="aks-proof-stack">
                    {commercialContent.inquiryTitle === null ? null : (
                      <Heading level={2} size="sm">
                        {commercialContent.inquiryTitle}
                      </Heading>
                    )}
                    {commercialContent.inquiryBody === null ? null : (
                      <Text>{commercialContent.inquiryBody}</Text>
                    )}
                  </div>
                </section>
              ) : null}
              {commercialContent.privacyNote === null ? null : (
                <Text data-commercial-privacy-note size="sm" tone="muted">
                  {commercialContent.privacyNote}
                </Text>
              )}
            </>
          ) : null}
          {systemReferences.length > 0 ? (
            <section
              aria-labelledby={`${destinationId}-system-references`}
              className="aks-related-system-references"
            >
              <div className="aks-profile-section-heading">
                <Heading
                  id={`${destinationId}-system-references`}
                  level={2}
                  size="sm"
                >
                  {locale === 'fr' ? 'Systèmes liés' : 'Related Systems'}
                </Heading>
                <Text size="sm" tone="muted">
                  {locale === 'fr'
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
