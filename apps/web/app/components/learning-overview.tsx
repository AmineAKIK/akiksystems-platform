import { Container, Heading, Link, Text } from '@akiksystems/ui';

import type {
  PublishedCredentialListItem,
  PublishedLearningArtifactListItem,
  PublishedTrainingListItem,
} from '@akiksystems/db';

interface LearningOverviewProps {
  locale: 'en' | 'fr';
  trainings: Array<
    Omit<PublishedTrainingListItem, 'publishedAt'> & { publishedAt: string }
  >;
  credentials: Array<
    Omit<PublishedCredentialListItem, 'publishedAt'> & { publishedAt: string }
  >;
  learningArtifacts: Array<
    Omit<PublishedLearningArtifactListItem, 'publishedAt'> & {
      publishedAt: string;
    }
  >;
}

type Locale = LearningOverviewProps['locale'];

function dateRange(
  training: LearningOverviewProps['trainings'][number],
  locale: Locale,
) {
  if (training.startDate === null && training.endDate === null) {
    return locale === 'fr' ? 'Dates non renseignées' : 'Dates not specified';
  }
  if (training.startDate !== null && training.endDate !== null) {
    return `${training.startDate} → ${training.endDate}`;
  }
  return training.startDate ?? training.endDate ?? '';
}

function trainingHref(locale: Locale, slug: string) {
  return locale === 'fr'
    ? `/fr/apprentissage/${slug}`
    : `/en/learning/${slug}`;
}

function credentialHref(locale: Locale, slug: string) {
  return locale === 'fr'
    ? `/fr/apprentissage/justificatifs/${slug}`
    : `/en/learning/credentials/${slug}`;
}

function artifactHref(locale: Locale, slug: string) {
  return locale === 'fr'
    ? `/fr/apprentissage/preuves/${slug}`
    : `/en/learning/artifacts/${slug}`;
}

function stateLabel(
  state: LearningOverviewProps['trainings'][number]['state'],
  locale: Locale,
) {
  const labels = {
    planned: locale === 'fr' ? 'Prévue' : 'Planned',
    in_progress: locale === 'fr' ? 'En cours' : 'In progress',
    completed: locale === 'fr' ? 'Terminée' : 'Completed',
  } as const;

  return labels[state];
}

function credentialKindLabel(
  kind: LearningOverviewProps['credentials'][number]['kind'],
  locale: Locale,
) {
  const labels = {
    diploma: locale === 'fr' ? 'Diplôme' : 'Diploma',
    title: locale === 'fr' ? 'Titre' : 'Title',
    certification: locale === 'fr' ? 'Certification' : 'Certification',
  } as const;

  return labels[kind];
}

