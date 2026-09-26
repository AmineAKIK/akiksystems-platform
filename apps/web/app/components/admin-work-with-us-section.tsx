import { parseWorkWithUsContent } from '@akiksystems/core/work-with-us-content';
import { Button, Heading, Text } from '@akiksystems/ui';
import { Form } from 'react-router';

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
  localizations: WorkWithUsAdminLocalization[];
  publications: WorkWithUsAdminPublication[];
  actionData?: WorkWithUsAdminActionData | null;
}

function TextField({
  defaultValue,
  label,
  name,
  required = false,
}: {
  defaultValue: string | null;
  label: string;
  name: string;
  required?: boolean;
}) {
  return (
    <label className="aks-admin-work-with-us-field">
      <span>{label}</span>
      <input
        defaultValue={defaultValue ?? ''}
        name={name}
        required={required}
        type="text"
      />
    </label>
  );
}

function TextAreaField({
  defaultValue,
  label,
  name,
  required = false,
  rows = 4,
}: {
  defaultValue: string | null;
  label: string;
  name: string;
  required?: boolean;
  rows?: number;
}) {
  return (
    <label className="aks-admin-work-with-us-field aks-admin-work-with-us-field-wide">
      <span>{label}</span>
      <textarea
        defaultValue={defaultValue ?? ''}
        name={name}
        required={required}
        rows={rows}
      />
    </label>
  );
}

function EditorGroup({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="aks-admin-work-with-us-editor-group">
      <Text className="aks-admin-work-with-us-editor-group-title" tone="strong">
        {title}
      </Text>
      <div className="aks-admin-work-with-us-fields">{children}</div>
    </section>
  );
}

