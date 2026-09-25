import type {
  PublishedWorkWithUsPage,
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
  commercialContent?: PublishedWorkWithUsPage | null;
}

function hasCopy(...values: Array<string | null>): boolean {
  return values.some((value) => value !== null);
}

export function GlobalDestinationView({
  destinationId,
  locale,
  systemReferences = [],
  commercialContent = null,
}: GlobalDestinationViewProps) {
  const destination = destinationById(destinationId);
  const approach = commercialContent?.approach;
  const contact = commercialContent?.contact;
  const about = commercialContent?.about;
  const systems = commercialContent?.systems;

  return (
    <main className="aks-proof-page">
      <Container>
        <div className="aks-proof-stack">
          <Text size="sm" tone="muted">
            AkikSystems
          </Text>
          <Heading level={1} size="md">
            {commercialContent?.hero.title ?? destination.label[locale]}
          </Heading>
          <Text size="lg" tone="muted">
            {commercialContent?.hero.introduction ??
              destination.description[locale]}
          </Text>

          {approach !== undefined &&
          hasCopy(
            approach.eyebrow,
            approach.title,
            approach.introduction,
            ...approach.steps.flatMap((step) => [step.title, step.body]),
          ) ? (
            <section className="aks-admin-card">
              <div className="aks-proof-stack">
                {approach.eyebrow === null ? null : (
                  <Text size="sm" tone="muted">
                    {approach.eyebrow}
                  </Text>
                )}
                {approach.title === null ? null : (
                  <Heading level={2} size="sm">
                    {approach.title}
                  </Heading>
                )}
                {approach.introduction === null ? null : (
                  <Text>{approach.introduction}</Text>
                )}
                <div className="aks-system-reference-grid">
                  {approach.steps.map((step) =>
                    hasCopy(step.title, step.body) ? (
                      <article className="aks-admin-card" key={step.key}>
                        <div className="aks-proof-stack">
                          {step.title === null ? null : (
                            <Heading level={3} size="sm">
                              {step.title}
                            </Heading>
                          )}
                          {step.body === null ? null : <Text>{step.body}</Text>}
                        </div>
                      </article>
                    ) : null,
                  )}
                </div>
              </div>
            </section>
          ) : null}

          {contact !== undefined &&
          hasCopy(
            contact.eyebrow,
            contact.title,
            contact.introduction,
            contact.privacyNote,
          ) ? (
            <section className="aks-admin-card">
              <div className="aks-proof-stack">
                {contact.eyebrow === null ? null : (
                  <Text size="sm" tone="muted">
                    {contact.eyebrow}
                  </Text>
                )}
                {contact.title === null ? null : (
                  <Heading level={2} size="sm">
                    {contact.title}
                  </Heading>
                )}
                {contact.introduction === null ? null : (
                  <Text>{contact.introduction}</Text>
                )}
                {contact.privacyNote === null ? null : (
                  <Text size="sm" tone="muted">
                    {contact.privacyNote}
                  </Text>
                )}
              </div>
            </section>
          ) : null}

          {about !== undefined &&
          hasCopy(about.eyebrow, about.title, about.body) ? (
            <section className="aks-admin-card">
              <div className="aks-proof-stack">
                {about.eyebrow === null ? null : (
                  <Text size="sm" tone="muted">
                    {about.eyebrow}
                  </Text>
                )}
                {about.title === null ? null : (
                  <Heading level={2} size="sm">
                    {about.title}
                  </Heading>
                )}
                {about.body === null ? null : <Text>{about.body}</Text>}
              </div>
            </section>
          ) : null}

          {systems !== undefined &&
          systems.title !== null &&
          systemReferences.length > 0 ? (
            <section
              aria-labelledby={destinationId + '-system-references'}
              className="aks-related-system-references"
            >
              <div className="aks-profile-section-heading">
                {systems.eyebrow === null ? null : (
                  <Text size="sm" tone="muted">
                    {systems.eyebrow}
                  </Text>
                )}
                <Heading
                  id={destinationId + '-system-references'}
                  level={2}
                  size="sm"
                >
                  {systems.title}
                </Heading>
                {systems.introduction === null ? null : (
                  <Text size="sm" tone="muted">
                    {systems.introduction}
                  </Text>
                )}
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
