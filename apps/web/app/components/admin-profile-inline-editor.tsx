import type {
  PublicProfile,
  PublicSystemReference,
} from '@akiksystems/db';
import { Button, Container, Heading, Link, Text } from '@akiksystems/ui';
import { Form } from 'react-router';

import { SystemReference } from './system-reference';

type JourneyStageKey =
  | 'programming'
  | 'networks_telecom'
  | 'it_support'
  | 'industry'
  | 'development_akiksystems';

export interface AdminProfileJourneyStage {
  key: JourneyStageKey;
  position: number;
  fallbackLabel: string;
  title: string | null;
  summary: string | null;
}

interface AdminProfileInlineEditorProps {
  journeyStages: AdminProfileJourneyStage[];
  locale: 'en' | 'fr';
  profile: PublicProfile;
  publication:
    | {
        published_at: string;
      }
    | null;
  systemReferences: PublicSystemReference[];
}

function InlineInput({
  className = '',
  defaultValue,
  label,
  maxLength,
  name,
  placeholder,
  required = false,
}: {
  className?: string;
  defaultValue: string | null;
  label: string;
  maxLength?: number;
  name: string;
  placeholder: string;
  required?: boolean;
}) {
  return (
    <input
      aria-label={label}
      className={'aks-admin-profile-inline ' + className}
      defaultValue={defaultValue ?? ''}
      maxLength={maxLength}
      name={name}
      placeholder={placeholder}
      required={required}
      type="text"
    />
  );
}

function InlineTextarea({
  className = '',
  defaultValue,
  label,
  maxLength,
  name,
  placeholder,
  required = false,
  rows = 1,
}: {
  className?: string;
  defaultValue: string | null;
  label: string;
  maxLength?: number;
  name: string;
  placeholder: string;
  required?: boolean;
  rows?: number;
}) {
  return (
    <textarea
      aria-label={label}
      className={'aks-admin-profile-inline ' + className}
      defaultValue={defaultValue ?? ''}
      maxLength={maxLength}
      name={name}
      placeholder={placeholder}
      required={required}
      rows={rows}
    />
  );
}

function LockedSurface({
  children,
  className = '',
}: {
  children: string;
  className?: string;
}) {
  return (
    <div className={'aks-admin-profile-locked-surface ' + className}>
      <Text size="sm" tone="muted">
        {children}
      </Text>
    </div>
  );
}

