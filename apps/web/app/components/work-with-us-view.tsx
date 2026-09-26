import type {
  PublishedWorkWithUsPage,
  PublicSystemReference,
} from '@akiksystems/db';
import { Button, Container, Heading, Link, Text } from '@akiksystems/ui';
import { Form } from 'react-router';

import {
  destinationById,
  destinationHref,
} from '../i18n/global-destinations';
import type { Locale } from '../i18n/locales';
import {
  workWithUsInquiryLimits,
  type WorkWithUsInquiryActionData,
} from '../lib/work-with-us-inquiry';
import { WorkWithUsMessagePlayback } from './work-with-us-message-playback';
import {
  WorkWithUsApproachGlyph,
  WorkWithUsSpiralVisual,
} from './work-with-us-visuals';

export interface WorkWithUsViewProps {
  locale: Locale;
  content?: PublishedWorkWithUsPage | null;
  inquiryActionData?: WorkWithUsInquiryActionData;
  inquirySubmitting?: boolean;
  submissionToken?: string;
  systemReferences?: PublicSystemReference[];
}

function hasCopy(...values: Array<string | null>): boolean {
  return values.some((value) => value !== null);
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
        <div className="aks-work-with-us-system-card-copy">
          <Heading level={3} size="sm">
            {reference.title}
          </Heading>
          <Text size="sm" tone="muted">
            {reference.summary}
          </Text>
        </div>
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
  inquiryActionData,
  inquirySubmitting = false,
  submissionToken,
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

  const contactFormVisible =
    contact !== undefined &&
    submissionToken !== undefined &&
    contact.nameLabel !== null &&
    contact.emailLabel !== null &&
    contact.organizationLabel !== null &&
    contact.messageLabel !== null &&
    contact.messagePlaceholder !== null &&
    contact.submitLabel !== null &&
    contact.successMessage !== null;

  const activeSubmissionToken =
    inquiryActionData?.submissionToken ?? submissionToken;
  const inquiryValues = inquiryActionData?.values;
  const inquiryErrors = inquiryActionData?.errors;

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
        className="aks-work-with-us-hero aks-section-separator-after"
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
            <WorkWithUsSpiralVisual />
          </div>
        </Container>
      </section>

      {approachVisible && approach !== undefined ? (
        <section
          aria-labelledby={
            approach.title === null ? undefined : 'work-with-us-approach-title'
          }
          className="aks-work-with-us-approach aks-section-separator-after"
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
              {approach.steps.map((step) =>
                hasCopy(step.title, step.body) ? (
                  <li
                    className="aks-work-with-us-approach-step"
                    data-approach-step={step.key}
                    key={step.key}
                  >
                    <WorkWithUsApproachGlyph kind={step.key} />
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
          aria-labelledby={
            contact.title === null ? undefined : 'work-with-us-contact-title'
          }
          className="aks-work-with-us-contact aks-section-separator-after"
        >
          <Container width="wide">
            <div className="aks-work-with-us-contact-layout">
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

              {contactFormVisible && activeSubmissionToken !== undefined ? (
                <Form
                  aria-busy={inquirySubmitting || undefined}
                  className="aks-work-with-us-inquiry-form"
                  key={activeSubmissionToken}
                  method="post"
                  noValidate
                >
                  <input
                    name="_intent"
                    type="hidden"
                    value="submit-work-with-us-inquiry"
                  />
                  <input
                    name="submissionToken"
                    type="hidden"
                    value={activeSubmissionToken}
                  />

                  <div
                    aria-hidden="true"
                    className="aks-work-with-us-inquiry-trap"
                  >
                    <label htmlFor="work-with-us-fax-number">Fax number</label>
                    <input
                      autoComplete="off"
                      id="work-with-us-fax-number"
                      name="faxNumber"
                      tabIndex={-1}
                      type="text"
                    />
                  </div>

                  {inquiryActionData?.message === undefined ||
                  inquiryActionData.kind === 'success' ? null : (
                    <Text
                      className="aks-work-with-us-inquiry-feedback"
                      role="alert"
                      size="sm"
                    >
                      {inquiryActionData.message}
                    </Text>
                  )}

                  {inquiryActionData?.kind === 'success' ? (
                    <Text
                      className="aks-work-with-us-inquiry-feedback"
                      role="status"
                      size="sm"
                      tone="strong"
                    >
                      {contact.successMessage}
                    </Text>
                  ) : null}

                  <div className="aks-work-with-us-inquiry-fields">
                    <label className="aks-work-with-us-inquiry-field">
                      <span>{contact.nameLabel}</span>
                      <input
                        aria-describedby={
                          inquiryErrors?.name === undefined
                            ? undefined
                            : 'work-with-us-name-error'
                        }
                        aria-invalid={
                          inquiryErrors?.name === undefined ? undefined : true
                        }
                        autoComplete="name"
                        defaultValue={inquiryValues?.name ?? ''}
                        maxLength={workWithUsInquiryLimits.name}
                        name="name"
                        required
                        type="text"
                      />
                      {inquiryErrors?.name === undefined ? null : (
                        <span
                          className="aks-work-with-us-inquiry-field-error"
                          id="work-with-us-name-error"
                        >
                          {inquiryErrors.name}
                        </span>
                      )}
                    </label>

                    <label className="aks-work-with-us-inquiry-field">
                      <span>{contact.emailLabel}</span>
                      <input
                        aria-describedby={
                          inquiryErrors?.email === undefined
                            ? undefined
                            : 'work-with-us-email-error'
                        }
                        aria-invalid={
                          inquiryErrors?.email === undefined ? undefined : true
                        }
                        autoComplete="email"
                        defaultValue={inquiryValues?.email ?? ''}
                        inputMode="email"
                        maxLength={workWithUsInquiryLimits.email}
                        name="email"
                        required
                        type="email"
                      />
                      {inquiryErrors?.email === undefined ? null : (
                        <span
                          className="aks-work-with-us-inquiry-field-error"
                          id="work-with-us-email-error"
                        >
                          {inquiryErrors.email}
                        </span>
                      )}
                    </label>

                    <label className="aks-work-with-us-inquiry-field">
                      <span>{contact.organizationLabel}</span>
                      <input
                        aria-describedby={
                          inquiryErrors?.organization === undefined
                            ? undefined
                            : 'work-with-us-organization-error'
                        }
                        aria-invalid={
                          inquiryErrors?.organization === undefined
                            ? undefined
                            : true
                        }
                        autoComplete="organization"
                        defaultValue={inquiryValues?.organization ?? ''}
                        maxLength={workWithUsInquiryLimits.organization}
                        name="organization"
                        type="text"
                      />
                      {inquiryErrors?.organization === undefined ? null : (
                        <span
                          className="aks-work-with-us-inquiry-field-error"
                          id="work-with-us-organization-error"
                        >
                          {inquiryErrors.organization}
                        </span>
                      )}
                    </label>

                    <label className="aks-work-with-us-inquiry-field aks-work-with-us-inquiry-message">
                      <span>{contact.messageLabel}</span>
                      <textarea
                        aria-describedby={
                          inquiryErrors?.message === undefined
                            ? undefined
                            : 'work-with-us-message-error'
                        }
                        aria-invalid={
                          inquiryErrors?.message === undefined ? undefined : true
                        }
                        defaultValue={inquiryValues?.message ?? ''}
                        id="work-with-us-message"
                        maxLength={workWithUsInquiryLimits.message}
                        name="message"
                        placeholder={contact.messagePlaceholder ?? undefined}
                        required
                        rows={7}
                      />
                      {inquiryErrors?.message === undefined ? null : (
                        <span
                          className="aks-work-with-us-inquiry-field-error"
                          id="work-with-us-message-error"
                        >
                          {inquiryErrors.message}
                        </span>
                      )}
                    </label>
                  </div>

                  <div className="aks-work-with-us-inquiry-actions">
                    {contact.listenLabel === null ? null : (
                      <WorkWithUsMessagePlayback
                        label={contact.listenLabel}
                        locale={locale}
                        messageElementId="work-with-us-message"
                        submitting={inquirySubmitting}
                      />
                    )}
                    <Button
                      className="aks-work-with-us-inquiry-submit"
                      disabled={inquirySubmitting}
                      type="submit"
                    >
                      {contact.submitLabel}
                    </Button>
                  </div>
                </Form>
              ) : null}
            </div>
          </Container>
        </section>
      ) : null}

      {aboutVisible && about !== undefined ? (
        <section
          aria-labelledby={
            about.title === null ? undefined : 'work-with-us-about-title'
          }
          className="aks-work-with-us-about aks-section-separator-after"
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
          aria-labelledby={
            systems.title === null ? undefined : 'work-with-us-systems-title'
          }
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
