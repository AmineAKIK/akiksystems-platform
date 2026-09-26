import { parseWorkWithUsContent } from '@akiksystems/core/work-with-us-content';
import type { PublicSystemReference } from '@akiksystems/db';
import { Button, Container, Heading, Link, Text } from '@akiksystems/ui';
import { Form } from 'react-router';

import { destinationById } from '../i18n/global-destinations';
import {
  WorkWithUsApproachGlyph,
  WorkWithUsBrandVisual,
} from './work-with-us-visuals';
import { WorkWithUsSystemCard } from './work-with-us-view';

interface WorkWithUsAdminLocalization {
  locale: 'en' | 'fr';
  content: Record<string, unknown>;
  editorial_state: string;
}

interface WorkWithUsAdminPublication {
  locale: 'en' | 'fr';
}

interface WorkWithUsAdminActionData {
  ok?: boolean;
  message?: string;
}

export interface WorkWithUsAdminSectionProps {
  locale: 'en' | 'fr';
  localizations: WorkWithUsAdminLocalization[];
  publications: WorkWithUsAdminPublication[];
  systemReferences: PublicSystemReference[];
  actionData?: WorkWithUsAdminActionData | null;
}

function InlineInput({
  className = '',
  defaultValue,
  label,
  name,
  placeholder,
}: {
  className?: string;
  defaultValue: string | null;
  label: string;
  name: string;
  placeholder?: string;
}) {
  return (
    <input
      aria-label={label}
      className={'aks-admin-work-with-us-inline ' + className}
      defaultValue={defaultValue ?? ''}
      name={name}
      placeholder={placeholder}
      type="text"
    />
  );
}

function InlineTextarea({
  className = '',
  defaultValue,
  label,
  name,
  placeholder,
  required = false,
  rows = 1,
}: {
  className?: string;
  defaultValue: string | null;
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  rows?: number;
}) {
  return (
    <textarea
      aria-label={label}
      className={'aks-admin-work-with-us-inline ' + className}
      defaultValue={defaultValue ?? ''}
      name={name}
      placeholder={placeholder}
      required={required}
      rows={rows}
    />
  );
}

