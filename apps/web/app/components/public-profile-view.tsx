import { Container, Heading, Link, Text } from '@akiksystems/ui';

import type { PublicProfile, PublicSystemReference } from '@akiksystems/db';

import { destinationById } from '../i18n/global-destinations';
import { SystemReference } from './system-reference';

interface PublicProfileViewProps {
  profile: PublicProfile;
  systemReferences: PublicSystemReference[];
}

const languageLabels = {
  en: { fr: 'French', en: 'English', ar: 'Arabic' },
  fr: { fr: 'Français', en: 'Anglais', ar: 'Arabe' },
} as const;

const mobilityLabels = {
  en: {
    worldwide: 'Worldwide',
    remote: 'Remote',
    relocation: 'Relocation',
  },
  fr: {
    worldwide: 'International',
    remote: 'À distance',
    relocation: 'Relocalisation',
  },
} as const;

export function PublicProfileView({
  profile,
  systemReferences,
}: PublicProfileViewProps) {
  const fallback = destinationById('profile').description[profile.locale];
  const referenceById = new Map(
    systemReferences.map((reference) => [reference.id, reference]),
  );
  const immediateProof =
    profile.representativeSystems[0] === undefined
      ? null
      : referenceById.get(profile.representativeSystems[0].id) ?? null;
  const remainingSystems = profile.representativeSystems
    .slice(1)
    .flatMap((system) => {
      const reference = referenceById.get(system.id);
      return reference === undefined ? [] : [reference];
    });
  const identity = profile.displayName ?? (profile.locale === 'fr' ? 'Profil' : 'Profile');

  return (
    <main className="aks-proof-page">
      <Container>
        <div className="aks-proof-stack">
          <section
            className="aks-profile-first-view"
            aria-labelledby="profile-title"
          >
            <div className="aks-profile-first-view-identity">
              <div className="aks-proof-stack">
                <Text className="aks-proof-eyebrow" size="sm" tone="muted">
                  {profile.locale === 'fr'
                    ? 'Profil · AkikSystems'
                    : 'Profile · AkikSystems'}
                </Text>
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
              </div>

              <div className="aks-profile-first-view-copy">
                <Heading id="profile-title" level={1} size="md">
                  {identity}
                </Heading>
                {profile.professionalTitle !== null ? (
                  <Text size="lg" tone="strong">
                    {profile.professionalTitle}
                  </Text>
                ) : null}
                <Text size="lg" tone="muted">
                  {profile.introduction ?? fallback}
                </Text>
                {profile.foundationalCopy !== null ? (
                  <Text>{profile.foundationalCopy}</Text>
                ) : null}
                {profile.sourceCvAssetId !== null ? (
                  <div className="aks-proof-actions">
                    <Link
                      href={
                        profile.locale === 'fr'
                          ? '/fr/profil/cv'
                          : '/en/profile/cv'
                      }
                    >
                      {profile.locale === 'fr'
                        ? 'Voir le CV source'
                        : 'View source CV'}
                    </Link>
                  </div>
                ) : null}
              </div>
            </div>

            {immediateProof !== null ? (
              <aside
                className="aks-profile-immediate-proof"
                aria-label={
                  profile.locale === 'fr'
                    ? 'Preuve immédiate'
                    : 'Immediate proof'
                }
              >
                <SystemReference
                  label={
                    profile.locale === 'fr'
                      ? 'Preuve immédiate'
                      : 'Immediate proof'
                  }
                  reference={immediateProof}
                />
              </aside>
            ) : null}
          </section>

          {profile.workPrinciples.length > 0 ? (
            <section
              className="aks-profile-work-principles"
              id="profile-how-i-work"
              aria-labelledby="profile-how-i-work-title"
            >
              <div className="aks-profile-section-heading">
                <Heading id="profile-how-i-work-title" level={2} size="sm">
                  {profile.locale === 'fr'
                    ? 'Ma manière de travailler'
                    : 'How I work'}
                </Heading>
                <Text size="sm" tone="muted">
                  {profile.locale === 'fr'
                    ? 'Des principes concrets, reliés à une preuve quand elle apporte du contexte.'
                    : 'Concrete operating principles, linked to evidence when it adds useful context.'}
                </Text>
              </div>
              <ol className="aks-profile-work-principle-list">
                {profile.workPrinciples.map((principle) => (
                  <li
                    className="aks-profile-work-principle"
                    key={principle.id}
                  >
                    <div className="aks-proof-stack">
                      <Heading level={3} size="sm">
                        {principle.title}
                      </Heading>
                      {principle.detail !== null ? (
                        <Text tone="muted">{principle.detail}</Text>
                      ) : null}
                      {principle.evidenceSystem !== null &&
                      referenceById.has(principle.evidenceSystem.id) ? (
                        <SystemReference
                          label={profile.locale === 'fr' ? 'Exemple' : 'Example'}
                          reference={referenceById.get(principle.evidenceSystem.id)!}
                          variant="inline"
                        />
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          {profile.technologyJourney.length > 0 ||
          profile.capabilityGroups.length > 0 ? (
            <details
              className="aks-profile-depth"
              id="profile-technical-depth"
            >
              <summary className="aks-profile-depth-summary">
                <span>
                  {profile.locale === 'fr'
                    ? 'Approfondir la technique'
                    : 'Explore technical depth'}
                </span>
                <span className="aks-profile-depth-summary-note">
                  {profile.locale === 'fr'
                    ? 'Parcours technologique et capacités'
                    : 'Technological journey and capabilities'}
                </span>
              </summary>
              <div className="aks-profile-depth-content">
                {profile.technologyJourney.length > 0 ? (
                  <section className="aks-profile-technology-journey">
                    <div className="aks-profile-section-heading">
                      <Heading level={2} size="sm">
                        {profile.locale === 'fr'
                          ? 'Parcours technologique'
                          : 'Technological journey'}
                      </Heading>
                      <Text size="sm" tone="muted">
                        {profile.locale === 'fr'
                          ? 'Une progression technique cohérente, de la programmation aux systèmes logiciels inspectables.'
                          : 'A coherent technical progression from programming to inspectable software systems.'}
                      </Text>
                    </div>
                    <ol className="aks-profile-technology-journey-list">
                      {profile.technologyJourney.map((stage) => (
                        <li
                          className="aks-profile-technology-journey-stage"
                          key={stage.key}
                        >
                          <div className="aks-profile-technology-journey-marker">
                            <Text size="sm" tone="muted">
                              {String(stage.position + 1).padStart(2, '0')}
                            </Text>
                          </div>
                          <div className="aks-proof-stack">
                            <Heading level={3} size="sm">
                              {stage.title}
                            </Heading>
                            {stage.summary !== null ? (
                              <Text tone="muted">{stage.summary}</Text>
                            ) : null}
                            {stage.evidence !== null ? (
                              stage.evidence.kind === 'system' &&
                              referenceById.has(stage.evidence.id) ? (
                                <SystemReference
                                  label={profile.locale === 'fr' ? 'Preuve' : 'Evidence'}
                                  reference={referenceById.get(stage.evidence.id)!}
                                  variant="inline"
                                />
                              ) : (
                                <Text size="sm" tone="strong">
                                  {profile.locale === 'fr'
                                    ? `Contexte : ${stage.evidence.title}`
                                    : `Context: ${stage.evidence.title}`}
                                </Text>
                              )
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ol>
                  </section>
                ) : null}

                {profile.capabilityGroups.length > 0 ? (
                  <section className="aks-profile-capabilities">
                    <div className="aks-profile-section-heading">
                      <Heading level={2} size="sm">
                        {profile.locale === 'fr'
                          ? 'Capacités techniques'
                          : 'Technical Capabilities'}
                      </Heading>
                      <Text size="sm" tone="muted">
                        {profile.locale === 'fr'
                          ? 'Des aptitudes d’ingénierie regroupées par domaine — distinctes des outils utilisés.'
                          : 'Engineering abilities grouped by domain — distinct from the tools used.'}
                      </Text>
                    </div>
                    <div className="aks-profile-capability-groups">
                      {profile.capabilityGroups.map((group) => (
                        <section
                          aria-labelledby={`capability-group-${group.id}`}
                          className="aks-profile-capability-group"
                          key={group.id}
                        >
                          <Heading
                            id={`capability-group-${group.id}`}
                            level={3}
                            size="sm"
                          >
                            {group.title}
                          </Heading>
                          <ul className="aks-profile-capability-list">
                            {group.capabilities.map((capability) => (
                              <li
                                className="aks-profile-capability"
                                key={capability.id}
                              >
                                <Text tone="strong">{capability.title}</Text>
                                {capability.summary !== null ? (
                                  <Text size="sm" tone="muted">
                                    {capability.summary}
                                  </Text>
                                ) : null}
                              </li>
                            ))}
                          </ul>
                        </section>
                      ))}
                    </div>
                  </section>
                ) : null}
              </div>
            </details>
          ) : null}

          {profile.professionalJourney.length > 0 ||
          remainingSystems.length > 0 ? (
            <details
              className="aks-profile-depth"
              id="profile-professional-evidence"
            >
              <summary className="aks-profile-depth-summary">
                <span>
                  {profile.locale === 'fr'
                    ? 'Approfondir les preuves professionnelles'
                    : 'Explore professional evidence'}
                </span>
                <span className="aks-profile-depth-summary-note">
                  {profile.locale === 'fr'
                    ? 'Expériences pertinentes et systèmes'
                    : 'Relevant experience and systems'}
                </span>
              </summary>
              <div className="aks-profile-depth-content">
                {profile.professionalJourney.length > 0 ? (
                  <section className="aks-profile-professional-journey">
                    <Heading level={2} size="sm">
                      {profile.locale === 'fr'
                        ? 'Parcours professionnel pertinent'
                        : 'Relevant professional journey'}
                    </Heading>
                    <ol className="aks-profile-journey-list">
                      {profile.professionalJourney.map((experience) => (
                        <li key={experience.id}>
                          <div className="aks-proof-stack">
                            <Heading level={3} size="sm">
                              {experience.title}
                            </Heading>
                            {experience.summary !== null ? (
                              <Text tone="muted">{experience.summary}</Text>
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ol>
                  </section>
                ) : null}

                {remainingSystems.length > 0 ? (
                  <section className="aks-profile-representative-systems">
                    <Heading level={2} size="sm">
                      {profile.locale === 'fr'
                        ? 'Systèmes représentatifs'
                        : 'Representative Systems'}
                    </Heading>
                    <div className="aks-profile-system-list">
                      {remainingSystems.map((reference) => (
                        <SystemReference
                          key={reference.id}
                          reference={reference}
                        />
                      ))}
                    </div>
                  </section>
                ) : null}
              </div>
            </details>
          ) : null}

          {profile.languages.length > 0 ||
          profile.mobility.worldwide ||
          profile.mobility.remote ||
          profile.mobility.relocation ? (
            <section className="aks-profile-languages-mobility">
              <Heading level={2} size="sm">
                {profile.locale === 'fr'
                  ? 'Langues et mobilité'
                  : 'Languages & mobility'}
              </Heading>
              {profile.languages.length > 0 ? (
                <div className="aks-proof-stack">
                  <Heading level={3} size="sm">
                    {profile.locale === 'fr' ? 'Langues' : 'Languages'}
                  </Heading>
                  <ul className="aks-profile-fact-list">
                    {profile.languages.map((language) => (
                      <li key={language}>
                        <Text>{languageLabels[profile.locale][language]}</Text>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {profile.mobility.worldwide ||
              profile.mobility.remote ||
              profile.mobility.relocation ? (
                <div className="aks-proof-stack">
                  <Heading level={3} size="sm">
                    {profile.locale === 'fr' ? 'Mobilité' : 'Mobility'}
                  </Heading>
                  <ul className="aks-profile-fact-list">
                    {(
                      ['worldwide', 'remote', 'relocation'] as const
                    )
                      .filter((key) => profile.mobility[key])
                      .map((key) => (
                        <li key={key}>
                          <Text>{mobilityLabels[profile.locale][key]}</Text>
                        </li>
                      ))}
                  </ul>
                </div>
              ) : null}
            </section>
          ) : null}
        </div>
      </Container>
    </main>
  );
}