export function AdminProfileInlineEditor({
  journeyStages,
  locale,
  profile,
  publication,
  systemReferences,
}: AdminProfileInlineEditorProps) {
  const publicHref = locale === 'fr' ? '/fr/profil' : '/en/profile';
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

  return (
    <Form
      className="aks-admin-profile-inline-editor"
      id="admin-profile"
      method="post"
    >
      <input name="locale" type="hidden" value={locale} />

      <div className="aks-admin-profile-toolbar">
        <Container width="wide">
          <div className="aks-admin-profile-toolbar-inner">
            <div className="aks-admin-profile-toolbar-context">
              <span className="aks-admin-profile-toolbar-kicker">
                Live page editor
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
                {locale === 'fr' ? 'Français' : 'English'} ·{' '}
                {publication === null ? 'no public snapshot' : 'published'}
              </span>
            </div>

            <div className="aks-admin-profile-toolbar-actions">
              <Link href={publicHref}>Open public Profile</Link>
              <Button
                emphasis="quiet"
                name="_intent"
                type="submit"
                value="profile-inline-save"
              >
                Save {locale.toUpperCase()} draft
              </Button>
              <Button
                name="_intent"
                type="submit"
                value="profile-inline-publish"
              >
                Publish {locale.toUpperCase()}
              </Button>
            </div>
          </div>
        </Container>
      </div>

      <div
        className="aks-proof-page aks-admin-profile-canvas"
        data-admin-locale={locale}
      >
        <Container>
          <div className="aks-proof-stack">
            <section
              aria-labelledby="admin-profile-title"
              className="aks-profile-first-view"
            >
              <div className="aks-profile-first-view-identity">
                <div className="aks-proof-stack">
                  <Text className="aks-proof-eyebrow" size="sm" tone="muted">
                    {locale === 'fr' ? 'Profil · AkikSystems' : 'Profile · AkikSystems'}
                  </Text>
                  <LockedSurface className="aks-admin-profile-portrait-preview">
                    {profile.portraitAssetId === null
                      ? locale === 'fr'
                        ? 'Portrait non défini · géré dans Structure & assets'
                        : 'No portrait set · managed in Structure & assets'
                      : locale === 'fr'
                        ? 'Portrait défini · géré dans Structure & assets'
                        : 'Portrait set · managed in Structure & assets'}
                  </LockedSurface>
                </div>

                <div className="aks-profile-first-view-copy">
                  <Heading id="admin-profile-title" level={1} size="md">
                    <InlineInput
                      className="aks-admin-profile-display-name-editor"
                      defaultValue={profile.displayName}
                      label="Display name"
                      maxLength={80}
                      name="displayName"
                      placeholder={locale === 'fr' ? 'Nom public' : 'Display name'}
                    />
                  </Heading>
                  <Text size="lg" tone="strong">
                    <InlineInput
                      className="aks-admin-profile-professional-title-editor"
                      defaultValue={profile.professionalTitle}
                      label={
                        locale === 'fr'
                          ? 'Titre professionnel'
                          : 'Professional title'
                      }
                      maxLength={100}
                      name="professionalTitle"
                      placeholder={
                        locale === 'fr'
                          ? 'Titre professionnel'
                          : 'Professional title'
                      }
                    />
                  </Text>
                  <Text size="lg" tone="muted">
                    <InlineTextarea
                      className="aks-admin-profile-introduction-editor"
                      defaultValue={profile.introduction}
                      label="Profile introduction"
                      maxLength={320}
                      name="introduction"
                      placeholder={
                        locale === 'fr'
                          ? 'Introduction du profil'
                          : 'Profile introduction'
                      }
                      rows={3}
                    />
                  </Text>
                  <Text>
                    <InlineTextarea
                      className="aks-admin-profile-foundational-editor"
                      defaultValue={profile.foundationalCopy}
                      label="Foundational profile copy"
                      maxLength={600}
                      name="foundationalCopy"
                      placeholder={
                        locale === 'fr'
                          ? 'Texte fondateur du profil'
                          : 'Foundational profile copy'
                      }
                      rows={3}
                    />
                  </Text>
                  {profile.sourceCvAssetId === null ? (
                    <LockedSurface className="aks-admin-profile-inline-status">
                      {locale === 'fr'
                        ? 'Aucun CV source lié'
                        : 'No source CV linked'}
                    </LockedSurface>
                  ) : (
                    <LockedSurface className="aks-admin-profile-inline-status">
                      {locale === 'fr'
                        ? 'CV source lié · géré dans Structure & assets'
                        : 'Source CV linked · managed in Structure & assets'}
                    </LockedSurface>
                  )}
                </div>
              </div>

              <aside
                aria-label={
                  locale === 'fr' ? 'Preuve immédiate' : 'Immediate proof'
                }
                className="aks-profile-immediate-proof"
              >
                {immediateProof === null ? (
                  <LockedSurface className="aks-admin-profile-proof-placeholder">
                    {locale === 'fr'
                      ? 'Aucun système représentatif sélectionné'
                      : 'No representative System selected'}
                  </LockedSurface>
                ) : (
                  <SystemReference
                    label={
                      locale === 'fr' ? 'Preuve immédiate' : 'Immediate proof'
                    }
                    reference={immediateProof}
                  />
                )}
              </aside>
            </section>

            <section
              aria-labelledby="admin-profile-how-i-work-title"
              className="aks-profile-work-principles"
              id="admin-profile-how-i-work"
            >
              <div className="aks-profile-section-heading">
                <Heading
                  id="admin-profile-how-i-work-title"
                  level={2}
                  size="sm"
                >
                  {locale === 'fr' ? 'Ma manière de travailler' : 'How I work'}
                </Heading>
                <Text size="sm" tone="muted">
                  {locale === 'fr'
                    ? 'Les cartes restent visibles dans l’éditeur même avant leur création.'
                    : 'Cards stay visible in the editor even before they are created.'}
                </Text>
              </div>

              {profile.workPrinciples.length === 0 ? (
                <div className="aks-admin-profile-empty-grid">
                  <LockedSurface className="aks-profile-work-principle aks-admin-profile-empty-card">
                    {locale === 'fr'
                      ? 'Aucun principe créé · ajoutez la structure plus bas'
                      : 'No principle created · add structure below'}
                  </LockedSurface>
                  <LockedSurface className="aks-profile-work-principle aks-admin-profile-empty-card">
                    {locale === 'fr'
                      ? 'Les futurs principes apparaîtront ici'
                      : 'Future principles will appear here'}
                  </LockedSurface>
                </div>
              ) : (
                <ol className="aks-profile-work-principle-list">
                  {profile.workPrinciples.map((principle) => (
                    <li
                      className="aks-profile-work-principle"
                      key={principle.id}
                    >
                      <div className="aks-proof-stack">
                        <Heading level={3} size="sm">
                          <InlineInput
                            className="aks-admin-profile-card-title-editor"
                            defaultValue={principle.title}
                            label="Working principle title"
                            maxLength={80}
                            name={'principle-' + principle.id + '-title'}
                            placeholder={
                              locale === 'fr'
                                ? 'Principe de travail'
                                : 'Working principle'
                            }
                            required
                          />
                        </Heading>
                        <Text tone="muted">
                          <InlineTextarea
                            className="aks-admin-profile-card-copy-editor"
                            defaultValue={principle.detail}
                            label="Working principle detail"
                            maxLength={240}
                            name={'principle-' + principle.id + '-detail'}
                            placeholder={
                              locale === 'fr'
                                ? 'Détail du principe'
                                : 'Principle detail'
                            }
                            rows={3}
                          />
                        </Text>
                        {principle.evidenceSystem === null ? (
                          <LockedSurface className="aks-admin-profile-inline-status">
                            {locale === 'fr'
                              ? 'Aucune preuve System liée'
                              : 'No System evidence linked'}
                          </LockedSurface>
                        ) : referenceById.has(principle.evidenceSystem.id) ? (
                          <SystemReference
                            label={locale === 'fr' ? 'Exemple' : 'Example'}
                            reference={referenceById.get(
                              principle.evidenceSystem.id,
                            )!}
                            variant="inline"
                          />
                        ) : (
                          <LockedSurface className="aks-admin-profile-inline-status">
                            {locale === 'fr'
                              ? 'Preuve liée mais non publiée dans cette langue'
                              : 'Evidence linked but not published in this locale'}
                          </LockedSurface>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <details className="aks-profile-depth" open>
              <summary className="aks-profile-depth-summary">
                <span>
                  {locale === 'fr'
                    ? 'Approfondir la technique'
                    : 'Explore technical depth'}
                </span>
                <span className="aks-profile-depth-summary-note">
                  {locale === 'fr'
                    ? 'Parcours technologique et capacités'
                    : 'Technological journey and capabilities'}
                </span>
              </summary>
              <div className="aks-profile-depth-content">
                <section className="aks-profile-technology-journey">
                  <div className="aks-profile-section-heading">
                    <Heading level={2} size="sm">
                      {locale === 'fr'
                        ? 'Parcours technologique'
                        : 'Technological journey'}
                    </Heading>
                    <Text size="sm" tone="muted">
                      {locale === 'fr'
                        ? 'Les cinq étapes fixes restent visibles, même si leur texte est vide.'
                        : 'All five fixed stages stay visible even when their copy is empty.'}
                    </Text>
                  </div>
                  <ol className="aks-profile-technology-journey-list">
                    {journeyStages.map((stage) => (
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
                            <InlineInput
                              className="aks-admin-profile-card-title-editor"
                              defaultValue={stage.title}
                              label={stage.fallbackLabel + ' title'}
                              maxLength={80}
                              name={'journey-' + stage.key + '-title'}
                              placeholder={stage.fallbackLabel}
                              required
                            />
                          </Heading>
                          <Text tone="muted">
                            <InlineTextarea
                              className="aks-admin-profile-card-copy-editor"
                              defaultValue={stage.summary}
                              label={stage.fallbackLabel + ' summary'}
                              maxLength={280}
                              name={'journey-' + stage.key + '-summary'}
                              placeholder={
                                locale === 'fr'
                                  ? 'Résumé de l’étape'
                                  : 'Stage summary'
                              }
                              rows={3}
                            />
                          </Text>
                          <LockedSurface className="aks-admin-profile-inline-status">
                            {locale === 'fr'
                              ? 'Preuve de l’étape gérée dans Structure & assets'
                              : 'Stage evidence managed in Structure & assets'}
                          </LockedSurface>
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>

                <section className="aks-profile-capabilities">
                  <div className="aks-profile-section-heading">
                    <Heading level={2} size="sm">
                      {locale === 'fr'
                        ? 'Capacités techniques'
                        : 'Technical Capabilities'}
                    </Heading>
                    <Text size="sm" tone="muted">
                      {locale === 'fr'
                        ? 'Les capacités existantes se modifient directement ici.'
                        : 'Existing capabilities are edited directly here.'}
                    </Text>
                  </div>

                  {profile.capabilityGroups.length === 0 ? (
                    <LockedSurface className="aks-admin-profile-large-placeholder">
                      {locale === 'fr'
                        ? 'Aucun groupe de capacités créé · ajoutez la structure plus bas'
                        : 'No capability group created · add structure below'}
                    </LockedSurface>
                  ) : (
                    <div className="aks-profile-capability-groups">
                      {profile.capabilityGroups.map((group) => (
                        <section
                          className="aks-profile-capability-group"
                          key={group.id}
                        >
                          <Heading level={3} size="sm">
                            <InlineInput
                              className="aks-admin-profile-card-title-editor"
                              defaultValue={group.title}
                              label="Capability group title"
                              maxLength={80}
                              name={'capability-group-' + group.id + '-title'}
                              placeholder={
                                locale === 'fr'
                                  ? 'Domaine de capacité'
                                  : 'Capability domain'
                              }
                              required
                            />
                          </Heading>
                          <ul className="aks-profile-capability-list">
                            {group.capabilities.map((capability) => (
                              <li
                                className="aks-profile-capability"
                                key={capability.id}
                              >
                                <Text tone="strong">
                                  <InlineInput
                                    className="aks-admin-profile-card-title-editor"
                                    defaultValue={capability.title}
                                    label="Capability title"
                                    maxLength={100}
                                    name={'capability-' + capability.id + '-title'}
                                    placeholder={
                                      locale === 'fr' ? 'Capacité' : 'Capability'
                                    }
                                    required
                                  />
                                </Text>
                                <Text size="sm" tone="muted">
                                  <InlineTextarea
                                    className="aks-admin-profile-card-copy-editor"
                                    defaultValue={capability.summary}
                                    label="Capability summary"
                                    maxLength={280}
                                    name={
                                      'capability-' + capability.id + '-summary'
                                    }
                                    placeholder={
                                      locale === 'fr'
                                        ? 'Résumé de la capacité'
                                        : 'Capability summary'
                                    }
                                    rows={2}
                                  />
                                </Text>
                              </li>
                            ))}
                          </ul>
                        </section>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </details>

            <details className="aks-profile-depth" open>
              <summary className="aks-profile-depth-summary">
                <span>
                  {locale === 'fr'
                    ? 'Approfondir les preuves professionnelles'
                    : 'Explore professional evidence'}
                </span>
                <span className="aks-profile-depth-summary-note">
                  {locale === 'fr'
                    ? 'Expériences pertinentes et systèmes'
                    : 'Relevant experience and systems'}
                </span>
              </summary>
              <div className="aks-profile-depth-content">
                <section className="aks-profile-professional-journey">
                  <Heading level={2} size="sm">
                    {locale === 'fr'
                      ? 'Parcours professionnel pertinent'
                      : 'Relevant professional journey'}
                  </Heading>
                  {profile.professionalJourney.length === 0 ? (
                    <LockedSurface className="aks-admin-profile-large-placeholder">
                      {locale === 'fr'
                        ? 'Aucune expérience sélectionnée'
                        : 'No Experience selected'}
                    </LockedSurface>
                  ) : (
                    <ol className="aks-profile-journey-list">
                      {profile.professionalJourney.map((experience) => (
                        <li key={experience.id}>
                          <div className="aks-proof-stack">
                            <Heading level={3} size="sm">
                              {experience.title}
                            </Heading>
                            {experience.summary === null ? null : (
                              <Text tone="muted">{experience.summary}</Text>
                            )}
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </section>

                <section className="aks-profile-representative-systems">
                  <Heading level={2} size="sm">
                    {locale === 'fr'
                      ? 'Systèmes représentatifs'
                      : 'Representative Systems'}
                  </Heading>
                  {remainingSystems.length === 0 ? (
                    <LockedSurface className="aks-admin-profile-large-placeholder">
                      {locale === 'fr'
                        ? 'Aucun autre System sélectionné'
                        : 'No additional System selected'}
                    </LockedSurface>
                  ) : (
                    <div className="aks-profile-system-list">
                      {remainingSystems.map((reference) => (
                        <SystemReference
                          key={reference.id}
                          reference={reference}
                        />
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </details>

            <section className="aks-profile-languages-mobility">
              <Heading level={2} size="sm">
                {locale === 'fr' ? 'Langues et mobilité' : 'Languages & mobility'}
              </Heading>
              <div className="aks-admin-profile-facts-grid">
                <div className="aks-proof-stack">
                  <Heading level={3} size="sm">
                    {locale === 'fr' ? 'Langues' : 'Languages'}
                  </Heading>
                  {profile.languages.length === 0 ? (
                    <LockedSurface>
                      {locale === 'fr'
                        ? 'Aucune langue sélectionnée'
                        : 'No language selected'}
                    </LockedSurface>
                  ) : (
                    <ul className="aks-profile-fact-list">
                      {profile.languages.map((language) => (
                        <li key={language}>
                          <span className="aks-admin-profile-readonly-chip">
                            {locale === 'fr'
                              ? language === 'fr'
                                ? 'Français'
                                : language === 'en'
                                  ? 'Anglais'
                                  : 'Arabe'
                              : language === 'fr'
                                ? 'French'
                                : language === 'en'
                                  ? 'English'
                                  : 'Arabic'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="aks-proof-stack">
                  <Heading level={3} size="sm">
                    {locale === 'fr' ? 'Mobilité' : 'Mobility'}
                  </Heading>
                  {!profile.mobility.worldwide &&
                  !profile.mobility.remote &&
                  !profile.mobility.relocation ? (
                    <LockedSurface>
                      {locale === 'fr'
                        ? 'Aucune mobilité sélectionnée'
                        : 'No mobility option selected'}
                    </LockedSurface>
                  ) : (
                    <ul className="aks-profile-fact-list">
                      {profile.mobility.worldwide ? (
                        <li>
                          <span className="aks-admin-profile-readonly-chip">
                            {locale === 'fr' ? 'International' : 'Worldwide'}
                          </span>
                        </li>
                      ) : null}
                      {profile.mobility.remote ? (
                        <li>
                          <span className="aks-admin-profile-readonly-chip">
                            {locale === 'fr' ? 'À distance' : 'Remote'}
                          </span>
                        </li>
                      ) : null}
                      {profile.mobility.relocation ? (
                        <li>
                          <span className="aks-admin-profile-readonly-chip">
                            {locale === 'fr' ? 'Relocalisation' : 'Relocation'}
                          </span>
                        </li>
                      ) : null}
                    </ul>
                  )}
                </div>
              </div>
              <Text
                className="aks-admin-profile-structure-note"
                size="sm"
                tone="muted"
              >
                {locale === 'fr'
                  ? 'Langues, mobilité, preuves, médias et ordre sont des données structurées et se gèrent dans la section compacte sous la maquette.'
                  : 'Languages, mobility, evidence, media and ordering are structured data managed in the compact section below the page.'}
              </Text>
            </section>
          </div>
        </Container>
      </div>
    </Form>
  );
}
