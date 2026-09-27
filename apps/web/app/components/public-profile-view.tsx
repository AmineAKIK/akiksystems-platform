import {
  profileCapabilityStepKeys,
  profileCrossCuttingKeys,
  profileEmblemSymbolKeys,
  profileGuidanceKeys,
  profileSystemicScaleStepKeys,
} from '@akiksystems/core/profile-content';
import type { PublicProfile } from '@akiksystems/db';
import { Container, Heading, Link, Text } from '@akiksystems/ui';

import { destinationHref } from '../i18n/global-destinations';

interface PublicProfileViewProps {
  profile: PublicProfile;
}

const languageLabels = {
  en: { fr: 'French', en: 'English', ar: 'Arabic' },
  fr: { fr: 'Français', en: 'Anglais', ar: 'Arabe' },
} as const;

function contactHref(kind: string, value: string): string {
  if (kind === 'email') return `mailto:${value}`;
  if (kind === 'phone') return `tel:${value.replace(/\s+/g, '')}`;
  return value;
}

function hasText(value: string): boolean {
  return value.trim() !== '';
}

export function PublicProfileView({ profile }: PublicProfileViewProps) {
  const { content } = profile;

  return (
    <main className="aks-proof-page" data-profile-contract="v1">
      <Container>
        <div className="aks-proof-stack">
          <section aria-labelledby="profile-title">
            <div className="aks-proof-stack">
              {profile.portraitAssetId !== null &&
              profile.portraitAltText !== null ? (
                <img
                  alt={profile.portraitAltText}
                  className="aks-profile-portrait"
                  height={320}
                  loading="eager"
                  src={
                    profile.locale === 'fr'
                      ? '/fr/profil/portrait'
                      : '/en/profile/portrait'
                  }
                  width={320}
                />
              ) : null}

              {hasText(content.hero.eyebrow) ? (
                <Text className="aks-proof-eyebrow" size="sm" tone="muted">
                  {content.hero.eyebrow}
                </Text>
              ) : null}

              <Heading id="profile-title" level={1} size="md">
                {profile.displayName}
              </Heading>

              <Text size="lg" tone="strong">
                {content.hero.professionalTitle}
              </Text>

              {hasText(content.hero.specialization) ? (
                <Text size="lg" tone="muted">
                  {content.hero.specialization}
                </Text>
              ) : null}

              <Text>{content.hero.introduction}</Text>

              <div className="aks-proof-actions">
                {profile.contacts.map((contact) => (
                  <Link
                    href={contactHref(contact.kind, contact.value)}
                    key={contact.kind}
                  >
                    {contact.kind === 'email'
                      ? 'Email'
                      : contact.kind === 'phone'
                        ? profile.locale === 'fr'
                          ? 'Téléphone'
                          : 'Phone'
                        : contact.kind === 'linkedin'
                          ? 'LinkedIn'
                          : 'GitHub'}
                  </Link>
                ))}
                {profile.sourceCvAssetId !== null ? (
                  <Link
                    href={
                      profile.locale === 'fr'
                        ? '/fr/profil/cv'
                        : '/en/profile/cv'
                    }
                  >
                    {hasText(content.hero.cvLabel)
                      ? content.hero.cvLabel
                      : profile.locale === 'fr'
                        ? 'Télécharger le CV'
                        : 'Download CV'}
                  </Link>
                ) : null}
              </div>

              {profile.languages.length > 0 ? (
                <Text size="sm" tone="muted">
                  {profile.languages
                    .map((language) => languageLabels[profile.locale][language])
                    .join(' · ')}
                </Text>
              ) : null}

              {profile.mobility.worldwide ||
              profile.mobility.remote ||
              profile.mobility.relocation ? (
                <Text size="sm" tone="muted">
                  {[
                    profile.mobility.worldwide
                      ? profile.locale === 'fr'
                        ? 'International'
                        : 'Worldwide'
                      : null,
                    profile.mobility.remote
                      ? profile.locale === 'fr'
                        ? 'À distance'
                        : 'Remote'
                      : null,
                    profile.mobility.relocation
                      ? profile.locale === 'fr'
                        ? 'Relocalisation'
                        : 'Relocation'
                      : null,
                  ]
                    .filter((value): value is string => value !== null)
                    .join(' · ')}
                </Text>
              ) : null}
            </div>

            {profile.currentProject !== null ? (
              <aside
                aria-label={
                  profile.locale === 'fr' ? 'Projet en cours' : 'Current project'
                }
                className="aks-profile-current-project"
              >
                <div className="aks-proof-stack">
                  {hasText(content.currentProject.eyebrow) ? (
                    <Text className="aks-proof-eyebrow" size="sm" tone="muted">
                      {content.currentProject.eyebrow}
                    </Text>
                  ) : null}
                  <Heading level={2} size="sm">
                    {profile.currentProject.title}
                  </Heading>
                  <Text>{profile.currentProject.summary}</Text>
                  {hasText(content.currentProject.role) ? (
                    <Text size="sm" tone="muted">
                      {hasText(content.currentProject.roleLabel)
                        ? `${content.currentProject.roleLabel}: `
                        : ''}
                      {content.currentProject.role}
                    </Text>
                  ) : null}
                  {profile.currentProject.technologies.length > 0 ? (
                    <Text size="sm" tone="muted">
                      {profile.currentProject.technologies
                        .map((technology) => technology.name)
                        .join(' · ')}
                    </Text>
                  ) : null}
                  <Link href={profile.currentProject.href}>
                    {hasText(content.currentProject.ctaLabel)
                      ? content.currentProject.ctaLabel
                      : profile.locale === 'fr'
                        ? 'Voir le système'
                        : 'Inspect system'}
                  </Link>
                </div>
              </aside>
            ) : null}
          </section>

          {profile.stackGroups.length > 0 ? (
            <section aria-labelledby="profile-stack-title">
              <div className="aks-proof-stack">
                {hasText(content.stack.eyebrow) ? (
                  <Text className="aks-proof-eyebrow" size="sm" tone="muted">
                    {content.stack.eyebrow}
                  </Text>
                ) : null}
                <Heading id="profile-stack-title" level={2} size="sm">
                  {hasText(content.stack.title)
                    ? content.stack.title
                    : profile.locale === 'fr'
                      ? 'Stack'
                      : 'Stack'}
                </Heading>
                {hasText(content.stack.introduction) ? (
                  <Text tone="muted">{content.stack.introduction}</Text>
                ) : null}
              </div>

              <div className="aks-proof-stack">
                {profile.stackGroups.map((group) => (
                  <article className="aks-profile-stack-group" key={group.id}>
                    <div className="aks-proof-stack">
                      <Heading level={3} size="sm">
                        {group.title}
                      </Heading>
                      <Text size="sm" tone="muted">
                        {group.technologies
                          .map((technology) => technology.name)
                          .join(' · ')}
                      </Text>
                      <Text size="sm" tone="strong">
                        {hasText(content.stack.proofCountLabel)
                          ? `${content.stack.proofCountLabel} ${group.proofCount}`
                          : profile.locale === 'fr'
                            ? `Prouvé dans ${group.proofCount} système(s)`
                            : `Proved in ${group.proofCount} system(s)`}
                      </Text>
                      {group.proofSystems.map((system) => (
                        <div className="aks-proof-stack" key={system.id}>
                          <Text tone="strong">{system.title}</Text>
                          {system.technologies.map((technology) => (
                            <Text key={technology.id} size="sm" tone="muted">
                              {technology.name} — {technology.evidence}
                            </Text>
                          ))}
                          <Link href={system.href}>
                            {hasText(content.stack.inspectSystemLabel)
                              ? content.stack.inspectSystemLabel
                              : profile.locale === 'fr'
                                ? 'Inspecter le système'
                                : 'Inspect system'}
                          </Link>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {hasText(content.guidance.title) ? (
            <section aria-labelledby="profile-guidance-title">
              <Heading id="profile-guidance-title" level={2} size="sm">
                {content.guidance.title}
              </Heading>
              {hasText(content.guidance.introduction) ? (
                <Text tone="muted">{content.guidance.introduction}</Text>
              ) : null}
              <div className="aks-proof-stack">
                {profileGuidanceKeys.map((key) => {
                  const look = content.guidance.looks[key];
                  if (!hasText(look.title) && !hasText(look.description)) {
                    return null;
                  }
                  return (
                    <article className="aks-profile-guidance-look" key={key}>
                      <Heading level={3} size="sm">
                        {look.title}
                      </Heading>
                      {hasText(look.description) ? (
                        <Text>{look.description}</Text>
                      ) : null}
                      {look.metricValue !== null ? (
                        <Text size="sm" tone="strong">
                          {look.metricValue}
                          {look.metricLabel === null
                            ? ''
                            : ` · ${look.metricLabel}`}
                        </Text>
                      ) : null}
                      {hasText(look.benefit) ? (
                        <Text size="sm" tone="muted">
                          {look.benefit}
                        </Text>
                      ) : null}
                      {hasText(look.avoidance) ? (
                        <Text size="sm" tone="muted">
                          {look.avoidance}
                        </Text>
                      ) : null}
                      {look.questions.length > 0 ? (
                        <ul>
                          {look.questions.map((question) => (
                            <li key={question}>
                              <Text size="sm">{question}</Text>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </section>
          ) : null}

          {hasText(content.capabilities.title) ? (
            <section aria-labelledby="profile-capabilities-title">
              <Heading id="profile-capabilities-title" level={2} size="sm">
                {content.capabilities.title}
              </Heading>
              <ol className="aks-proof-stack">
                {profileCapabilityStepKeys.map((key) => {
                  const step = content.capabilities.steps[key];
                  if (!hasText(step.title) && !hasText(step.purpose)) return null;
                  return (
                    <li className="aks-profile-capability-step" key={key}>
                      <Heading level={3} size="sm">
                        {step.title}
                      </Heading>
                      {hasText(step.purpose) ? <Text>{step.purpose}</Text> : null}
                      {step.actions.length > 0 ? (
                        <ul>
                          {step.actions.map((action) => (
                            <li key={action}>
                              <Text size="sm">{action}</Text>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      {hasText(step.deliverable) ? (
                        <Text size="sm" tone="muted">
                          {step.deliverable}
                        </Text>
                      ) : null}
                    </li>
                  );
                })}
              </ol>

              <div className="aks-proof-stack">
                {profileCrossCuttingKeys.map((key) => {
                  const capability = content.capabilities.crossCutting[key];
                  if (
                    !hasText(capability.title) &&
                    !hasText(capability.description)
                  ) {
                    return null;
                  }
                  return (
                    <article
                      className="aks-profile-cross-cutting-capability"
                      key={key}
                    >
                      <Heading level={3} size="sm">
                        {capability.title}
                      </Heading>
                      <Text>{capability.description}</Text>
                    </article>
                  );
                })}
              </div>
            </section>
          ) : null}

          {hasText(content.systemicScale.title) ? (
            <section aria-labelledby="profile-systemic-scale-title">
              <Heading id="profile-systemic-scale-title" level={2} size="sm">
                {content.systemicScale.title}
              </Heading>
              {hasText(content.systemicScale.statementPrimary) ? (
                <Text size="lg" tone="strong">
                  {content.systemicScale.statementPrimary}
                </Text>
              ) : null}
              {hasText(content.systemicScale.statementSecondary) ? (
                <Text size="lg" tone="muted">
                  {content.systemicScale.statementSecondary}
                </Text>
              ) : null}
              {hasText(content.systemicScale.introduction) ? (
                <Text>{content.systemicScale.introduction}</Text>
              ) : null}

              {profile.systemicScaleWriting !== null ? (
                <Link href={profile.systemicScaleWriting.href}>
                  {hasText(content.systemicScale.reasoningLinkLabel)
                    ? content.systemicScale.reasoningLinkLabel
                    : profile.systemicScaleWriting.title}
                </Link>
              ) : null}

              <ol className="aks-proof-stack">
                {profileSystemicScaleStepKeys.map((key) => {
                  const step = content.systemicScale.steps[key];
                  if (!hasText(step.title) && !hasText(step.principle)) return null;
                  return (
                    <li className="aks-profile-systemic-scale-step" key={key}>
                      <Heading level={3} size="sm">
                        {step.title}
                      </Heading>
                      <Text>{step.principle}</Text>
                      {hasText(step.example) ? (
                        <Text size="sm" tone="muted">
                          {step.example}
                        </Text>
                      ) : null}
                      {hasText(step.question) ? (
                        <Text size="sm" tone="strong">
                          {step.question}
                        </Text>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            </section>
          ) : null}

          {hasText(content.emblem.title) ? (
            <section aria-labelledby="profile-emblem-title">
              <Heading id="profile-emblem-title" level={2} size="sm">
                {content.emblem.title}
              </Heading>
              {hasText(content.emblem.introduction) ? (
                <Text>{content.emblem.introduction}</Text>
              ) : null}
              <div className="aks-proof-stack">
                {profileEmblemSymbolKeys.map((key) => {
                  const symbol = content.emblem.symbols[key];
                  if (!hasText(symbol.name) && !hasText(symbol.description)) {
                    return null;
                  }
                  return (
                    <article key={key}>
                      <Heading level={3} size="sm">
                        {symbol.name}
                      </Heading>
                      {hasText(symbol.concept) ? (
                        <Text size="sm" tone="strong">
                          {symbol.concept}
                        </Text>
                      ) : null}
                      <Text>{symbol.description}</Text>
                    </article>
                  );
                })}
              </div>
              {hasText(content.emblem.conclusion) ? (
                <Text tone="muted">{content.emblem.conclusion}</Text>
              ) : null}
            </section>
          ) : null}

          {hasText(content.callToAction.title) ? (
            <section aria-labelledby="profile-cta-title">
              <Heading id="profile-cta-title" level={2} size="sm">
                {content.callToAction.title}
              </Heading>
              {hasText(content.callToAction.body) ? (
                <Text>{content.callToAction.body}</Text>
              ) : null}
              <Link href={destinationHref('work-with-us', profile.locale)}>
                {hasText(content.callToAction.buttonLabel)
                  ? content.callToAction.buttonLabel
                  : profile.locale === 'fr'
                    ? 'Travailler ensemble'
                    : 'Work with us'}
              </Link>
            </section>
          ) : null}
        </div>
      </Container>
    </main>
  );
}
