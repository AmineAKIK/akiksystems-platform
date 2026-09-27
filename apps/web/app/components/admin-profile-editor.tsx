import {
  profileCapabilityStepKeys,
  profileCrossCuttingKeys,
  profileEmblemSymbolKeys,
  profileGuidanceKeys,
  profileSystemicScaleProcessKeys,
  profileSystemicScaleStepKeys,
} from '@akiksystems/core/profile-content';
import type { DraftProfile, PublicProfile } from '@akiksystems/db';
import { BrandMark, Button, Container, Link, Text } from '@akiksystems/ui';
import { useState } from 'react';
import { Form } from 'react-router';

import { destinationHref } from '../i18n/global-destinations';
import { ProfileIcon, type ProfileIconName } from './profile-icons';

interface ProfileAdminActionData {
  ok?: boolean;
  message?: string;
}

interface ProfileAdminPublication {
  locale: 'en' | 'fr';
  publishedAt: string;
  updatedAt: string;
}

export interface ProfileAdminEditorProps {
  locale: 'en' | 'fr';
  profile: DraftProfile;
  preview: PublicProfile;
  publications: ProfileAdminPublication[];
  actionData?: ProfileAdminActionData | null;
}

const localizedFormId = 'admin-profile-localized-form';

const guidanceIcons: Record<
  (typeof profileGuidanceKeys)[number],
  ProfileIconName
> = {
  code: 'code',
  management: 'management',
  field: 'field',
  infrastructure: 'infrastructure',
};

const capabilityIcons: Record<
  (typeof profileCapabilityStepKeys)[number],
  ProfileIconName
> = {
  frame: 'frame',
  design: 'design',
  validate: 'validate',
  develop: 'code',
  test_secure: 'test',
  deploy: 'deploy',
  operate: 'operate',
  evolve: 'evolve',
};

const crossCuttingIcons: Record<
  (typeof profileCrossCuttingKeys)[number],
  ProfileIconName
> = {
  project_management: 'management',
  collaboration: 'collaboration',
  documentation: 'documentation',
  transparency: 'transparency',
};

const systemicIcons: Record<
  (typeof profileSystemicScaleStepKeys)[number],
  ProfileIconName
> = {
  read_request: 'frame',
  widen_view: 'system',
  act_right_place: 'deploy',
  verify_effect: 'check',
};

const stackIcons: ProfileIconName[] = [
  'code',
  'infrastructure',
  'data',
  'system',
  'quality',
  'deploy',
];

function stackIconAt(index: number): ProfileIconName {
  return stackIcons[index % stackIcons.length] ?? 'system';
}

function InlineInput({
  className = '',
  defaultValue,
  label,
  name,
  placeholder,
}: {
  className?: string;
  defaultValue: string | null | undefined;
  label: string;
  name: string;
  placeholder?: string;
}) {
  return (
    <input
      aria-label={label}
      className={'aks-admin-profile-inline ' + className}
      defaultValue={defaultValue ?? ''}
      form={localizedFormId}
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
  defaultValue: string | null | undefined;
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  rows?: number;
}) {
  return (
    <textarea
      aria-label={label}
      className={'aks-admin-profile-inline ' + className}
      defaultValue={defaultValue ?? ''}
      form={localizedFormId}
      name={name}
      placeholder={placeholder}
      required={required}
      rows={rows}
    />
  );
}

function LinesTextarea({
  defaultValue,
  label,
  name,
  placeholder,
}: {
  defaultValue: string[];
  label: string;
  name: string;
  placeholder?: string;
}) {
  return (
    <InlineTextarea
      className="aks-admin-profile-lines-editor"
      defaultValue={defaultValue.join('\n')}
      label={label}
      name={name}
      placeholder={placeholder}
      rows={Math.max(2, defaultValue.length)}
    />
  );
}

function LockedBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="aks-admin-profile-locked-badge">
      <span aria-hidden="true">◇</span>
      <span>{children}</span>
    </span>
  );
}