export function WorkWithUsAdminSection({
  localizations,
  publications,
  actionData,
}: WorkWithUsAdminSectionProps) {
  return (
    <section
      className="aks-admin-card aks-admin-work-with-us-content-card"
      id="admin-work-with-us"
    >
      <div className="aks-admin-work-with-us-content-heading">
        <div>
          <Text className="aks-admin-work-with-us-section-eyebrow" size="sm">
            Localized content
          </Text>
          <Heading level={2} size="sm">
            Editorial copy
          </Heading>
        </div>
        <Text tone="muted">
          Structure stays code-owned. Edit only the copy injected into that
          structure.
        </Text>
      </div>

      {actionData?.message ? (
        <Text
          className="aks-admin-work-with-us-feedback"
          role={actionData.ok === false ? 'alert' : 'status'}
          size="sm"
          tone={actionData.ok === false ? 'muted' : 'strong'}
        >
          {actionData.message}
        </Text>
      ) : null}

      <div className="aks-admin-work-with-us-locales">
        {(['en', 'fr'] as const).map((locale) => {
          const localized = localizations.find(
            (candidate) => candidate.locale === locale,
          );
          const content = parseWorkWithUsContent(localized?.content);
          const publication = publications.find(
            (candidate) => candidate.locale === locale,
          );

          return (
            <article
              className="aks-admin-card aks-admin-work-with-us-locale-card"
              key={locale}
            >
              <header className="aks-admin-work-with-us-locale-header">
                <div>
                  <Text className="aks-admin-work-with-us-locale-code" size="sm">
                    {locale.toUpperCase()}
                  </Text>
                  <Heading level={3} size="sm">
                    {locale === 'en' ? 'English' : 'Français'}
                  </Heading>
                </div>
                <span className="aks-admin-work-with-us-locale-status">
                  {localized?.editorial_state ?? 'not started'} ·{' '}
                  {publication === undefined ? 'no snapshot' : 'published'}
                </span>
              </header>

              <Form
                className="aks-admin-form aks-admin-work-with-us-locale-form"
                method="post"
              >
                <input
                  name="_intent"
                  type="hidden"
                  value={'save-work-with-us-localization:' + locale}
                />

                <EditorGroup title="Hero">
                  <TextField
                    defaultValue={content.hero.eyebrow}
                    label="Eyebrow"
                    name="heroEyebrow"
                  />
                  <TextField
                    defaultValue={content.hero.title}
                    label="Title"
                    name="heroTitle"
                    required
                  />
                  <TextAreaField
                    defaultValue={content.hero.introduction}
                    label="Introduction"
                    name="heroIntroduction"
                    required
                  />
                </EditorGroup>

                <EditorGroup title="Approach">
                  <TextField
                    defaultValue={content.approach.eyebrow}
                    label="Eyebrow"
                    name="approachEyebrow"
                  />
                  <TextField
                    defaultValue={content.approach.title}
                    label="Title"
                    name="approachTitle"
                  />
                  <TextAreaField
                    defaultValue={content.approach.introduction}
                    label="Introduction"
                    name="approachIntroduction"
                  />

                  <div className="aks-admin-work-with-us-steps">
                    {content.approach.steps.map((step) => (
                      <div
                        className="aks-admin-work-with-us-step"
                        key={step.key}
                      >
                        <Text
                          className="aks-admin-work-with-us-step-key"
                          size="sm"
                        >
                          {step.key}
                        </Text>
                        <TextField
                          defaultValue={step.title}
                          label="Step title"
                          name={'approach_' + step.key + '_title'}
                        />
                        <TextAreaField
                          defaultValue={step.body}
                          label="Step copy"
                          name={'approach_' + step.key + '_body'}
                        />
                      </div>
                    ))}
                  </div>
                </EditorGroup>

                <EditorGroup title="Contact">
                  <TextField
                    defaultValue={content.contact.eyebrow}
                    label="Eyebrow"
                    name="contactEyebrow"
                  />
                  <TextField
                    defaultValue={content.contact.title}
                    label="Title"
                    name="contactTitle"
                  />
                  <TextAreaField
                    defaultValue={content.contact.introduction}
                    label="Introduction"
                    name="contactIntroduction"
                  />
                  <TextField
                    defaultValue={content.contact.nameLabel}
                    label="Name field label"
                    name="contactNameLabel"
                  />
                  <TextField
                    defaultValue={content.contact.emailLabel}
                    label="Email field label"
                    name="contactEmailLabel"
                  />
                  <TextField
                    defaultValue={content.contact.organizationLabel}
                    label="Organization field label"
                    name="contactOrganizationLabel"
                  />
                  <TextField
                    defaultValue={content.contact.messageLabel}
                    label="Message field label"
                    name="contactMessageLabel"
                  />
                  <TextAreaField
                    defaultValue={content.contact.messagePlaceholder}
                    label="Message placeholder"
                    name="contactMessagePlaceholder"
                  />
                  <TextField
                    defaultValue={content.contact.listenLabel}
                    label="Listen button label"
                    name="contactListenLabel"
                  />
                  <TextField
                    defaultValue={content.contact.submitLabel}
                    label="Submit button label"
                    name="contactSubmitLabel"
                  />
                  <TextAreaField
                    defaultValue={content.contact.successMessage}
                    label="Success message"
                    name="contactSuccessMessage"
                  />
                  <TextAreaField
                    defaultValue={content.contact.privacyNote}
                    label="Privacy note"
                    name="contactPrivacyNote"
                  />
                </EditorGroup>

                <EditorGroup title="About">
                  <TextField
                    defaultValue={content.about.eyebrow}
                    label="Eyebrow"
                    name="aboutEyebrow"
                  />
                  <TextField
                    defaultValue={content.about.title}
                    label="Title"
                    name="aboutTitle"
                  />
                  <TextAreaField
                    defaultValue={content.about.body}
                    label="Body"
                    name="aboutBody"
                    rows={6}
                  />
                  <TextField
                    defaultValue={content.about.profileLinkLabel}
                    label="Profile link label"
                    name="aboutProfileLinkLabel"
                  />
                </EditorGroup>

                <EditorGroup title="Systems">
                  <TextField
                    defaultValue={content.systems.eyebrow}
                    label="Eyebrow"
                    name="systemsEyebrow"
                  />
                  <TextField
                    defaultValue={content.systems.title}
                    label="Title"
                    name="systemsTitle"
                  />
                  <TextAreaField
                    defaultValue={content.systems.introduction}
                    label="Introduction"
                    name="systemsIntroduction"
                  />
                  <TextField
                    defaultValue={content.systems.allSystemsLinkLabel}
                    label="All Systems link label"
                    name="systemsAllSystemsLinkLabel"
                  />
                </EditorGroup>

                <Button
                  className="aks-admin-work-with-us-save"
                  type="submit"
                >
                  Save {locale.toUpperCase()} draft
                </Button>
              </Form>

              <Form
                className="aks-admin-work-with-us-publish"
                method="post"
              >
                <input
                  name="_intent"
                  type="hidden"
                  value={'publish-work-with-us-localization:' + locale}
                />
                <Button
                  disabled={
                    content.hero.title === null ||
                    content.hero.introduction === null
                  }
                  emphasis="quiet"
                  type="submit"
                >
                  Publish {locale.toUpperCase()}
                </Button>
              </Form>
            </article>
          );
        })}
      </div>
    </section>
  );
}
