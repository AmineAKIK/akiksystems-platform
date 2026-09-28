import {
  profileCapabilityStepKeys,
  profileCrossCuttingKeys,
  profileEmblemSymbolKeys,
  profileGuidanceKeys,
  profileSystemicScaleProcessKeys,
  profileSystemicScaleStepKeys,
} from '@akiksystems/core/profile-content';
import type { PublicProfile } from '@akiksystems/db';
import { BrandMark, Container } from '@akiksystems/ui';
import { useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';

import { destinationHref } from '../i18n/global-destinations';
import { ProfileIcon, type ProfileIconName } from './profile-icons';

interface PublicProfileViewProps {
  profile: PublicProfile;
}

const languageLabels = {
  en: { fr: 'French', en: 'English', ar: 'Arabic' },
  fr: { fr: 'Français', en: 'Anglais', ar: 'Arabe' },
} as const;

const interfaceCopy = {
  en: {
    languages: 'Languages',
    mobility: 'Mobility',
    worldwide: 'Worldwide',
    remote: 'Remote',
    relocation: 'Relocation',
    currentProject: 'Current project',
    projectStack: 'Project stack',
    updatedFallback: 'Updated',
    proofSingular: 'system',
    proofPlural: 'systems',
    noProof: 'No published proof in this locale yet.',
    whatIDo: 'What I do',
    receives: 'What you receive',
    systemicMethod: 'How I intervene',
    emblemAlt: 'AkikSystems emblem',
    cvFallback: 'Download CV',
  },
  fr: {
    languages: 'Langues',
    mobility: 'Mobilité',
    worldwide: 'International',
    remote: 'À distance',
    relocation: 'Relocalisation',
    currentProject: 'Projet en cours',
    projectStack: 'Stack du projet',
    updatedFallback: 'Mis à jour',
    proofSingular: 'système',
    proofPlural: 'systèmes',
    noProof: 'Aucune preuve publiée dans cette langue pour le moment.',
    whatIDo: 'Ce que je fais',
    receives: 'Ce que vous recevez',
    systemicMethod: 'Ma manière d’intervenir',
    emblemAlt: 'Emblème AkikSystems',
    cvFallback: 'Télécharger le CV',
  },
} as const;

const contactLabels = {
  en: {
    linkedin: 'LinkedIn',
    github: 'GitHub',
    email: 'Email',
    phone: 'Phone',
  },
  fr: {
    linkedin: 'LinkedIn',
    github: 'GitHub',
    email: 'E-mail',
    phone: 'Téléphone',
  },
} as const;

const guidanceIcons: Record<(typeof profileGuidanceKeys)[number], ProfileIconName> = {
  code: 'code',
  management: 'management',
  field: 'field',
  infrastructure: 'infrastructure',
};

const capabilityIcons: Record<(typeof profileCapabilityStepKeys)[number], ProfileIconName> = {
  frame: 'frame',
  design: 'design',
  validate: 'validate',
  develop: 'code',
  test_secure: 'test',
  deploy: 'deploy',
  operate: 'operate',
  evolve: 'evolve',
};

const crossCuttingIcons: Record<(typeof profileCrossCuttingKeys)[number], ProfileIconName> = {
  project_management: 'management',
  collaboration: 'collaboration',
  documentation: 'documentation',
  transparency: 'transparency',
};

const systemicIcons: Record<(typeof profileSystemicScaleStepKeys)[number], ProfileIconName> = {
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

function hasText(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function contactHref(kind: string, value: string): string {
  if (kind === 'email') return 'mailto:' + value;
  if (kind === 'phone') return 'tel:' + value.replace(/\s+/g, '');
  return value;
}

function contactIconName(kind: string): ProfileIconName {
  if (kind === 'linkedin') return 'linkedin';
  if (kind === 'github') return 'github';
  if (kind === 'email') return 'email';
  return 'phone';
}

function formatDate(locale: 'en' | 'fr', value: Date): string {
  return new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function tabKeyDown(
  event: ReactKeyboardEvent<HTMLButtonElement>,
  activeIndex: number,
  count: number,
  select: (index: number) => void,
) {
  let nextIndex: number | null = null;

  if (event.key === 'ArrowRight') nextIndex = (activeIndex + 1) % count;
  if (event.key === 'ArrowLeft') nextIndex = (activeIndex - 1 + count) % count;
  if (event.key === 'Home') nextIndex = 0;
  if (event.key === 'End') nextIndex = count - 1;

  if (nextIndex === null) return;

  event.preventDefault();
  select(nextIndex);
  const tabs =
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
  tabs?.[nextIndex]?.focus();
}

function proofCountLabel(profile: PublicProfile, count: number): string {
  const label = profile.content.stack.proofCountLabel.trim();
  const unit =
    count === 1
      ? interfaceCopy[profile.locale].proofSingular
      : interfaceCopy[profile.locale].proofPlural;

  if (label === '') {
    return profile.locale === 'fr'
      ? 'Prouvé dans ' + count + ' ' + unit
      : 'Proved in ' + count + ' ' + unit;
  }

  return label + ' ' + count + ' ' + unit;
}

function capabilityGroupLabel(profile: PublicProfile, index: number): string {
  if (index <= 2) return profile.content.capabilities.beforeCodingLabel;
  if (index <= 5) return profile.content.capabilities.buildDeliverLabel;
  return profile.content.capabilities.runLiveLabel;
}

function ProfilePortrait({ profile }: { profile: PublicProfile }) {
  if (profile.portraitAssetId !== null && profile.portraitAltText !== null) {
    return (
      <img
        alt={profile.portraitAltText}
        className="aks-profile-portrait"
        height={320}
        loading="eager"
        src={profile.locale === 'fr' ? '/fr/profil/portrait' : '/en/profile/portrait'}
        width={320}
      />
    );
  }

  return (
    <span
      aria-label={profile.locale === 'fr' ? 'Portrait à venir' : 'Portrait coming soon'}
      className="aks-profile-portrait aks-profile-portrait-placeholder"
      role="img"
    >
      <svg
        aria-hidden="true"
        fill="none"
        height="34"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
        viewBox="0 0 24 24"
        width="34"
      >
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </svg>
    </span>
  );
}

export function PublicProfileView({ profile }: PublicProfileViewProps) {
  const { content } = profile;
  const ui = interfaceCopy[profile.locale];
  const [activeStackId, setActiveStackId] = useState(profile.stackGroups[0]?.id ?? null);
  const [activeGuidance, setActiveGuidance] = useState<(typeof profileGuidanceKeys)[number]>(
    profileGuidanceKeys[0],
  );
  const [activeCapability, setActiveCapability] = useState<
    (typeof profileCapabilityStepKeys)[number]
  >(profileCapabilityStepKeys[0]);
  const [activeSystemicStep, setActiveSystemicStep] = useState<
    (typeof profileSystemicScaleStepKeys)[number]
  >(profileSystemicScaleStepKeys[0]);

  const guidanceVisible =
    hasText(content.guidance.eyebrow) ||
    hasText(content.guidance.title) ||
    hasText(content.guidance.introduction) ||
    profileGuidanceKeys.some((key) => {
      const look = content.guidance.looks[key];
      return hasText(look.title) || hasText(look.description);
    });

  const capabilitiesVisible =
    hasText(content.capabilities.eyebrow) ||
    hasText(content.capabilities.title) ||
    profileCapabilityStepKeys.some((key) => {
      const step = content.capabilities.steps[key];
      return hasText(step.title) || hasText(step.purpose);
    });

  const systemicScaleVisible =
    hasText(content.systemicScale.eyebrow) ||
    hasText(content.systemicScale.title) ||
    hasText(content.systemicScale.statementPrimary) ||
    hasText(content.systemicScale.introduction);

  const emblemVisible =
    hasText(content.emblem.eyebrow) ||
    hasText(content.emblem.title) ||
    profileEmblemSymbolKeys.some((key) => {
      const symbol = content.emblem.symbols[key];
      return hasText(symbol.name) || hasText(symbol.description);
    });

  const activeCapabilityIndex = profileCapabilityStepKeys.indexOf(activeCapability);
  const activeSystemicIndex = profileSystemicScaleStepKeys.indexOf(activeSystemicStep);

  const activeGuidanceContent = content.guidance.looks[activeGuidance];
  const activeCapabilityContent = content.capabilities.steps[activeCapability];
  const activeSystemicContent = content.systemicScale.steps[activeSystemicStep];

  const mobilityValues: string[] = [];
  if (profile.mobility.worldwide) mobilityValues.push(ui.worldwide);
  if (profile.mobility.remote) mobilityValues.push(ui.remote);
  if (profile.mobility.relocation) mobilityValues.push(ui.relocation);

  return (
    <main className="aks-profile" data-profile-contract="v1">
      <section
        aria-labelledby="profile-title"
        className="aks-profile-hero aks-section-separator-after"
        data-profile-section="hero"
      >
        <Container width="wide">
          <div className="aks-profile-hero-grid">
            <div className="aks-profile-identity">
              {hasText(content.hero.eyebrow) ? (
                <p className="aks-profile-eyebrow">{content.hero.eyebrow}</p>
              ) : null}

              <div className="aks-profile-identity-heading">
                <ProfilePortrait profile={profile} />
                <h1 className="aks-profile-name" id="profile-title">
                  {profile.displayName}
                </h1>
              </div>

              <div className="aks-profile-introduction">
                <p className="aks-profile-professional-title">
                  {content.hero.professionalTitle}
                  {hasText(content.hero.specialization) ? (
                    <span> · {content.hero.specialization}</span>
                  ) : null}
                </p>
                <p className="aks-profile-body-copy">{content.hero.introduction}</p>
              </div>

              {profile.contacts.length > 0 || profile.sourceCvAssetId !== null ? (
                <div className="aks-profile-contact-area">
                  <div
                    aria-label={
                      profile.locale === 'fr'
                        ? 'Coordonnées professionnelles'
                        : 'Professional contacts'
                    }
                    className="aks-profile-contacts"
                  >
                    {profile.contacts.map((contact) => (
                      <a
                        aria-label={
                          contactLabels[profile.locale][contact.kind] +
                          (contact.kind === 'email' || contact.kind === 'phone'
                            ? ': ' + contact.value
                            : '')
                        }
                        className="aks-profile-contact"
                        href={contactHref(contact.kind, contact.value)}
                        key={contact.kind}
                      >
                        <span className="aks-profile-contact-icon">
                          <ProfileIcon
                            aria-hidden="true"
                            height="18"
                            name={contactIconName(contact.kind)}
                            width="18"
                          />
                        </span>
                        <span>{contactLabels[profile.locale][contact.kind]}</span>
                      </a>
                    ))}
                  </div>

                  {profile.sourceCvAssetId !== null ? (
                    <a
                      className="aks-profile-pill aks-profile-cv-link"
                      href={profile.locale === 'fr' ? '/fr/profil/cv' : '/en/profile/cv'}
                    >
                      <ProfileIcon aria-hidden="true" height="16" name="documentation" width="16" />
                      <span>
                        {hasText(content.hero.cvLabel) ? content.hero.cvLabel : ui.cvFallback}
                      </span>
                    </a>
                  ) : null}
                </div>
              ) : null}

              {profile.languages.length > 0 || mobilityValues.length > 0 ? (
                <div className="aks-profile-facts">
                  {profile.languages.length > 0 ? (
                    <div className="aks-profile-fact">
                      <span className="aks-profile-micro-label">{ui.languages}</span>
                      <span>
                        {profile.languages
                          .map((language) => languageLabels[profile.locale][language])
                          .join(' · ')}
                      </span>
                    </div>
                  ) : null}
                  {mobilityValues.length > 0 ? (
                    <div className="aks-profile-fact">
                      <span className="aks-profile-micro-label">{ui.mobility}</span>
                      <span>{mobilityValues.join(' · ')}</span>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            {profile.currentProject !== null ? (
              <article
                aria-label={
                  hasText(content.currentProject.eyebrow)
                    ? content.currentProject.eyebrow
                    : ui.currentProject
                }
                className="aks-profile-current-project"
              >
                <div className="aks-profile-current-project-topline">
                  <div className="aks-profile-live-label">
                    <span aria-hidden="true" className="aks-profile-live-dot" />
                    <span>
                      {hasText(content.currentProject.eyebrow)
                        ? content.currentProject.eyebrow
                        : ui.currentProject}
                    </span>
                  </div>
                  <a className="aks-profile-pill" href={profile.currentProject.href}>
                    {hasText(content.currentProject.ctaLabel)
                      ? content.currentProject.ctaLabel
                      : profile.locale === 'fr'
                        ? 'Voir le système'
                        : 'Inspect system'}
                  </a>
                </div>

                <div className="aks-profile-current-project-title">
                  <span className="aks-profile-project-glyph">
                    <ProfileIcon aria-hidden="true" height="28" name="system" width="28" />
                  </span>
                  <h2>{profile.currentProject.title}</h2>
                </div>

                <p className="aks-profile-body-copy">{profile.currentProject.summary}</p>

                {hasText(content.currentProject.role) ? (
                  <div className="aks-profile-current-project-block">
                    <span className="aks-profile-micro-label">
                      {hasText(content.currentProject.roleLabel)
                        ? content.currentProject.roleLabel
                        : profile.locale === 'fr'
                          ? 'Mon rôle'
                          : 'My role'}
                    </span>
                    <strong>{content.currentProject.role}</strong>
                  </div>
                ) : null}

                {profile.currentProject.technologies.length > 0 ? (
                  <div className="aks-profile-current-project-block">
                    <span className="aks-profile-micro-label">{ui.projectStack}</span>
                    <ul className="aks-profile-project-technologies">
                      {profile.currentProject.technologies.map((technology, index) => (
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
                      ))}
                    </ul>
                  </div>
                ) : null}

                <p className="aks-profile-current-project-date">
                  {hasText(content.currentProject.updatedLabel)
                    ? content.currentProject.updatedLabel
                    : ui.updatedFallback}{' '}
                  {formatDate(profile.locale, profile.currentProject.publishedAt)}
                </p>
              </article>
            ) : null}
          </div>
        </Container>
      </section>

      {profile.stackGroups.length > 0 ? (
        <section
          aria-labelledby="profile-stack-title"
          className="aks-profile-stack aks-section-separator-after"
          data-profile-section="stack"
          id="stack"
        >
          <Container width="wide">
            <div className="aks-profile-stack-grid">
              <div className="aks-profile-section-heading aks-profile-stack-heading">
                {hasText(content.stack.eyebrow) ? (
                  <p className="aks-profile-eyebrow">{content.stack.eyebrow}</p>
                ) : null}
                <h2 id="profile-stack-title">
                  {hasText(content.stack.title) ? content.stack.title : 'Stack'}
                </h2>
                {hasText(content.stack.introduction) ? (
                  <p className="aks-profile-body-copy">{content.stack.introduction}</p>
                ) : null}
              </div>

              <div className="aks-profile-stack-list">
                {profile.stackGroups.map((group, index) => {
                  const active = group.id === activeStackId;
                  const panelId = 'profile-stack-panel-' + group.id;
                  const buttonId = 'profile-stack-button-' + group.id;
                  const stackName = group.technologies
                    .map((technology) => technology.name)
                    .join(' · ');

                  return (
                    <div
                      className="aks-profile-stack-item"
                      data-active={active || undefined}
                      key={group.id}
                    >
                      <button
                        aria-controls={panelId}
                        aria-expanded={active}
                        className="aks-profile-stack-trigger"
                        id={buttonId}
                        onClick={() => setActiveStackId(active ? null : group.id)}
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
                          <span className="aks-profile-stack-name">{stackName || group.title}</span>
                          <span className="aks-profile-stack-category">{group.title}</span>
                        </span>
                      </button>

                      {active ? (
                        <div
                          aria-labelledby={buttonId}
                          className="aks-profile-stack-panel"
                          id={panelId}
                          role="region"
                        >
                          <p className="aks-profile-proof-count">
                            {proofCountLabel(profile, group.proofCount)}
                          </p>

                          {group.proofSystems.length === 0 ? (
                            <p className="aks-profile-muted">{ui.noProof}</p>
                          ) : (
                            <div className="aks-profile-proof-list">
                              {group.proofSystems.map((system) => (
                                <article className="aks-profile-proof-system" key={system.id}>
                                  <span aria-hidden="true" className="aks-profile-proof-initial">
                                    {system.title.trim().charAt(0).toUpperCase()}
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
                                    <a className="aks-profile-pill" href={system.href}>
                                      {hasText(content.stack.inspectSystemLabel)
                                        ? content.stack.inspectSystemLabel
                                        : profile.locale === 'fr'
                                          ? 'Inspecter le système'
                                          : 'Inspect system'}
                                      <ProfileIcon
                                        aria-hidden="true"
                                        height="14"
                                        name="arrow-up-right"
                                        width="14"
                                      />
                                    </a>
                                  </div>
                                </article>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </Container>
        </section>
      ) : null}

      {guidanceVisible ? (
        <section
          aria-labelledby="profile-guidance-title"
          className="aks-profile-guidance aks-section-separator-after"
          data-profile-section="guidance"
        >
          <Container width="wide">
            <div className="aks-profile-guidance-intro">
              {hasText(content.guidance.eyebrow) ? (
                <p className="aks-profile-eyebrow">{content.guidance.eyebrow}</p>
              ) : null}
              {hasText(content.guidance.title) ? (
                <h2 id="profile-guidance-title">{content.guidance.title}</h2>
              ) : null}
              {hasText(content.guidance.introduction) ? (
                <p className="aks-profile-body-copy">{content.guidance.introduction}</p>
              ) : null}
            </div>

            <div className="aks-profile-guidance-experience">
              <div
                aria-label={
                  hasText(content.guidance.centerLabel) ? content.guidance.centerLabel : undefined
                }
                className="aks-profile-guidance-map"
                role="group"
              >
                <div className="aks-profile-guidance-center">
                  <ProfileIcon aria-hidden="true" height="30" name="system" width="30" />
                  {hasText(content.guidance.centerLabel) ? (
                    <strong>{content.guidance.centerLabel}</strong>
                  ) : null}
                </div>

                {profileGuidanceKeys.map((key) => {
                  const look = content.guidance.looks[key];
                  const active = key === activeGuidance;
                  return (
                    <button
                      aria-pressed={active}
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
                      <span>{look.title || key}</span>
                    </button>
                  );
                })}
              </div>

              <div aria-live="polite" className="aks-profile-guidance-detail" role="region">
                <div className="aks-profile-guidance-detail-heading">
                  <span className="aks-profile-guidance-detail-icon">
                    <ProfileIcon
                      aria-hidden="true"
                      height="24"
                      name={guidanceIcons[activeGuidance]}
                      width="24"
                    />
                  </span>
                  <div>
                    <h3>{activeGuidanceContent.title}</h3>
                    {hasText(activeGuidanceContent.description) ? (
                      <p>{activeGuidanceContent.description}</p>
                    ) : null}
                  </div>
                </div>

                {activeGuidanceContent.metricValue !== null ? (
                  <div className="aks-profile-guidance-metric">
                    <strong>{activeGuidanceContent.metricValue}</strong>
                    {activeGuidanceContent.metricLabel !== null ? (
                      <span>{activeGuidanceContent.metricLabel}</span>
                    ) : null}
                    {activeGuidanceContent.source !== null ? (
                      <small>{activeGuidanceContent.source}</small>
                    ) : null}
                  </div>
                ) : null}

                {hasText(activeGuidanceContent.benefit) ? (
                  <div className="aks-profile-guidance-fact">
                    <span className="aks-profile-micro-label">{content.guidance.benefitLabel}</span>
                    <p>{activeGuidanceContent.benefit}</p>
                  </div>
                ) : null}

                {hasText(activeGuidanceContent.avoidance) ? (
                  <div className="aks-profile-guidance-fact">
                    <span className="aks-profile-micro-label">
                      {content.guidance.avoidanceLabel}
                    </span>
                    <p>{activeGuidanceContent.avoidance}</p>
                  </div>
                ) : null}

                {activeGuidanceContent.questions.length > 0 ? (
                  <div className="aks-profile-guidance-fact">
                    <span className="aks-profile-micro-label">
                      {content.guidance.questionsLabel}
                    </span>
                    <ul>
                      {activeGuidanceContent.questions.map((question) => (
                        <li key={question}>{question}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </div>

            {hasText(content.guidance.conclusion) ? (
              <p className="aks-profile-guidance-conclusion">{content.guidance.conclusion}</p>
            ) : null}
          </Container>
        </section>
      ) : null}

      {capabilitiesVisible ? (
        <section
          aria-labelledby="profile-capabilities-title"
          className="aks-profile-capabilities aks-section-separator-after"
          data-profile-section="capabilities"
          id="capabilities"
        >
          <Container width="wide">
            <div className="aks-profile-section-heading">
              {hasText(content.capabilities.eyebrow) ? (
                <p className="aks-profile-eyebrow">{content.capabilities.eyebrow}</p>
              ) : null}
              {hasText(content.capabilities.title) ? (
                <h2 id="profile-capabilities-title">{content.capabilities.title}</h2>
              ) : null}
              {hasText(content.capabilities.introduction) ? (
                <p className="aks-profile-body-copy">{content.capabilities.introduction}</p>
              ) : null}
            </div>

            <div className="aks-profile-capability-cycle">
              <div aria-hidden="true" className="aks-profile-capability-group-labels">
                <span data-group="before">{content.capabilities.beforeCodingLabel}</span>
                <span data-group="build">{content.capabilities.buildDeliverLabel}</span>
                <span data-group="run">{content.capabilities.runLiveLabel}</span>
              </div>

              <div
                aria-label={profile.locale === 'fr' ? 'Étapes du cycle' : 'Cycle stages'}
                className="aks-profile-capability-tabs"
                role="tablist"
              >
                {profileCapabilityStepKeys.map((key, index) => {
                  const step = content.capabilities.steps[key];
                  const selected = activeCapability === key;
                  return (
                    <button
                      aria-controls="profile-capability-panel"
                      aria-selected={selected}
                      className="aks-profile-capability-tab"
                      id={'profile-capability-tab-' + key}
                      key={key}
                      onClick={() => setActiveCapability(key)}
                      onKeyDown={(event) =>
                        tabKeyDown(event, index, profileCapabilityStepKeys.length, (nextIndex) => {
                          const nextKey = profileCapabilityStepKeys[nextIndex];
                          if (nextKey !== undefined) {
                            setActiveCapability(nextKey);
                          }
                        })
                      }
                      role="tab"
                      tabIndex={selected ? 0 : -1}
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
                      <span>{step.title || key}</span>
                    </button>
                  );
                })}
              </div>

              <div
                aria-labelledby={'profile-capability-tab-' + activeCapability}
                className="aks-profile-capability-panel"
                id="profile-capability-panel"
                role="tabpanel"
              >
                <div className="aks-profile-capability-purpose">
                  <span className="aks-profile-micro-label">
                    {capabilityGroupLabel(profile, activeCapabilityIndex)}
                  </span>
                  <h3>{activeCapabilityContent.title}</h3>
                  {hasText(activeCapabilityContent.purpose) ? (
                    <p>{activeCapabilityContent.purpose}</p>
                  ) : null}
                </div>

                {activeCapabilityContent.actions.length > 0 ? (
                  <div className="aks-profile-capability-actions">
                    <span className="aks-profile-micro-label">{ui.whatIDo}</span>
                    <ul>
                      {activeCapabilityContent.actions.map((action) => (
                        <li key={action}>
                          <span aria-hidden="true">—</span>
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {hasText(activeCapabilityContent.deliverable) ? (
                  <div className="aks-profile-capability-deliverable">
                    <span className="aks-profile-micro-label">
                      {hasText(content.capabilities.deliverableLabel)
                        ? content.capabilities.deliverableLabel
                        : ui.receives}
                    </span>
                    <strong>{activeCapabilityContent.deliverable}</strong>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="aks-profile-cross-cutting">
              <p className="aks-profile-eyebrow">{content.capabilities.crossCuttingLabel}</p>
              <div className="aks-profile-cross-cutting-grid">
                {profileCrossCuttingKeys.map((key) => {
                  const capability = content.capabilities.crossCutting[key];
                  if (!hasText(capability.title) && !hasText(capability.description)) {
                    return null;
                  }
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
                        <h3>{capability.title}</h3>
                        <p>{capability.description}</p>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </Container>
        </section>
      ) : null}

      {systemicScaleVisible ? (
        <section
          aria-labelledby="profile-systemic-scale-title"
          className="aks-profile-systemic-scale aks-section-separator-after"
          data-profile-section="systemic-scale"
          id="systemic-scale"
        >
          <Container width="wide">
            <div className="aks-profile-systemic-intro">
              {hasText(content.systemicScale.eyebrow) ? (
                <p className="aks-profile-eyebrow">{content.systemicScale.eyebrow}</p>
              ) : null}
              {hasText(content.systemicScale.title) ? (
                <h2 id="profile-systemic-scale-title">{content.systemicScale.title}</h2>
              ) : null}
              {hasText(content.systemicScale.statementPrimary) ||
              hasText(content.systemicScale.statementSecondary) ? (
                <p className="aks-profile-systemic-statement">
                  {content.systemicScale.statementPrimary}
                  {hasText(content.systemicScale.statementSecondary) ? (
                    <>
                      <br />
                      <span>{content.systemicScale.statementSecondary}</span>
                    </>
                  ) : null}
                </p>
              ) : null}
              {hasText(content.systemicScale.introduction) ? (
                <p className="aks-profile-body-copy">{content.systemicScale.introduction}</p>
              ) : null}
              {profile.systemicScaleWriting !== null ? (
                <a
                  className="aks-profile-pill aks-profile-systemic-writing-link"
                  href={profile.systemicScaleWriting.href}
                >
                  {hasText(content.systemicScale.reasoningLinkLabel)
                    ? content.systemicScale.reasoningLinkLabel
                    : profile.systemicScaleWriting.title}
                  <ProfileIcon aria-hidden="true" height="14" name="arrow-up-right" width="14" />
                </a>
              ) : null}
            </div>

            <div className="aks-profile-systemic-method">
              <div className="aks-profile-systemic-method-heading">
                <span className="aks-profile-micro-label">{ui.systemicMethod}</span>
              </div>

              <div className="aks-profile-systemic-tabs-wrap">
                <div
                  aria-label={profile.locale === 'fr' ? 'Les quatre temps' : 'The four stages'}
                  className="aks-profile-systemic-tabs"
                  role="tablist"
                >
                  {profileSystemicScaleStepKeys.map((key, index) => {
                    const step = content.systemicScale.steps[key];
                    const selected = activeSystemicStep === key;
                    return (
                      <button
                        aria-controls="profile-systemic-panel"
                        aria-selected={selected}
                        className="aks-profile-systemic-tab"
                        id={'profile-systemic-tab-' + key}
                        key={key}
                        onClick={() => setActiveSystemicStep(key)}
                        onKeyDown={(event) =>
                          tabKeyDown(
                            event,
                            index,
                            profileSystemicScaleStepKeys.length,
                            (nextIndex) => {
                              const nextKey = profileSystemicScaleStepKeys[nextIndex];
                              if (nextKey !== undefined) {
                                setActiveSystemicStep(nextKey);
                              }
                            },
                          )
                        }
                        role="tab"
                        tabIndex={selected ? 0 : -1}
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
                        <span>{step.title || key}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div
                aria-labelledby={'profile-systemic-tab-' + activeSystemicStep}
                className="aks-profile-systemic-panel"
                id="profile-systemic-panel"
                role="tabpanel"
              >
                <div className="aks-profile-systemic-panel-summary">
                  <div className="aks-profile-systemic-copy">
                    <span className="aks-profile-micro-label">
                      {String(activeSystemicIndex + 1).padStart(2, '0')}
                    </span>
                    <h3>{activeSystemicContent.title}</h3>
                    {hasText(activeSystemicContent.principle) ? (
                      <p>{activeSystemicContent.principle}</p>
                    ) : null}
                  </div>

                  {hasText(activeSystemicContent.example) ? (
                    <div className="aks-profile-systemic-example">
                      <span className="aks-profile-micro-label">
                        {content.systemicScale.exampleLabel}
                      </span>
                      <p>{activeSystemicContent.example}</p>
                    </div>
                  ) : null}

                  {hasText(activeSystemicContent.question) ? (
                    <div className="aks-profile-systemic-question">
                      <span className="aks-profile-micro-label">
                        {content.systemicScale.questionLabel}
                      </span>
                      <strong>{activeSystemicContent.question}</strong>
                    </div>
                  ) : null}
                </div>

                <div
                  aria-label={
                    hasText(activeSystemicContent.diagramAlt)
                      ? activeSystemicContent.diagramAlt
                      : undefined
                  }
                  className="aks-profile-systemic-diagram"
                  data-active-step={activeSystemicStep}
                  role={hasText(activeSystemicContent.diagramAlt) ? 'img' : undefined}
                >
                  {hasText(activeSystemicContent.diagramLeadLabel) ? (
                    <span className="aks-profile-systemic-diagram-lead">
                      {activeSystemicContent.diagramLeadLabel}
                    </span>
                  ) : null}
                  <div className="aks-profile-systemic-chain">
                    {profileSystemicScaleProcessKeys.map((key, index) => {
                      const label = content.systemicScale.processLabels[key];
                      if (!hasText(label)) return null;
                      const pairStart = activeSystemicIndex * 2;
                      const highlighted = index === pairStart || index === pairStart + 1;
                      return (
                        <span
                          className="aks-profile-systemic-process-node"
                          data-highlighted={highlighted || undefined}
                          key={key}
                        >
                          {label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {emblemVisible ? (
              <div className="aks-profile-emblem">
                <div className="aks-profile-emblem-heading">
                  {hasText(content.emblem.eyebrow) ? (
                    <p className="aks-profile-eyebrow">{content.emblem.eyebrow}</p>
                  ) : null}
                  {hasText(content.emblem.title) ? <h3>{content.emblem.title}</h3> : null}
                  {hasText(content.emblem.introduction) ? (
                    <p className="aks-profile-body-copy">{content.emblem.introduction}</p>
                  ) : null}
                </div>

                <div className="aks-profile-emblem-map">
                  <BrandMark
                    className="aks-profile-emblem-mark"
                    title={hasText(content.emblem.title) ? content.emblem.title : ui.emblemAlt}
                  />
                  {profileEmblemSymbolKeys.map((key) => {
                    const symbol = content.emblem.symbols[key];
                    if (!hasText(symbol.name) && !hasText(symbol.description)) {
                      return null;
                    }
                    return (
                      <article
                        className="aks-profile-emblem-callout"
                        data-emblem-symbol={key}
                        key={key}
                      >
                        <h4>{symbol.name}</h4>
                        {hasText(symbol.concept) ? (
                          <span className="aks-profile-micro-label">{symbol.concept}</span>
                        ) : null}
                        <p>{symbol.description}</p>
                      </article>
                    );
                  })}
                </div>

                <div className="aks-profile-emblem-mobile">
                  <BrandMark
                    className="aks-profile-emblem-mobile-mark"
                    title={hasText(content.emblem.title) ? content.emblem.title : ui.emblemAlt}
                  />
                  <ul>
                    {profileEmblemSymbolKeys.map((key) => {
                      const symbol = content.emblem.symbols[key];
                      if (!hasText(symbol.name) && !hasText(symbol.description)) {
                        return null;
                      }
                      return (
                        <li key={key}>
                          <div>
                            <strong>{symbol.name}</strong>
                            {hasText(symbol.concept) ? <span>{symbol.concept}</span> : null}
                          </div>
                          <p>{symbol.description}</p>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {hasText(content.emblem.conclusion) ? (
                  <p className="aks-profile-emblem-conclusion">{content.emblem.conclusion}</p>
                ) : null}
              </div>
            ) : null}
          </Container>
        </section>
      ) : null}

      {hasText(content.callToAction.title) ? (
        <section
          aria-labelledby="profile-cta-title"
          className="aks-profile-cta aks-section-separator-after"
          data-profile-section="cta"
        >
          <Container width="wide">
            <div className="aks-profile-cta-inner">
              {hasText(content.callToAction.eyebrow) ? (
                <p className="aks-profile-eyebrow">{content.callToAction.eyebrow}</p>
              ) : null}
              <h2 id="profile-cta-title">{content.callToAction.title}</h2>
              {hasText(content.callToAction.body) ? (
                <p className="aks-profile-body-copy">{content.callToAction.body}</p>
              ) : null}
              <a
                className="aks-profile-pill aks-profile-cta-link"
                href={destinationHref('work-with-us', profile.locale)}
              >
                {hasText(content.callToAction.buttonLabel)
                  ? content.callToAction.buttonLabel
                  : profile.locale === 'fr'
                    ? 'Commencer une conversation'
                    : 'Start a conversation'}
              </a>
            </div>
          </Container>
        </section>
      ) : null}
    </main>
  );
}
