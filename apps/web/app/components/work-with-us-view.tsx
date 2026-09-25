import type {
  PublishedWorkWithUsPage,
  PublicSystemReference,
} from '@akiksystems/db';
import { Container, Heading, Link, Text } from '@akiksystems/ui';

import {
  destinationById,
  destinationHref,
} from '../i18n/global-destinations';
import type { Locale } from '../i18n/locales';

export interface WorkWithUsViewProps {
  locale: Locale;
  content?: PublishedWorkWithUsPage | null;
  systemReferences?: PublicSystemReference[];
}

function hasCopy(...values: Array<string | null>): boolean {
  return values.some((value) => value !== null);
}

function WorkWithUsOrbitalField() {
  return (
    <div aria-hidden="true" className="aks-work-with-us-orbital-field">
      <span className="aks-work-with-us-orbit aks-work-with-us-orbit-a" />
      <span className="aks-work-with-us-orbit aks-work-with-us-orbit-b" />
      <span className="aks-work-with-us-orbit aks-work-with-us-orbit-c" />
      <span className="aks-work-with-us-axis aks-work-with-us-axis-a" />
      <span className="aks-work-with-us-axis aks-work-with-us-axis-b" />
      <span className="aks-work-with-us-orbital-node aks-work-with-us-orbital-node-a" />
      <span className="aks-work-with-us-orbital-node aks-work-with-us-orbital-node-b" />
      <span className="aks-work-with-us-orbital-focus" />
    </div>
  );
}

function ApproachGlyph({
  kind,
}: {
  kind: 'understand' | 'structure' | 'build';
}) {
  return (
    <span
      aria-hidden="true"
      className="aks-work-with-us-approach-glyph"
      data-kind={kind}
    >
      <span className="aks-work-with-us-glyph-ring aks-work-with-us-glyph-ring-primary" />
      <span className="aks-work-with-us-glyph-ring aks-work-with-us-glyph-ring-secondary" />
      <span className="aks-work-with-us-glyph-node" />
    </span>
  );
}

function WorkWithUsSystemCard({
  reference,
}: {
  reference: PublicSystemReference;
}) {
  return (
    <article className="aks-work-with-us-system-card">
      <Link
        aria-label={reference.title}
        className="aks-work-with-us-system-card-link"
        href={reference.href}
      >
        <span className="aks-work-with-us-system-card-copy">
          <Heading level={3} size="sm">
            {reference.title}
          </Heading>
          <Text size="sm" tone="muted">
            {reference.summary}
          </Text>
        </span>
        <span aria-hidden="true" className="aks-work-with-us-system-card-arrow">
          ↗
        </span>
      </Link>
    </article>
  );
}

