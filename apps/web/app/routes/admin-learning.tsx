import { Container, Heading, Link, Text } from '@akiksystems/ui';
import { useLoaderData } from 'react-router';

import { requireAdminSession } from '../lib/admin.server';
import { appDb } from '../lib/db.server';

import type { Route } from './+types/admin-learning';

function localeCounts(rows: Array<{ locale: 'en' | 'fr' }>) {
  return {
    en: rows.filter((row) => row.locale === 'en').length,
    fr: rows.filter((row) => row.locale === 'fr').length,
  };
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdminSession(request);

  const [
    trainings,
    credentials,
    learningArtifacts,
    trainingPublications,
    credentialPublications,
    learningArtifactPublications,
  ] = await Promise.all([
    appDb.selectFrom('trainings').select('id').execute(),
    appDb
      .selectFrom('credentials')
      .select(['id', 'training_id'])
      .execute(),
    appDb
      .selectFrom('learning_artifacts')
      .select(['id', 'training_id', 'system_id', 'source_asset_id'])
      .execute(),
    appDb
      .selectFrom('training_publications')
      .select('locale')
      .execute(),
    appDb
      .selectFrom('credential_publications')
      .select('locale')
      .execute(),
    appDb
      .selectFrom('learning_artifact_publications')
      .select('locale')
      .execute(),
  ]);

  return {
    training: {
      total: trainings.length,
      published: localeCounts(trainingPublications),
    },
    credential: {
      total: credentials.length,
      connectedToTraining: credentials.filter(
        (credential) => credential.training_id !== null,
      ).length,
      standalone: credentials.filter(
        (credential) => credential.training_id === null,
      ).length,
      published: localeCounts(credentialPublications),
    },
    learningArtifact: {
      total: learningArtifacts.length,
      connectedToSystem: learningArtifacts.filter(
        (artifact) => artifact.system_id !== null,
      ).length,
      withSourceDocument: learningArtifacts.filter(
        (artifact) => artifact.source_asset_id !== null,
      ).length,
      published: localeCounts(learningArtifactPublications),
    },
  };
}

function PublicationSummary({
  en,
  fr,
}: {
  en: number;
  fr: number;
}) {
  return (
    <Text size="sm" tone="muted">
      Published snapshots · EN {en} · FR {fr}
    </Text>
  );
}

export default function AdminLearningRoute() {
  const data = useLoaderData<typeof loader>();

  return (
    <main className="aks-admin-shell">
      <Container>
        <div className="aks-proof-stack">
          <section className="aks-admin-card">
            <div className="aks-proof-stack">
              <Text className="aks-proof-eyebrow" size="sm" tone="muted">
                L5 · Learning
              </Text>
              <Heading level={1} size="md">
                Learning administration
              </Heading>
              <Text tone="muted">
                Training is context. Credentials and LearningArtifacts are
                evidence. Each domain keeps its own model, publication state,
                and editing surface instead of sharing a generic CMS document.
              </Text>
              <div className="aks-proof-actions">
                <Link href="/admin">Back to administration</Link>
                <Link href="/en/learning">Public Learning</Link>
              </div>
            </div>
          </section>

          <section className="aks-admin-domain-grid" aria-label="Learning domains">
            <article className="aks-admin-card">
              <div className="aks-proof-stack">
                <Text className="aks-proof-eyebrow" size="sm" tone="muted">
                  Context
                </Text>
                <Heading level={2} size="sm">
                  Trainings
                </Heading>
                <Text>
                  {data.training.total} Training
                  {data.training.total === 1 ? '' : 's'}
                </Text>
                <PublicationSummary {...data.training.published} />
                <Text tone="muted">
                  Provider, lifecycle, dates, localized context, ordering, and
                  independent EN/FR publication.
                </Text>
                <Link href="/admin/learning/trainings">
                  Manage Trainings
                </Link>
              </div>
            </article>

            <article className="aks-admin-card">
              <div className="aks-proof-stack">
                <Text className="aks-proof-eyebrow" size="sm" tone="muted">
                  Evidence
                </Text>
                <Heading level={2} size="sm">
                  Credentials
                </Heading>
                <Text>
                  {data.credential.total} Credential
                  {data.credential.total === 1 ? '' : 's'}
                </Text>
                <PublicationSummary {...data.credential.published} />
                <Text size="sm" tone="muted">
                  {data.credential.connectedToTraining} connected to Training ·{' '}
                  {data.credential.standalone} standalone
                </Text>
                <Text tone="muted">
                  Diplomas, titles, and certifications with optional Training,
                  source document, and issuer verification.
                </Text>
                <Link href="/admin/learning/credentials">
                  Manage Credentials
                </Link>
              </div>
            </article>

            <article className="aks-admin-card">
              <div className="aks-proof-stack">
                <Text className="aks-proof-eyebrow" size="sm" tone="muted">
                  Evidence
                </Text>
                <Heading level={2} size="sm">
                  LearningArtifacts
                </Heading>
                <Text>
                  {data.learningArtifact.total} LearningArtifact
                  {data.learningArtifact.total === 1 ? '' : 's'}
                </Text>
                <PublicationSummary {...data.learningArtifact.published} />
                <Text size="sm" tone="muted">
                  {data.learningArtifact.connectedToSystem} connected to System ·{' '}
                  {data.learningArtifact.withSourceDocument} with source document
                </Text>
                <Text tone="muted">
                  First-class learning evidence with required Training context
                  and optional System/source relationships.
                </Text>
                <Link href="/admin/learning/artifacts">
                  Manage LearningArtifacts
                </Link>
              </div>
            </article>
          </section>
        </div>
      </Container>
    </main>
  );
}
