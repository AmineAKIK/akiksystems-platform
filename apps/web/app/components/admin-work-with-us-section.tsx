import { parseWorkWithUsContent } from '@akiksystems/core';
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
  scope?: string;
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
    <label>
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
    <label>
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

export function WorkWithUsAdminSection({
  localizations,
  publications,
  actionData,
}: WorkWithUsAdminSectionProps) {
  return (
    <section className="aks-admin-card" id="admin-work-with-us">
      <div className="aks-proof-stack">
        <Text className="aks-proof-eyebrow" size="sm" tone="muted">
          L7 · Work with us
        </Text>
        <Heading level={2} size="sm">
          Localized page content
        </Heading>
        <Text tone="muted">
          Structure stays code-owned. This editor owns only the localized copy
          placed into that structure.
        </Text>

        {actionData?.scope === 'commercial' ? (
          <Text
            role={actionData.ok === false ? 'alert' : 'status'}
            size="sm"
            tone={actionData.ok === false ? 'muted' : 'strong'}
          >
            {actionData.message}
          </Text>
        ) : null}

        {(['en', 'fr'] as const).map((locale) => {
          const localized = localizations.find(
            (candidate) => candidate.locale === locale,
          );
          const content = parseWorkWithUsContent(localized?.content);
          const publication = publications.find(
            (candidate) => candidate.locale === locale,
          );

          return (
            <div className="aks-admin-card" key={locale}>
              <div className="aks-proof-stack">
                <Heading level={3} size="sm">
                  {locale === 'en' ? 'English' : 'Français'}
                </Heading>
                <Text size="sm" tone="muted">
                  {localized?.editorial_state ?? 'not started'} ·{' '}
                  {publication === undefined
                    ? 'No public snapshot'
                    : 'Public snapshot available'}
                </Text>

                <Form className="aks-admin-form" method="post">
                  <input
                    name="_intent"
                    type="hidden"
                    value={'save-commercial-localization:' + locale}
                  />

                  <Heading level={4} size="sm">Hero</Heading>
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

                  <Heading level={4} size="sm">Approach</Heading>
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
                  {content.approach.steps.map((step) => (
                    <div className="aks-proof-stack" key={step.key}>
                      <Text size="sm" tone="muted">
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

                  <Heading level={4} size="sm">Contact</Heading>
                  <TextField defaultValue={content.contact.eyebrow} label="Eyebrow" name="contactEyebrow" />
                  <TextField defaultValue={content.contact.title} label="Title" name="contactTitle" />
                  <TextAreaField defaultValue={content.contact.introduction} label="Introduction" name="contactIntroduction" />
                  <TextField defaultValue={content.contact.nameLabel} label="Name field label" name="contactNameLabel" />
                  <TextField defaultValue={content.contact.emailLabel} label="Email field label" name="contactEmailLabel" />
                  <TextField defaultValue={content.contact.organizationLabel} label="Organization field label" name="contactOrganizationLabel" />
                  <TextField defaultValue={content.contact.messageLabel} label="Message field label" name="contactMessageLabel" />
                  <TextAreaField defaultValue={content.contact.messagePlaceholder} label="Message placeholder" name="contactMessagePlaceholder" />
                  <TextField defaultValue={content.contact.listenLabel} label="Listen button label" name="contactListenLabel" />
                  <TextField defaultValue={content.contact.submitLabel} label="Submit button label" name="contactSubmitLabel" />
                  <TextAreaField defaultValue={content.contact.successMessage} label="Success message" name="contactSuccessMessage" />
                  <TextAreaField defaultValue={content.contact.privacyNote} label="Privacy note" name="contactPrivacyNote" />

                  <Heading level={4} size="sm">About</Heading>
                  <TextField defaultValue={content.about.eyebrow} label="Eyebrow" name="aboutEyebrow" />
                  <TextField defaultValue={content.about.title} label="Title" name="aboutTitle" />
                  <TextAreaField defaultValue={content.about.body} label="Body" name="aboutBody" rows={6} />
                  <TextField defaultValue={content.about.profileLinkLabel} label="Profile link label" name="aboutProfileLinkLabel" />

                  <Heading level={4} size="sm">Systems</Heading>
                  <TextField defaultValue={content.systems.eyebrow} label="Eyebrow" name="systemsEyebrow" />
                  <TextField defaultValue={content.systems.title} label="Title" name="systemsTitle" />
                  <TextAreaField defaultValue={content.systems.introduction} label="Introduction" name="systemsIntroduction" />
                  <TextField defaultValue={content.systems.allSystemsLinkLabel} label="All Systems link label" name="systemsAllSystemsLinkLabel" />

                  <Button type="submit">
                    Save {locale.toUpperCase()} draft
                  </Button>
                </Form>

                <Form method="post">
                  <input
                    name="_intent"
                    type="hidden"
                    value={'publish-commercial-localization:' + locale}
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
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