export function WorkWithUsView({
  locale,
  content = null,
  systemReferences = [],
}: WorkWithUsViewProps) {
  const destination = destinationById('work-with-us');
  const hero = content?.hero;
  const approach = content?.approach;
  const contact = content?.contact;
  const about = content?.about;
  const systems = content?.systems;

  const heroTitle = hero?.title ?? destination.label[locale];
  const heroIntroduction =
    hero?.introduction ?? destination.description[locale];

  const approachVisible =
    approach !== undefined &&
    hasCopy(
      approach.eyebrow,
      approach.title,
      approach.introduction,
      ...approach.steps.flatMap((step) => [step.title, step.body]),
    );

  const contactVisible =
    contact !== undefined &&
    hasCopy(
      contact.eyebrow,
      contact.title,
      contact.introduction,
      contact.privacyNote,
    );

  const aboutVisible =
    about !== undefined &&
    hasCopy(about.eyebrow, about.title, about.body, about.profileLinkLabel);

  const systemsVisible =
    systems !== undefined &&
    hasCopy(
      systems.eyebrow,
      systems.title,
      systems.introduction,
      systems.allSystemsLinkLabel,
    );

  return (
    <main className="aks-work-with-us">
      <section
        aria-labelledby="work-with-us-hero-title"
        className="aks-work-with-us-hero"
      >
        <Container width="wide">
          <div className="aks-work-with-us-hero-layout">
            <div className="aks-work-with-us-hero-copy">
              {hero?.eyebrow === null || hero?.eyebrow === undefined ? null : (
                <Text
                  className="aks-work-with-us-eyebrow"
                  size="sm"
                  tone="muted"
                >
                  {hero.eyebrow}
                </Text>
              )}
              <Heading
                className="aks-work-with-us-hero-title"
                id="work-with-us-hero-title"
                level={1}
                size="lg"
              >
                {heroTitle}
              </Heading>
              <Text
                className="aks-work-with-us-hero-introduction"
                size="lg"
                tone="muted"
              >
                {heroIntroduction}
              </Text>
            </div>
            <WorkWithUsOrbitalField />
          </div>
        </Container>
      </section>

      {approachVisible && approach !== undefined ? (
        <section
          aria-labelledby="work-with-us-approach-title"
          className="aks-work-with-us-approach"
        >
          <Container width="wide">
            <div className="aks-work-with-us-approach-heading">
              {approach.eyebrow === null ? null : (
                <Text
                  className="aks-work-with-us-eyebrow"
                  size="sm"
                  tone="muted"
                >
                  {approach.eyebrow}
                </Text>
              )}
              {approach.title === null ? null : (
                <Heading
                  className="aks-work-with-us-approach-title"
                  id="work-with-us-approach-title"
                  level={2}
                  size="lg"
                >
                  {approach.title}
                </Heading>
              )}
              {approach.introduction === null ? null : (
                <Text
                  className="aks-work-with-us-approach-introduction"
                  tone="muted"
                >
                  {approach.introduction}
                </Text>
              )}
            </div>

            <ol className="aks-work-with-us-approach-steps">
              {approach.steps.map((step, index) =>
                hasCopy(step.title, step.body) ? (
                  <li
                    className="aks-work-with-us-approach-step"
                    data-approach-step={step.key}
                    key={step.key}
                  >
                    <span className="aks-work-with-us-step-index">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <ApproachGlyph kind={step.key} />
                    <div className="aks-work-with-us-step-copy">
                      {step.title === null ? null : (
                        <Heading level={3} size="sm">
                          {step.title}
                        </Heading>
                      )}
                      {step.body === null ? null : (
                        <Text size="sm" tone="muted">
                          {step.body}
                        </Text>
                      )}
                    </div>
                  </li>
                ) : null,
              )}
            </ol>
          </Container>
        </section>
      ) : null}

      {contactVisible && contact !== undefined ? (
        <section
          aria-labelledby="work-with-us-contact-title"
          className="aks-work-with-us-contact"
        >
          <Container width="wide">
            <div className="aks-work-with-us-contact-copy">
              {contact.eyebrow === null ? null : (
                <Text
                  className="aks-work-with-us-eyebrow"
                  size="sm"
                  tone="muted"
                >
                  {contact.eyebrow}
                </Text>
              )}
              {contact.title === null ? null : (
                <Heading
                  id="work-with-us-contact-title"
                  level={2}
                  size="lg"
                >
                  {contact.title}
                </Heading>
              )}
              {contact.introduction === null ? null : (
                <Text
                  className="aks-work-with-us-contact-introduction"
                  tone="muted"
                >
                  {contact.introduction}
                </Text>
              )}
              {contact.privacyNote === null ? null : (
                <Text
                  className="aks-work-with-us-contact-privacy"
                  size="sm"
                  tone="muted"
                >
                  {contact.privacyNote}
                </Text>
              )}
            </div>
          </Container>
        </section>
      ) : null}

      {aboutVisible && about !== undefined ? (
        <section
          aria-labelledby="work-with-us-about-title"
          className="aks-work-with-us-about"
        >
          <Container width="wide">
            <div className="aks-work-with-us-about-layout">
              <div className="aks-work-with-us-about-heading">
                {about.eyebrow === null ? null : (
                  <Text
                    className="aks-work-with-us-eyebrow"
                    size="sm"
                    tone="muted"
                  >
                    {about.eyebrow}
                  </Text>
                )}
                {about.title === null ? null : (
                  <Heading
                    id="work-with-us-about-title"
                    level={2}
                    size="md"
                  >
                    {about.title}
                  </Heading>
                )}
              </div>
              <div className="aks-work-with-us-about-body">
                {about.body === null ? null : (
                  <Text tone="muted">{about.body}</Text>
                )}
              </div>
              {about.profileLinkLabel === null ? null : (
                <Link
                  className="aks-work-with-us-section-link"
                  href={destinationHref('profile', locale)}
                >
                  {about.profileLinkLabel}
                  <span aria-hidden="true">→</span>
                </Link>
              )}
            </div>
          </Container>
        </section>
      ) : null}

      {systemsVisible && systems !== undefined ? (
        <section
          aria-labelledby="work-with-us-systems-title"
          className="aks-work-with-us-systems"
        >
          <Container width="wide">
            <div className="aks-work-with-us-systems-heading">
              <div>
                {systems.eyebrow === null ? null : (
                  <Text
                    className="aks-work-with-us-eyebrow"
                    size="sm"
                    tone="muted"
                  >
                    {systems.eyebrow}
                  </Text>
                )}
                {systems.title === null ? null : (
                  <Heading
                    id="work-with-us-systems-title"
                    level={2}
                    size="md"
                  >
                    {systems.title}
                  </Heading>
                )}
                {systems.introduction === null ? null : (
                  <Text
                    className="aks-work-with-us-systems-introduction"
                    tone="muted"
                  >
                    {systems.introduction}
                  </Text>
                )}
              </div>
              {systems.allSystemsLinkLabel === null ? null : (
                <Link
                  className="aks-work-with-us-section-link"
                  href={destinationHref('systems', locale)}
                >
                  {systems.allSystemsLinkLabel}
                  <span aria-hidden="true">→</span>
                </Link>
              )}
            </div>

            {systemReferences.length === 0 ? null : (
              <div className="aks-work-with-us-system-grid">
                {systemReferences.map((reference) => (
                  <WorkWithUsSystemCard
                    key={reference.id}
                    reference={reference}
                  />
                ))}
              </div>
            )}
          </Container>
        </section>
      ) : null}
    </main>
  );
}