export function WorkWithUsAdminSection({
  locale,
  localizations,
  publications,
  systemReferences,
  actionData,
}: WorkWithUsAdminSectionProps) {
  const localized = localizations.find((candidate) => candidate.locale === locale);
  const publication = publications.find((candidate) => candidate.locale === locale);
  const content = parseWorkWithUsContent(localized?.content);
  const destination = destinationById('work-with-us');
  const localeLabel = locale === 'en' ? 'English' : 'Français';
  const publicHref =
    locale === 'en' ? '/en/work-with-us' : '/fr/travailler-ensemble';

  return (
    <Form
      className="aks-admin-work-with-us-inline-editor"
      id="admin-work-with-us"
      method="post"
    >
      <div className="aks-admin-work-with-us-toolbar">
        <Container width="wide">
          <div className="aks-admin-work-with-us-toolbar-inner">
            <div className="aks-admin-work-with-us-toolbar-context">
              <span className="aks-admin-work-with-us-toolbar-kicker">
                Live page editor
              </span>
              <nav
                aria-label="Work with us locale"
                className="aks-admin-work-with-us-locale-tabs"
              >
                <Link
                  className="aks-admin-work-with-us-locale-tab"
                  data-active={locale === 'en' || undefined}
                  href="/admin/work-with-us?locale=en"
                >
                  EN
                </Link>
                <Link
                  className="aks-admin-work-with-us-locale-tab"
                  data-active={locale === 'fr' || undefined}
                  href="/admin/work-with-us?locale=fr"
                >
                  FR
                </Link>
              </nav>
              <span className="aks-admin-work-with-us-toolbar-status">
                {localeLabel} · {localized?.editorial_state ?? 'not started'} ·{' '}
                {publication === undefined ? 'no public snapshot' : 'published'}
              </span>
            </div>

            <div className="aks-admin-work-with-us-toolbar-actions">
              <Link href="/admin/work-with-us/inquiries">Inquiry inbox</Link>
              <Link href={publicHref}>Open public page</Link>
              <Button
                emphasis="quiet"
                name="_intent"
                type="submit"
                value={'save-work-with-us-localization:' + locale}
              >
                Save {locale.toUpperCase()} draft
              </Button>
              <Button
                name="_intent"
                type="submit"
                value={'publish-work-with-us-localization:' + locale}
              >
                Publish {locale.toUpperCase()}
              </Button>
            </div>
          </div>
        </Container>
      </div>

      {actionData?.message ? (
        <Container width="wide">
          <Text
            className="aks-admin-work-with-us-feedback"
            role={actionData.ok === false ? 'alert' : 'status'}
            size="sm"
            tone={actionData.ok === false ? 'muted' : 'strong'}
          >
            {actionData.message}
          </Text>
        </Container>
      ) : null}

      <div
        className="aks-work-with-us aks-admin-work-with-us-canvas"
        data-admin-locale={locale}
      >
        <section className="aks-work-with-us-hero aks-section-separator-after">
          <Container width="wide">
            <div className="aks-work-with-us-hero-layout">
              <div className="aks-work-with-us-hero-copy">
                <Text
                  className="aks-work-with-us-eyebrow"
                  size="sm"
                  tone="muted"
                >
                  <InlineInput
                    className="aks-admin-work-with-us-eyebrow-editor"
                    defaultValue={content.hero.eyebrow}
                    label="Hero eyebrow"
                    name="heroEyebrow"
                    placeholder="Eyebrow"
                  />
                </Text>
                <Heading
                  className="aks-work-with-us-hero-title"
                  level={1}
                  size="lg"
                >
                  <InlineTextarea
                    className="aks-admin-work-with-us-heading-editor"
                    defaultValue={content.hero.title}
                    label="Hero title"
                    name="heroTitle"
                    placeholder={destination.label[locale]}
                    required
                  />
                </Heading>
                <Text
                  className="aks-work-with-us-hero-introduction"
                  size="lg"
                  tone="muted"
                >
                  <InlineTextarea
                    className="aks-admin-work-with-us-copy-editor"
                    defaultValue={content.hero.introduction}
                    label="Hero introduction"
                    name="heroIntroduction"
                    placeholder={destination.description[locale]}
                    required
                    rows={3}
                  />
                </Text>
              </div>
              <WorkWithUsBrandVisual />
            </div>
          </Container>
        </section>

        <section className="aks-work-with-us-approach aks-section-separator-after">
          <Container width="wide">
            <div className="aks-work-with-us-approach-heading">
              <Text
                className="aks-work-with-us-eyebrow"
                size="sm"
                tone="muted"
              >
                <InlineInput
                  className="aks-admin-work-with-us-eyebrow-editor aks-admin-work-with-us-centered-editor"
                  defaultValue={content.approach.eyebrow}
                  label="Approach eyebrow"
                  name="approachEyebrow"
                  placeholder="Eyebrow"
                />
              </Text>
              <Heading
                className="aks-work-with-us-approach-title"
                level={2}
                size="lg"
              >
                <InlineTextarea
                  className="aks-admin-work-with-us-heading-editor aks-admin-work-with-us-centered-editor"
                  defaultValue={content.approach.title}
                  label="Approach title"
                  name="approachTitle"
                  placeholder="Approach title"
                />
              </Heading>
              <Text
                className="aks-work-with-us-approach-introduction"
                tone="muted"
              >
                <InlineTextarea
                  className="aks-admin-work-with-us-copy-editor aks-admin-work-with-us-centered-editor"
                  defaultValue={content.approach.introduction}
                  label="Approach introduction"
                  name="approachIntroduction"
                  placeholder="Approach introduction"
                  rows={2}
                />
              </Text>
            </div>

            <ol className="aks-work-with-us-approach-steps">
              {content.approach.steps.map((step) => (
                <li
                  className="aks-work-with-us-approach-step"
                  data-approach-step={step.key}
                  key={step.key}
                >
                  <WorkWithUsApproachGlyph kind={step.key} />
                  <div className="aks-work-with-us-step-copy">
                    <Heading level={3} size="sm">
                      <InlineTextarea
                        className="aks-admin-work-with-us-step-title-editor aks-admin-work-with-us-centered-editor"
                        defaultValue={step.title}
                        label={step.key + ' step title'}
                        name={'approach_' + step.key + '_title'}
                        placeholder="Step title"
                      />
                    </Heading>
                    <Text size="sm" tone="muted">
                      <InlineTextarea
                        className="aks-admin-work-with-us-step-copy-editor aks-admin-work-with-us-centered-editor"
                        defaultValue={step.body}
                        label={step.key + ' step copy'}
                        name={'approach_' + step.key + '_body'}
                        placeholder="Step copy"
                        rows={3}
                      />
                    </Text>
                  </div>
                </li>
              ))}
            </ol>
          </Container>
        </section>

        <section className="aks-work-with-us-contact aks-section-separator-after">
          <Container width="wide">
            <div className="aks-work-with-us-contact-layout">
              <div className="aks-work-with-us-contact-copy">
                <Text
                  className="aks-work-with-us-eyebrow"
                  size="sm"
                  tone="muted"
                >
                  <InlineInput
                    className="aks-admin-work-with-us-eyebrow-editor"
                    defaultValue={content.contact.eyebrow}
                    label="Contact eyebrow"
                    name="contactEyebrow"
                    placeholder="Eyebrow"
                  />
                </Text>
                <Heading level={2} size="lg">
                  <InlineTextarea
                    className="aks-admin-work-with-us-heading-editor"
                    defaultValue={content.contact.title}
                    label="Contact title"
                    name="contactTitle"
                    placeholder="Contact title"
                  />
                </Heading>
                <Text
                  className="aks-work-with-us-contact-introduction"
                  tone="muted"
                >
                  <InlineTextarea
                    className="aks-admin-work-with-us-copy-editor"
                    defaultValue={content.contact.introduction}
                    label="Contact introduction"
                    name="contactIntroduction"
                    placeholder="Contact introduction"
                    rows={3}
                  />
                </Text>
                <Text
                  className="aks-work-with-us-contact-privacy"
                  size="sm"
                  tone="muted"
                >
                  <InlineTextarea
                    className="aks-admin-work-with-us-copy-editor"
                    defaultValue={content.contact.privacyNote}
                    label="Contact privacy note"
                    name="contactPrivacyNote"
                    placeholder="Privacy note"
                    rows={2}
                  />
                </Text>
              </div>

              <div className="aks-work-with-us-inquiry-form aks-admin-work-with-us-inquiry-preview">
                <div className="aks-work-with-us-inquiry-fields">
                  <label className="aks-work-with-us-inquiry-field">
                    <InlineInput
                      className="aks-admin-work-with-us-label-editor"
                      defaultValue={content.contact.nameLabel}
                      label="Name field label"
                      name="contactNameLabel"
                      placeholder="Name"
                    />
                    <span
                      aria-hidden="true"
                      className="aks-admin-work-with-us-preview-control"
                    />
                  </label>

                  <label className="aks-work-with-us-inquiry-field">
                    <InlineInput
                      className="aks-admin-work-with-us-label-editor"
                      defaultValue={content.contact.emailLabel}
                      label="Email field label"
                      name="contactEmailLabel"
                      placeholder="Email"
                    />
                    <span
                      aria-hidden="true"
                      className="aks-admin-work-with-us-preview-control"
                    />
                  </label>

                  <label className="aks-work-with-us-inquiry-field">
                    <InlineInput
                      className="aks-admin-work-with-us-label-editor"
                      defaultValue={content.contact.organizationLabel}
                      label="Organization field label"
                      name="contactOrganizationLabel"
                      placeholder="Organization"
                    />
                    <span
                      aria-hidden="true"
                      className="aks-admin-work-with-us-preview-control"
                    />
                  </label>

                  <label className="aks-work-with-us-inquiry-field aks-work-with-us-inquiry-message">
                    <InlineInput
                      className="aks-admin-work-with-us-label-editor"
                      defaultValue={content.contact.messageLabel}
                      label="Message field label"
                      name="contactMessageLabel"
                      placeholder="Message"
                    />
                    <InlineTextarea
                      className="aks-admin-work-with-us-placeholder-editor"
                      defaultValue={content.contact.messagePlaceholder}
                      label="Message placeholder"
                      name="contactMessagePlaceholder"
                      placeholder="Message placeholder"
                      rows={5}
                    />
                  </label>
                </div>

                <div className="aks-work-with-us-inquiry-actions">
                  <InlineInput
                    className="aks-admin-work-with-us-button-label-editor aks-admin-work-with-us-listen-editor"
                    defaultValue={content.contact.listenLabel}
                    label="Listen button label"
                    name="contactListenLabel"
                    placeholder="Listen button"
                  />
                  <InlineInput
                    className="aks-admin-work-with-us-button-label-editor aks-admin-work-with-us-submit-editor"
                    defaultValue={content.contact.submitLabel}
                    label="Submit button label"
                    name="contactSubmitLabel"
                    placeholder="Submit"
                  />
                </div>

                <div className="aks-work-with-us-inquiry-feedback aks-admin-work-with-us-success-preview">
                  <InlineTextarea
                    className="aks-admin-work-with-us-copy-editor"
                    defaultValue={content.contact.successMessage}
                    label="Success message"
                    name="contactSuccessMessage"
                    placeholder="Success message"
                    rows={2}
                  />
                </div>
              </div>
            </div>
          </Container>
        </section>

        <section className="aks-work-with-us-about aks-section-separator-after">
          <Container width="wide">
            <div className="aks-work-with-us-about-layout">
              <div className="aks-work-with-us-about-heading">
                <Text
                  className="aks-work-with-us-eyebrow"
                  size="sm"
                  tone="muted"
                >
                  <InlineInput
                    className="aks-admin-work-with-us-eyebrow-editor"
                    defaultValue={content.about.eyebrow}
                    label="About eyebrow"
                    name="aboutEyebrow"
                    placeholder="Eyebrow"
                  />
                </Text>
                <Heading level={2} size="md">
                  <InlineTextarea
                    className="aks-admin-work-with-us-section-title-editor"
                    defaultValue={content.about.title}
                    label="About title"
                    name="aboutTitle"
                    placeholder="About title"
                  />
                </Heading>
              </div>

              <div className="aks-work-with-us-about-body">
                <Text tone="muted">
                  <InlineTextarea
                    className="aks-admin-work-with-us-copy-editor"
                    defaultValue={content.about.body}
                    label="About body"
                    name="aboutBody"
                    placeholder="About copy"
                    rows={5}
                  />
                </Text>
              </div>

              <div className="aks-work-with-us-section-link aks-admin-work-with-us-link-editor">
                <InlineInput
                  className="aks-admin-work-with-us-link-label-editor"
                  defaultValue={content.about.profileLinkLabel}
                  label="Profile link label"
                  name="aboutProfileLinkLabel"
                  placeholder="Profile link"
                />
                <span aria-hidden="true">→</span>
              </div>
            </div>
          </Container>
        </section>

        <section className="aks-work-with-us-systems">
          <Container width="wide">
            <div className="aks-work-with-us-systems-heading">
              <div>
                <Text
                  className="aks-work-with-us-eyebrow"
                  size="sm"
                  tone="muted"
                >
                  <InlineInput
                    className="aks-admin-work-with-us-eyebrow-editor"
                    defaultValue={content.systems.eyebrow}
                    label="Systems eyebrow"
                    name="systemsEyebrow"
                    placeholder="Eyebrow"
                  />
                </Text>
                <Heading level={2} size="md">
                  <InlineTextarea
                    className="aks-admin-work-with-us-section-title-editor"
                    defaultValue={content.systems.title}
                    label="Systems title"
                    name="systemsTitle"
                    placeholder="Systems title"
                  />
                </Heading>
                <Text
                  className="aks-work-with-us-systems-introduction"
                  tone="muted"
                >
                  <InlineTextarea
                    className="aks-admin-work-with-us-copy-editor"
                    defaultValue={content.systems.introduction}
                    label="Systems introduction"
                    name="systemsIntroduction"
                    placeholder="Systems introduction"
                    rows={2}
                  />
                </Text>
              </div>
              <div className="aks-work-with-us-section-link aks-admin-work-with-us-link-editor">
                <InlineInput
                  className="aks-admin-work-with-us-link-label-editor"
                  defaultValue={content.systems.allSystemsLinkLabel}
                  label="All Systems link label"
                  name="systemsAllSystemsLinkLabel"
                  placeholder="All Systems"
                />
                <span aria-hidden="true">→</span>
              </div>
            </div>

            {systemReferences.length === 0 ? (
              <Text
                className="aks-admin-work-with-us-empty-systems"
                size="sm"
                tone="muted"
              >
                No selected System currently has a public snapshot in{' '}
                {locale.toUpperCase()}.
              </Text>
            ) : (
              <div className="aks-work-with-us-system-grid aks-admin-work-with-us-system-preview-grid">
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
      </div>
    </Form>
  );
}