export function LearningOverview({
  locale,
  trainings,
  credentials,
  learningArtifacts,
}: LearningOverviewProps) {
  const trainingById = new Map(
    trainings.map((training) => [training.trainingId, training] as const),
  );
  const evidenceCount = credentials.length + learningArtifacts.length;

  return (
    <main className="aks-proof-page aks-learning-overview">
      <Container>
        <div className="aks-proof-stack aks-learning-overview-stack">
          <section className="aks-proof-hero aks-learning-overview-hero">
            <Text className="aks-proof-eyebrow" size="sm" tone="muted">
              {locale === 'fr'
                ? 'Apprentissage · contexte et preuves'
                : 'Learning · context and evidence'}
            </Text>
            <Heading level={1} size="lg">
              {locale === 'fr' ? 'Apprentissage' : 'Learning'}
            </Heading>
            <Text className="aks-learning-overview-intro">
              {locale === 'fr'
                ? 'Le parcours donne le contexte. Les productions, justificatifs et preuves restent inspectables comme des objets à part entière.'
                : 'The journey provides context. Productions, credentials, and evidence remain inspectable as first-class objects.'}
            </Text>
          </section>

          <section
            className="aks-learning-map"
            aria-labelledby="learning-map-heading"
          >
            <div className="aks-learning-section-heading">
              <Text className="aks-proof-eyebrow" size="sm" tone="muted">
                {locale === 'fr' ? 'Lecture rapide' : 'At a glance'}
              </Text>
              <Heading id="learning-map-heading" level={2} size="md">
                {locale === 'fr'
                  ? 'Deux niveaux, un même parcours'
                  : 'Two layers, one journey'}
              </Heading>
            </div>

            <div className="aks-learning-map-grid">
              <article className="aks-learning-map-card">
                <Text className="aks-proof-eyebrow" size="sm" tone="muted">
                  {locale === 'fr' ? 'Contexte' : 'Context'}
                </Text>
                <Heading level={3} size="sm">
                  {locale === 'fr' ? 'Parcours de formation' : 'Training journey'}
                </Heading>
                <Text>
                  {locale === 'fr'
                    ? 'Les formations expliquent le cadre, la période et la progression.'
                    : 'Trainings explain the setting, period, and progression.'}
                </Text>
                <Text size="sm" tone="muted">
                  {trainings.length}{' '}
                  {locale === 'fr'
                    ? trainings.length === 1
                      ? 'formation publiée'
                      : 'formations publiées'
                    : trainings.length === 1
                      ? 'published Training'
                      : 'published Trainings'}
                </Text>
              </article>

              <article className="aks-learning-map-card aks-learning-map-card-evidence">
                <Text className="aks-proof-eyebrow" size="sm" tone="muted">
                  {locale === 'fr' ? 'Preuves' : 'Evidence'}
                </Text>
                <Heading level={3} size="sm">
                  {locale === 'fr'
                    ? 'Productions et justificatifs'
                    : 'Productions and credentials'}
                </Heading>
                <Text>
                  {locale === 'fr'
                    ? 'Les preuves peuvent être inspectées directement, puis replacées dans leur contexte de formation.'
                    : 'Evidence can be inspected directly, then traced back to its Training context.'}
                </Text>
                <Text size="sm" tone="muted">
                  {evidenceCount}{' '}
                  {locale === 'fr'
                    ? evidenceCount === 1
                      ? 'preuve publiée'
                      : 'preuves publiées'
                    : evidenceCount === 1
                      ? 'published evidence object'
                      : 'published evidence objects'}
                </Text>
              </article>
            </div>
          </section>

          <section
            className="aks-proof-stack aks-learning-evidence-section"
            aria-labelledby="evidence-heading"
          >
            <div className="aks-learning-section-heading">
              <Text className="aks-proof-eyebrow" size="sm" tone="muted">
                {locale === 'fr' ? 'Inspection directe' : 'Direct inspection'}
              </Text>
              <Heading id="evidence-heading" level={2} size="md">
                {locale === 'fr'
                  ? 'Preuves à inspecter'
                  : 'Evidence to inspect'}
              </Heading>
              <Text tone="muted">
                {locale === 'fr'
                  ? 'Une preuve n’est pas enfouie dans une page de formation : elle garde sa propre URL et son propre niveau de détail.'
                  : 'Evidence is not buried inside a Training page: it keeps its own URL and inspection depth.'}
              </Text>
            </div>

            {evidenceCount === 0 ? (
              <Text tone="muted">
                {locale === 'fr'
                  ? 'Aucune preuve publiée pour le moment.'
                  : 'No published evidence yet.'}
              </Text>
            ) : (
              <div className="aks-learning-evidence-grid">
                {learningArtifacts.map((artifact) => {
                  const training =
                    artifact.trainingId === null
                      ? undefined
                      : trainingById.get(artifact.trainingId);

                  return (
                    <article
                      className="aks-learning-evidence-card"
                      data-evidence-kind="learning-artifact"
                      key={artifact.learningArtifactId}
                    >
                      <div className="aks-proof-stack">
                        <Text className="aks-proof-eyebrow" size="sm" tone="muted">
                          {locale === 'fr'
                            ? 'Production / preuve'
                            : 'Production / evidence'}
                        </Text>
                        <Heading level={3} size="sm">
                          {artifact.title}
                        </Heading>
                        <Text>{artifact.summary}</Text>
                        <Text size="sm" tone="muted">
                          {training === undefined
                            ? artifact.trainingId === null
                              ? locale === 'fr'
                                ? 'Preuve d’apprentissage autonome'
                                : 'Standalone learning evidence'
                              : locale === 'fr'
                                ? 'Contexte de formation non publié dans cette langue'
                                : 'Training context not published in this locale'
                            : locale === 'fr'
                              ? `Contexte · ${training.title}`
                              : `Context · ${training.title}`}
                        </Text>
                        <Link href={artifactHref(locale, artifact.slug)}>
                          {locale === 'fr'
                            ? 'Inspecter la preuve'
                            : 'Inspect evidence'}
                        </Link>
                      </div>
                    </article>
                  );
                })}

                {credentials.map((credential) => {
                  const training =
                    credential.trainingId === null
                      ? undefined
                      : trainingById.get(credential.trainingId);

                  return (
                    <article
                      className="aks-learning-evidence-card"
                      data-evidence-kind="credential"
                      key={credential.credentialId}
                    >
                      <div className="aks-proof-stack">
                        <Text className="aks-proof-eyebrow" size="sm" tone="muted">
                          {credentialKindLabel(credential.kind, locale)}
                        </Text>
                        <Heading level={3} size="sm">
                          {credential.title}
                        </Heading>
                        <Text>{credential.summary}</Text>
                        <Text size="sm" tone="muted">
                          {credential.issuer}
                          {training === undefined
                            ? credential.trainingId === null
                              ? locale === 'fr'
                                ? ' · Justificatif autonome'
                                : ' · Standalone Credential'
                              : locale === 'fr'
                                ? ' · Contexte de formation non publié'
                                : ' · Training context not published'
                            : locale === 'fr'
                              ? ` · Contexte · ${training.title}`
                              : ` · Context · ${training.title}`}
                        </Text>
                        <Link href={credentialHref(locale, credential.slug)}>
                          {locale === 'fr'
                            ? 'Inspecter le justificatif'
                            : 'Inspect Credential'}
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section
            className="aks-proof-stack aks-learning-training-section"
            aria-labelledby="training-heading"
          >
            <div className="aks-learning-section-heading">
              <Text className="aks-proof-eyebrow" size="sm" tone="muted">
                {locale === 'fr' ? 'Contexte' : 'Context'}
              </Text>
              <Heading id="training-heading" level={2} size="md">
                {locale === 'fr'
                  ? 'Parcours de formation'
                  : 'Training journey'}
              </Heading>
              <Text tone="muted">
                {locale === 'fr'
                  ? 'Chaque formation donne le cadre général et relie les preuves qui en sont issues.'
                  : 'Each Training provides the broader setting and connects the evidence produced within it.'}
              </Text>
            </div>

            {trainings.length === 0 ? (
              <Text tone="muted">
                {locale === 'fr'
                  ? 'Aucune formation publiée pour le moment.'
                  : 'No published Training yet.'}
              </Text>
            ) : (
              <div className="aks-learning-training-list">
                {trainings.map((training, index) => (
                  <article
                    className="aks-learning-training-card"
                    key={training.trainingId}
                  >
                    <Text className="aks-learning-training-index" size="sm" tone="muted">
                      {String(index + 1).padStart(2, '0')}
                    </Text>
                    <div className="aks-proof-stack">
                      <Text size="sm" tone="muted">
                        {training.provider} · {dateRange(training, locale)}
                      </Text>
                      <Heading level={3} size="sm">
                        {training.title}
                      </Heading>
                      <Text>{training.summary}</Text>
                      <Text size="sm" tone="muted">
                        {locale === 'fr' ? 'État' : 'State'} ·{' '}
                        {stateLabel(training.state, locale)}
                      </Text>
                      <Link href={trainingHref(locale, training.slug)}>
                        {locale === 'fr'
                          ? 'Explorer le contexte et les preuves liées'
                          : 'Explore context and connected evidence'}
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </Container>
    </main>
  );
}