export function ProfileAdminEditor({
  locale,
  profile,
  preview,
  publications,
  actionData,
}: ProfileAdminEditorProps) {
  const content = profile.content;
  const publication = publications.find((candidate) => candidate.locale === locale);
  const [activeStackId, setActiveStackId] = useState(
    preview.stackGroups[0]?.id ?? null,
  );
  const [activeGuidance, setActiveGuidance] = useState(
    profileGuidanceKeys[0],
  );
  const [activeCapability, setActiveCapability] = useState(
    profileCapabilityStepKeys[0],
  );
  const [activeSystemic, setActiveSystemic] = useState(
    profileSystemicScaleStepKeys[0],
  );
  const publicHref = locale === 'fr' ? '/fr/profil' : '/en/profile';
  const localeLabel = locale === 'fr' ? 'Français' : 'English';

  return (
    <>
      <Form
        className="aks-admin-profile-toolbar"
        id={localizedFormId}
        method="post"
      >
        <input name="locale" type="hidden" value={locale} />
        <Container width="wide">
          <div className="aks-admin-profile-toolbar-inner">
            <div className="aks-admin-profile-toolbar-context">
              <span className="aks-admin-profile-toolbar-kicker">
                Live Profile editor
              </span>
              <nav
                aria-label="Profile locale"
                className="aks-admin-profile-locale-tabs"
              >
                <Link
                  className="aks-admin-profile-locale-tab"
                  data-active={locale === 'en' || undefined}
                  href="/admin/profile?locale=en"
                >
                  EN
                </Link>
                <Link
                  className="aks-admin-profile-locale-tab"
                  data-active={locale === 'fr' || undefined}
                  href="/admin/profile?locale=fr"
                >
                  FR
                </Link>
              </nav>
              <span className="aks-admin-profile-toolbar-status">
                {localeLabel} · {profile.editorialState} ·{' '}
                {publication === undefined ? 'no public snapshot' : 'published'}
              </span>
            </div>

            <div className="aks-admin-profile-toolbar-actions">
              {publication === undefined ? null : (
                <Link href={publicHref}>Open public Profile</Link>
              )}
              <Button
                emphasis="quiet"
                name="_intent"
                type="submit"
                value={'save-profile-localization:' + locale}
              >
                Save {locale.toUpperCase()} draft
              </Button>
              <Button
                name="_intent"
                type="submit"
                value={'publish-profile-localization:' + locale}
              >
                Publish {locale.toUpperCase()}
              </Button>
            </div>
          </div>
        </Container>
      </Form>

      {actionData?.message ? (
        <Container width="wide">
          <Text
            className="aks-admin-profile-feedback"
            role={actionData.ok === false ? 'alert' : 'status'}
            size="sm"
            tone={actionData.ok === false ? 'muted' : 'strong'}
          >
            {actionData.message}
          </Text>
        </Container>
      ) : null}

      <div
        className="aks-profile aks-admin-profile-canvas"
        data-admin-locale={locale}
        data-profile-admin-contract="v1"
      >
        <section
          aria-labelledby="admin-profile-title"
          className="aks-profile-hero aks-section-separator-after"
        >
          <Container width="wide">
            <div className="aks-profile-hero-grid">
              <div className="aks-profile-identity">
                <p className="aks-profile-eyebrow">
                  <InlineInput
                    defaultValue={content.hero.eyebrow}
                    label="Hero eyebrow"
                    name="heroEyebrow"
                    placeholder="Profile"
                  />
                </p>

                <div className="aks-profile-identity-heading">
                  {profile.portraitAssetId === null ? (
                    <span className="aks-profile-portrait aks-profile-portrait-placeholder">
                      <ProfileIcon
                        aria-hidden="true"
                        height="34"
                        name="field"
                        width="34"
                      />
                    </span>
                  ) : (
                    <img
                      alt={profile.portraitAltText ?? ''}
                      className="aks-profile-portrait"
                      height={320}
                      src={'/admin/profile/assets/' + profile.portraitAssetId}
                      width={320}
                    />
                  )}
                  <div className="aks-admin-profile-global-locked">
                    <h1 className="aks-profile-name" id="admin-profile-title">
                      {profile.displayName?.trim() || 'Display name'}
                    </h1>
                    <LockedBadge>Global identity · edit below</LockedBadge>
                  </div>
                </div>

                <div className="aks-profile-introduction">
                  <p className="aks-profile-professional-title">
                    <InlineInput
                      className="aks-admin-profile-title-editor"
                      defaultValue={content.hero.professionalTitle}
                      label="Professional title"
                      name="heroProfessionalTitle"
                      placeholder="Professional title"
                    />
                    <span>
                      {' · '}
                      <InlineInput
                        className="aks-admin-profile-specialization-editor"
                        defaultValue={content.hero.specialization}
                        label="Specialization"
                        name="heroSpecialization"
                        placeholder="Specialization"
                      />
                    </span>
                  </p>
                  <InlineTextarea
                    className="aks-profile-body-copy aks-admin-profile-copy-editor"
                    defaultValue={content.hero.introduction}
                    label="Hero introduction"
                    name="heroIntroduction"
                    placeholder="Introduction"
                    required
                    rows={4}
                  />
                </div>

                <div className="aks-profile-contact-area">
                  <div className="aks-profile-contacts">
                    {profile.contacts
                      .filter((contact) => contact.visible)
                      .map((contact) => (
                        <span className="aks-profile-contact" key={contact.kind}>
                          <span className="aks-profile-contact-icon">
                            <ProfileIcon
                              aria-hidden="true"
                              height="18"
                              name={
                                contact.kind === 'linkedin'
                                  ? 'linkedin'
                                  : contact.kind === 'github'
                                    ? 'github'
                                    : contact.kind === 'email'
                                      ? 'email'
                                      : 'phone'
                              }
                              width="18"
                            />
                          </span>
                          <span>{contact.kind}</span>
                        </span>
                      ))}
                  </div>

                  {profile.sourceCvAssetId === null ? null : (
                    <span className="aks-profile-pill aks-profile-cv-link">
                      <ProfileIcon
                        aria-hidden="true"
                        height="16"
                        name="documentation"
                        width="16"
                      />
                      <InlineInput
                        className="aks-admin-profile-pill-editor"
                        defaultValue={content.hero.cvLabel}
                        label="CV link label"
                        name="heroCvLabel"
                        placeholder="Download CV"
                      />
                    </span>
                  )}
                </div>

                <div className="aks-profile-facts">
                  <div className="aks-profile-fact">
                    <span className="aks-profile-micro-label">Languages</span>
                    <span>{profile.languages.join(' · ') || 'None selected'}</span>
                  </div>
                  <div className="aks-profile-fact">
                    <span className="aks-profile-micro-label">Mobility</span>
                    <span>
                      {[
                        profile.mobility.worldwide ? 'Worldwide' : null,
                        profile.mobility.remote ? 'Remote' : null,
                        profile.mobility.relocation ? 'Relocation' : null,
                      ]
                        .filter(Boolean)
                        .join(' · ') || 'None selected'}
                    </span>
                  </div>
                </div>
              </div>

              {preview.currentProject === null ? (
                <article className="aks-profile-current-project aks-admin-profile-empty-relation">
                  <LockedBadge>Canonical System · edit below</LockedBadge>
                  <h2>Current project not available in this locale</h2>
                  <p className="aks-profile-body-copy">
                    Select a published System in the structural controls.
                  </p>
                </article>
              ) : (
                <article className="aks-profile-current-project">
                  <div className="aks-profile-current-project-topline">
                    <div className="aks-profile-live-label">
                      <span aria-hidden="true" className="aks-profile-live-dot" />
                      <InlineInput
                        className="aks-admin-profile-eyebrow-editor"
                        defaultValue={content.currentProject.eyebrow}
                        label="Current project eyebrow"
                        name="currentProjectEyebrow"
                        placeholder="Current project"
                      />
                    </div>
                    <LockedBadge>System-owned</LockedBadge>
                  </div>

                  <div className="aks-profile-current-project-title">
                    <span className="aks-profile-project-glyph">
                      <ProfileIcon
                        aria-hidden="true"
                        height="28"
                        name="system"
                        width="28"
                      />
                    </span>
                    <h2>{preview.currentProject.title}</h2>
                  </div>

                  <p className="aks-profile-body-copy">
                    {preview.currentProject.summary}
                  </p>

                  <div className="aks-profile-current-project-block">
                    <span className="aks-profile-micro-label">
                      <InlineInput
                        defaultValue={content.currentProject.roleLabel}
                        label="Current project role label"
                        name="currentProjectRoleLabel"
                        placeholder="My role"
                      />
                    </span>
                    <InlineInput
                      className="aks-admin-profile-strong-editor"
                      defaultValue={content.currentProject.role}
                      label="Current project role"
                      name="currentProjectRole"
                      placeholder="Role"
                    />
                  </div>

                  <div className="aks-profile-current-project-block">
                    <span className="aks-profile-micro-label">Project stack</span>
                    <ul className="aks-profile-project-technologies">
                      {preview.currentProject.technologies.map(
                        (technology, index) => (
                          <li key={technology.id}>
                            <span className="aks-profile-small-glyph">
                              <ProfileIcon
                                aria-hidden="true"
                                height="15"
                                name={stackIconAt(index)}
                                width="15"
                              />
                            </span>
                            <span>{technology.name}</span>
                          </li>
                        ),
                      )}
                    </ul>
                  </div>

                  <div className="aks-admin-profile-current-project-labels">
                    <InlineInput
                      defaultValue={content.currentProject.ctaLabel}
                      label="Current project CTA label"
                      name="currentProjectCtaLabel"
                      placeholder="Inspect system"
                    />
                    <InlineInput
                      defaultValue={content.currentProject.updatedLabel}
                      label="Current project updated label"
                      name="currentProjectUpdatedLabel"
                      placeholder="Updated"
                    />
                  </div>
                </article>
              )}
            </div>
          </Container>
        </section>

        {preview.stackGroups.length > 0 ? (
          <section className="aks-profile-stack aks-section-separator-after">
            <Container width="wide">
              <div className="aks-profile-stack-grid">
                <div className="aks-profile-section-heading aks-profile-stack-heading">
                  <p className="aks-profile-eyebrow">
                    <InlineInput
                      defaultValue={content.stack.eyebrow}
                      label="Stack eyebrow"
                      name="stackEyebrow"
                      placeholder="Stack"
                    />
                  </p>
                  <h2>
                    <InlineTextarea
                      className="aks-admin-profile-section-title-editor"
                      defaultValue={content.stack.title}
                      label="Stack title"
                      name="stackTitle"
                      placeholder="Stack title"
                      rows={2}
                    />
                  </h2>
                  <InlineTextarea
                    className="aks-profile-body-copy aks-admin-profile-copy-editor"
                    defaultValue={content.stack.introduction}
                    label="Stack introduction"
                    name="stackIntroduction"
                    placeholder="Stack introduction"
                    rows={3}
                  />
                  <div className="aks-admin-profile-label-row">
                    <InlineInput
                      defaultValue={content.stack.proofCountLabel}
                      label="Stack proof count label"
                      name="stackProofCountLabel"
                      placeholder="Proved in"
                    />
                    <InlineInput
                      defaultValue={content.stack.inspectSystemLabel}
                      label="Inspect System label"
                      name="stackInspectSystemLabel"
                      placeholder="Inspect system"
                    />
                  </div>
                </div>

                <div className="aks-profile-stack-list">
                  {preview.stackGroups.map((group, index) => {
                    const active = activeStackId === group.id;
                    return (
                      <div
                        className="aks-profile-stack-item"
                        data-active={active || undefined}
                        key={group.id}
                      >
                        <button
                          aria-expanded={active}
                          className="aks-profile-stack-trigger"
                          onClick={() =>
                            setActiveStackId(active ? null : group.id)
                          }
                          type="button"
                        >
                          <span className="aks-profile-stack-icon">
                            <ProfileIcon
                              aria-hidden="true"
                              height="20"
                              name={stackIconAt(index)}
                              width="20"
                            />
                          </span>
                          <span className="aks-profile-stack-trigger-copy">
                            <span className="aks-profile-stack-name">
                              {group.technologies
                                .map((technology) => technology.name)
                                .join(' · ') || 'Empty group'}
                            </span>
                            <span className="aks-profile-stack-category">
                              {group.title || 'Untitled'}
                            </span>
                          </span>
                        </button>

                        <div
                          className="aks-profile-stack-panel"
                          hidden={!active}
                        >
                          <InlineInput
                            className="aks-admin-profile-stack-title-editor"
                            defaultValue={group.title}
                            label="Stack group localized title"
                            name={'stackGroupTitle:' + group.id}
                            placeholder="Group title"
                          />

                          <p className="aks-profile-proof-count">
                            {group.proofCount} published proof System(s)
                          </p>
                          {group.proofSystems.map((system) => (
                            <article
                              className="aks-profile-proof-system"
                              key={system.id}
                            >
                              <span
                                aria-hidden="true"
                                className="aks-profile-proof-initial"
                              >
                                {system.title.charAt(0).toUpperCase()}
                              </span>
                              <div className="aks-profile-proof-copy">
                                <div className="aks-profile-proof-heading">
                                  <h3>{system.title}</h3>
                                  <span>{system.summary}</span>
                                </div>
                                <div className="aks-profile-proof-technologies">
                                  {system.technologies.map((technology) => (
                                    <p key={technology.id}>
                                      <strong>{technology.name}</strong>
                                      <span>{technology.evidence}</span>
                                    </p>
                                  ))}
                                </div>
                                <LockedBadge>System ↔ Technology evidence</LockedBadge>
                              </div>
                            </article>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Container>
          </section>
        ) : null}

        <section className="aks-profile-guidance aks-section-separator-after">
          <Container width="wide">
            <div className="aks-profile-guidance-intro">
              <p className="aks-profile-eyebrow">
                <InlineInput
                  defaultValue={content.guidance.eyebrow}
                  label="Guidance eyebrow"
                  name="guidanceEyebrow"
                  placeholder="What guides my work"
                />
              </p>
              <h2>
                <InlineTextarea
                  className="aks-admin-profile-section-title-editor aks-admin-profile-centered-editor"
                  defaultValue={content.guidance.title}
                  label="Guidance title"
                  name="guidanceTitle"
                  placeholder="Guidance title"
                  rows={2}
                />
              </h2>
              <InlineTextarea
                className="aks-profile-body-copy aks-admin-profile-copy-editor aks-admin-profile-centered-editor"
                defaultValue={content.guidance.introduction}
                label="Guidance introduction"
                name="guidanceIntroduction"
                placeholder="Guidance introduction"
                rows={3}
              />
            </div>

            <div className="aks-profile-guidance-experience">
              <div className="aks-profile-guidance-map">
                <div className="aks-profile-guidance-center">
                  <ProfileIcon
                    aria-hidden="true"
                    height="30"
                    name="system"
                    width="30"
                  />
                  <InlineInput
                    className="aks-admin-profile-center-label-editor"
                    defaultValue={content.guidance.centerLabel}
                    label="Guidance center label"
                    name="guidanceCenterLabel"
                    placeholder="Systemic view"
                  />
                </div>

                {profileGuidanceKeys.map((key) => (
                  <button
                    aria-pressed={activeGuidance === key}
                    className="aks-profile-guidance-node"
                    data-guidance-key={key}
                    key={key}
                    onClick={() => setActiveGuidance(key)}
                    type="button"
                  >
                    <span className="aks-profile-guidance-node-icon">
                      <ProfileIcon
                        aria-hidden="true"
                        height="24"
                        name={guidanceIcons[key]}
                        width="24"
                      />
                    </span>
                    <span>{content.guidance.looks[key].title || key}</span>
                  </button>
                ))}
              </div>

              <div className="aks-admin-profile-guidance-panels">
                {profileGuidanceKeys.map((key) => {
                  const look = content.guidance.looks[key];
                  return (
                    <div
                      className="aks-profile-guidance-detail"
                      hidden={activeGuidance !== key}
                      key={key}
                    >
                      <div className="aks-profile-guidance-detail-heading">
                        <span className="aks-profile-guidance-detail-icon">
                          <ProfileIcon
                            aria-hidden="true"
                            height="24"
                            name={guidanceIcons[key]}
                            width="24"
                          />
                        </span>
                        <div>
                          <InlineInput
                            className="aks-admin-profile-detail-title-editor"
                            defaultValue={look.title}
                            label={key + ' look title'}
                            name={'guidance_' + key + '_title'}
                            placeholder="Perspective title"
                          />
                          <InlineTextarea
                            className="aks-admin-profile-copy-editor"
                            defaultValue={look.description}
                            label={key + ' look description'}
                            name={'guidance_' + key + '_description'}
                            placeholder="Description"
                            rows={3}
                          />
                        </div>
                      </div>

                      <div className="aks-profile-guidance-metric">
                        <InlineInput
                          defaultValue={look.metricValue}
                          label={key + ' metric value'}
                          name={'guidance_' + key + '_metricValue'}
                          placeholder="Metric"
                        />
                        <InlineInput
                          defaultValue={look.metricLabel}
                          label={key + ' metric label'}
                          name={'guidance_' + key + '_metricLabel'}
                          placeholder="Metric label"
                        />
                        <InlineInput
                          defaultValue={look.source}
                          label={key + ' source'}
                          name={'guidance_' + key + '_source'}
                          placeholder="Source"
                        />
                      </div>

                      <div className="aks-profile-guidance-fact">
                        <InlineInput
                          defaultValue={content.guidance.benefitLabel}
                          label="Benefit label"
                          name="guidanceBenefitLabel"
                          placeholder="What it brings"
                        />
                        <InlineTextarea
                          defaultValue={look.benefit}
                          label={key + ' benefit'}
                          name={'guidance_' + key + '_benefit'}
                          placeholder="Benefit"
                          rows={2}
                        />
                      </div>

                      <div className="aks-profile-guidance-fact">
                        <InlineInput
                          defaultValue={content.guidance.avoidanceLabel}
                          label="Avoidance label"
                          name="guidanceAvoidanceLabel"
                          placeholder="What it avoids"
                        />
                        <InlineTextarea
                          defaultValue={look.avoidance}
                          label={key + ' avoidance'}
                          name={'guidance_' + key + '_avoidance'}
                          placeholder="Avoidance"
                          rows={2}
                        />
                      </div>

                      <div className="aks-profile-guidance-fact">
                        <InlineInput
                          defaultValue={content.guidance.questionsLabel}
                          label="Questions label"
                          name="guidanceQuestionsLabel"
                          placeholder="Questions"
                        />
                        <LinesTextarea
                          defaultValue={look.questions}
                          label={key + ' questions'}
                          name={'guidance_' + key + '_questions'}
                          placeholder="One question per line"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <InlineTextarea
              className="aks-profile-guidance-conclusion aks-admin-profile-centered-editor"
              defaultValue={content.guidance.conclusion}
              label="Guidance conclusion"
              name="guidanceConclusion"
              placeholder="Guidance conclusion"
              rows={2}
            />
          </Container>
        </section>

        <section className="aks-profile-capabilities aks-section-separator-after">
          <Container width="wide">
            <div className="aks-profile-section-heading">
              <p className="aks-profile-eyebrow">
                <InlineInput
                  defaultValue={content.capabilities.eyebrow}
                  label="Capabilities eyebrow"
                  name="capabilitiesEyebrow"
                  placeholder="Capabilities"
                />
              </p>
              <h2>
                <InlineTextarea
                  className="aks-admin-profile-section-title-editor"
                  defaultValue={content.capabilities.title}
                  label="Capabilities title"
                  name="capabilitiesTitle"
                  placeholder="Capabilities title"
                  rows={2}
                />
              </h2>
              <InlineTextarea
                className="aks-profile-body-copy aks-admin-profile-copy-editor"
                defaultValue={content.capabilities.introduction}
                label="Capabilities introduction"
                name="capabilitiesIntroduction"
                placeholder="Capabilities introduction"
                rows={3}
              />
            </div>

            <div className="aks-admin-profile-label-row">
              <InlineInput
                defaultValue={content.capabilities.beforeCodingLabel}
                label="Before coding group label"
                name="capabilitiesBeforeCodingLabel"
                placeholder="Before coding"
              />
              <InlineInput
                defaultValue={content.capabilities.buildDeliverLabel}
                label="Build and deliver group label"
                name="capabilitiesBuildDeliverLabel"
                placeholder="Build and deliver"
              />
              <InlineInput
                defaultValue={content.capabilities.runLiveLabel}
                label="Run and evolve group label"
                name="capabilitiesRunLiveLabel"
                placeholder="Run and evolve"
              />
            </div>

            <div className="aks-profile-capability-cycle">
              <div className="aks-profile-capability-tabs" role="tablist">
                {profileCapabilityStepKeys.map((key) => (
                  <button
                    aria-selected={activeCapability === key}
                    className="aks-profile-capability-tab"
                    key={key}
                    onClick={() => setActiveCapability(key)}
                    role="tab"
                    type="button"
                  >
                    <span className="aks-profile-capability-icon">
                      <ProfileIcon
                        aria-hidden="true"
                        height="20"
                        name={capabilityIcons[key]}
                        width="20"
                      />
                    </span>
                    <span>{content.capabilities.steps[key].title || key}</span>
                  </button>
                ))}
              </div>

              {profileCapabilityStepKeys.map((key) => {
                const step = content.capabilities.steps[key];
                return (
                  <div
                    className="aks-profile-capability-panel"
                    hidden={activeCapability !== key}
                    key={key}
                    role="tabpanel"
                  >
                    <div className="aks-profile-capability-purpose">
                      <InlineInput
                        className="aks-admin-profile-detail-title-editor"
                        defaultValue={step.title}
                        label={key + ' capability title'}
                        name={'capability_' + key + '_title'}
                        placeholder="Capability title"
                      />
                      <InlineTextarea
                        defaultValue={step.purpose}
                        label={key + ' purpose'}
                        name={'capability_' + key + '_purpose'}
                        placeholder="Purpose"
                        rows={3}
                      />
                    </div>
                    <div className="aks-profile-capability-actions">
                      <LinesTextarea
                        defaultValue={step.actions}
                        label={key + ' actions'}
                        name={'capability_' + key + '_actions'}
                        placeholder="One action per line"
                      />
                    </div>
                    <div className="aks-profile-capability-deliverable">
                      <InlineInput
                        defaultValue={content.capabilities.deliverableLabel}
                        label="Deliverable label"
                        name="capabilitiesDeliverableLabel"
                        placeholder="What you receive"
                      />
                      <InlineTextarea
                        defaultValue={step.deliverable}
                        label={key + ' deliverable'}
                        name={'capability_' + key + '_deliverable'}
                        placeholder="Deliverable"
                        rows={2}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="aks-profile-cross-cutting">
              <p className="aks-profile-eyebrow">
                <InlineInput
                  defaultValue={content.capabilities.crossCuttingLabel}
                  label="Cross-cutting label"
                  name="capabilitiesCrossCuttingLabel"
                  placeholder="Throughout the project"
                />
              </p>
              <div className="aks-profile-cross-cutting-grid">
                {profileCrossCuttingKeys.map((key) => {
                  const capability = content.capabilities.crossCutting[key];
                  return (
                    <article key={key}>
                      <span className="aks-profile-cross-cutting-icon">
                        <ProfileIcon
                          aria-hidden="true"
                          height="18"
                          name={crossCuttingIcons[key]}
                          width="18"
                        />
                      </span>
                      <div>
                        <InlineInput
                          defaultValue={capability.title}
                          label={key + ' cross-cutting title'}
                          name={'crossCutting_' + key + '_title'}
                          placeholder="Title"
                        />
                        <InlineTextarea
                          defaultValue={capability.description}
                          label={key + ' cross-cutting description'}
                          name={'crossCutting_' + key + '_description'}
                          placeholder="Description"
                          rows={3}
                        />
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </Container>
        </section>

        <section className="aks-profile-systemic-scale aks-section-separator-after">
          <Container width="wide">
            <div className="aks-profile-systemic-intro">
              <p className="aks-profile-eyebrow">
                <InlineInput
                  defaultValue={content.systemicScale.eyebrow}
                  label="Systemic Scale eyebrow"
                  name="systemicEyebrow"
                  placeholder="The meaning of the slogan"
                />
              </p>
              <h2>
                <InlineInput
                  className="aks-admin-profile-systemic-title-editor"
                  defaultValue={content.systemicScale.title}
                  label="Systemic Scale title"
                  name="systemicTitle"
                  placeholder="Systemic Scale"
                />
              </h2>
              <p className="aks-profile-systemic-statement">
                <InlineInput
                  defaultValue={content.systemicScale.statementPrimary}
                  label="Systemic Scale first statement"
                  name="systemicStatementPrimary"
                  placeholder="Intervene on one part."
                />
                <br />
                <span>
                  <InlineInput
                    defaultValue={content.systemicScale.statementSecondary}
                    label="Systemic Scale second statement"
                    name="systemicStatementSecondary"
                    placeholder="Evaluate across a wider boundary."
                  />
                </span>
              </p>
              <InlineTextarea
                className="aks-profile-body-copy aks-admin-profile-copy-editor"
                defaultValue={content.systemicScale.introduction}
                label="Systemic Scale introduction"
                name="systemicIntroduction"
                placeholder="Introduction"
                rows={3}
              />
              <div className="aks-admin-profile-systemic-writing">
                {preview.systemicScaleWriting === null ? (
                  <LockedBadge>Writing unavailable · edit below</LockedBadge>
                ) : (
                  <LockedBadge>
                    Writing · {preview.systemicScaleWriting.title}
                  </LockedBadge>
                )}
                <InlineInput
                  defaultValue={content.systemicScale.reasoningLinkLabel}
                  label="Systemic Scale Writing link label"
                  name="systemicReasoningLinkLabel"
                  placeholder="Read the full reasoning"
                />
              </div>
            </div>

            <div className="aks-profile-systemic-method">
              <div className="aks-profile-systemic-tabs" role="tablist">
                {profileSystemicScaleStepKeys.map((key) => (
                  <button
                    aria-selected={activeSystemic === key}
                    className="aks-profile-systemic-tab"
                    key={key}
                    onClick={() => setActiveSystemic(key)}
                    role="tab"
                    type="button"
                  >
                    <span className="aks-profile-systemic-tab-icon">
                      <ProfileIcon
                        aria-hidden="true"
                        height="20"
                        name={systemicIcons[key]}
                        width="20"
                      />
                    </span>
                    <span>{content.systemicScale.steps[key].title || key}</span>
                  </button>
                ))}
              </div>

              {profileSystemicScaleStepKeys.map((key) => {
                const step = content.systemicScale.steps[key];
                return (
                  <div
                    className="aks-profile-systemic-panel"
                    hidden={activeSystemic !== key}
                    key={key}
                    role="tabpanel"
                  >
                    <div className="aks-profile-systemic-copy">
                      <InlineInput
                        className="aks-admin-profile-detail-title-editor"
                        defaultValue={step.title}
                        label={key + ' Systemic Scale title'}
                        name={'systemic_' + key + '_title'}
                        placeholder="Step title"
                      />
                      <InlineTextarea
                        defaultValue={step.principle}
                        label={key + ' principle'}
                        name={'systemic_' + key + '_principle'}
                        placeholder="Principle"
                        rows={3}
                      />
                      <div className="aks-profile-systemic-example">
                        <InlineInput
                          defaultValue={content.systemicScale.exampleLabel}
                          label="Systemic Scale example label"
                          name="systemicExampleLabel"
                          placeholder="In the example"
                        />
                        <InlineTextarea
                          defaultValue={step.example}
                          label={key + ' example'}
                          name={'systemic_' + key + '_example'}
                          placeholder="Example"
                          rows={3}
                        />
                      </div>
                    </div>

                    <div className="aks-profile-systemic-diagram">
                      <InlineInput
                        defaultValue={step.diagramLeadLabel}
                        label={key + ' diagram lead label'}
                        name={'systemic_' + key + '_diagramLeadLabel'}
                        placeholder="Diagram lead"
                      />
                      <InlineInput
                        defaultValue={step.diagramAlt}
                        label={key + ' diagram alternative text'}
                        name={'systemic_' + key + '_diagramAlt'}
                        placeholder="Diagram alternative text"
                      />
                      <div className="aks-admin-profile-process-labels">
                        {profileSystemicScaleProcessKeys.map((processKey) => (
                          <InlineInput
                            defaultValue={
                              content.systemicScale.processLabels[processKey]
                            }
                            key={processKey}
                            label={processKey + ' process label'}
                            name={'systemicProcess_' + processKey}
                            placeholder={processKey}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="aks-profile-systemic-question">
                      <InlineInput
                        defaultValue={content.systemicScale.questionLabel}
                        label="Systemic Scale question label"
                        name="systemicQuestionLabel"
                        placeholder="The question to ask"
                      />
                      <InlineTextarea
                        defaultValue={step.question}
                        label={key + ' question'}
                        name={'systemic_' + key + '_question'}
                        placeholder="Question"
                        rows={2}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="aks-profile-emblem">
              <div className="aks-profile-emblem-heading">
                <p className="aks-profile-eyebrow">
                  <InlineInput
                    defaultValue={content.emblem.eyebrow}
                    label="Emblem eyebrow"
                    name="emblemEyebrow"
                    placeholder="AkikSystems emblem"
                  />
                </p>
                <h3>
                  <InlineInput
                    className="aks-admin-profile-detail-title-editor aks-admin-profile-centered-editor"
                    defaultValue={content.emblem.title}
                    label="Emblem title"
                    name="emblemTitle"
                    placeholder="What the emblem says"
                  />
                </h3>
                <InlineTextarea
                  className="aks-profile-body-copy aks-admin-profile-copy-editor aks-admin-profile-centered-editor"
                  defaultValue={content.emblem.introduction}
                  label="Emblem introduction"
                  name="emblemIntroduction"
                  placeholder="Introduction"
                  rows={2}
                />
              </div>

              <div className="aks-profile-emblem-map">
                <BrandMark
                  className="aks-profile-emblem-mark"
                  title="AkikSystems emblem"
                />
                {profileEmblemSymbolKeys.map((key) => {
                  const symbol = content.emblem.symbols[key];
                  return (
                    <article
                      className="aks-profile-emblem-callout"
                      data-emblem-symbol={key}
                      key={key}
                    >
                      <InlineInput
                        defaultValue={symbol.name}
                        label={key + ' emblem symbol name'}
                        name={'emblem_' + key + '_name'}
                        placeholder="Symbol"
                      />
                      <InlineInput
                        className="aks-profile-micro-label"
                        defaultValue={symbol.concept}
                        label={key + ' emblem concept'}
                        name={'emblem_' + key + '_concept'}
                        placeholder="Concept"
                      />
                      <InlineTextarea
                        defaultValue={symbol.description}
                        label={key + ' emblem description'}
                        name={'emblem_' + key + '_description'}
                        placeholder="Meaning"
                        rows={3}
                      />
                    </article>
                  );
                })}
              </div>

              <InlineTextarea
                className="aks-profile-emblem-conclusion aks-admin-profile-centered-editor"
                defaultValue={content.emblem.conclusion}
                label="Emblem conclusion"
                name="emblemConclusion"
                placeholder="Emblem conclusion"
                rows={2}
              />
            </div>
          </Container>
        </section>

        <section className="aks-profile-cta aks-section-separator-after">
          <Container width="wide">
            <div className="aks-profile-cta-inner">
              <p className="aks-profile-eyebrow">
                <InlineInput
                  defaultValue={content.callToAction.eyebrow}
                  label="CTA eyebrow"
                  name="ctaEyebrow"
                  placeholder="Work together"
                />
              </p>
              <h2>
                <InlineTextarea
                  className="aks-admin-profile-section-title-editor aks-admin-profile-centered-editor"
                  defaultValue={content.callToAction.title}
                  label="CTA title"
                  name="ctaTitle"
                  placeholder="CTA title"
                  rows={2}
                />
              </h2>
              <InlineTextarea
                className="aks-profile-body-copy aks-admin-profile-copy-editor aks-admin-profile-centered-editor"
                defaultValue={content.callToAction.body}
                label="CTA body"
                name="ctaBody"
                placeholder="CTA body"
                rows={2}
              />
              <span className="aks-profile-pill aks-profile-cta-link">
                <InlineInput
                  className="aks-admin-profile-pill-editor"
                  defaultValue={content.callToAction.buttonLabel}
                  label="CTA button label"
                  name="ctaButtonLabel"
                  placeholder="Start a conversation"
                />
              </span>
              <LockedBadge>
                Destination · {destinationHref('work-with-us', locale)}
              </LockedBadge>
            </div>
          </Container>
        </section>
      </div>
    </>
  );
}
