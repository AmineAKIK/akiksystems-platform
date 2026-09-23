import {
  getPublishedTraining,
  listPublishedCredentialsForTraining,
  listPublishedLearningArtifactsForTraining,
} from '@akiksystems/db';
import { Container, Heading, Link, Text } from '@akiksystems/ui';
import { data, useLoaderData } from 'react-router';

import { requireLocale } from '../i18n/locales';
import { appDb } from '../lib/db.server';
import { buildLocalizedPublicMeta, buildNoIndexMeta } from '../lib/public-seo';

import type { Route } from './+types/learning-detail';

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
function requiredSlug(value: string | undefined): string {
  if (value === undefined || !slugPattern.test(value)) {
    throw new Response('Training not found.', { status: 404 });
  }
  return value;
}

function trainingHref(locale: 'en' | 'fr', slug: string): string {
  return locale === 'fr'
    ? `/${locale}/apprentissage/${slug}`
    : `/${locale}/learning/${slug}`;
}


function trainingDateRange(
  training: {
    locale: 'en' | 'fr';
    startDate: string | null;
    endDate: string | null;
  },
): string {
  if (training.startDate === null && training.endDate === null) {
    return training.locale === 'fr'
      ? 'Dates non renseignées'
      : 'Dates not specified';
  }

  if (training.startDate !== null && training.endDate !== null) {
    return `${training.startDate} → ${training.endDate}`;
  }

  if (training.startDate !== null) {
    return training.locale === 'fr'
      ? `Depuis ${training.startDate}`
      : `Since ${training.startDate}`;
  }

  return training.locale === 'fr'
    ? `Jusqu’au ${training.endDate}`
    : `Until ${training.endDate}`;
}

function trainingStateLabel(
  state: 'planned' | 'in_progress' | 'completed',
  locale: 'en' | 'fr',
): string {
  const labels = {
    planned: locale === 'fr' ? 'Prévue' : 'Planned',
    in_progress: locale === 'fr' ? 'En cours' : 'In progress',
    completed: locale === 'fr' ? 'Terminée' : 'Completed',
  } as const;

  return labels[state];
}

export async function loader({ params }: Route.LoaderArgs) {
  const locale = requireLocale(params.locale);
  const slug = requiredSlug(params.slug);
  const training = await getPublishedTraining(appDb, { locale, slug });

  if (training === null) {
    throw new Response('Training not found.', { status: 404 });
  }

  const [credentials, learningArtifacts] = await Promise.all([
    listPublishedCredentialsForTraining(appDb, {
      locale,
      trainingId: training.trainingId,
    }),
    listPublishedLearningArtifactsForTraining(appDb, {
      locale,
      trainingId: training.trainingId,
    }),
  ]);

  return data(
    {
      credentials: credentials.map((credential) => ({
        ...credential,
        publishedAt: credential.publishedAt.toISOString(),
      })),
      learningArtifacts: learningArtifacts.map((artifact) => ({
        ...artifact,
        publishedAt: artifact.publishedAt.toISOString(),
      })),
      training: {
        ...training,
        publishedAt: training.publishedAt.toISOString(),
      },
      localContext: {
        title: training.title,
        alternateHref:
          training.alternate === null
            ? null
            : trainingHref(training.alternate.locale, training.alternate.slug),
      },
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      },
    },
  );
}

export function meta({ loaderData }: Route.MetaArgs) {
  if (loaderData === undefined) {
    return buildNoIndexMeta('Learning · AkikSystems');
  }

  const training = loaderData.training;
  return buildLocalizedPublicMeta({
    title: training.title,
    description: training.summary,
    locale: training.locale,
    canonicalPath: trainingHref(training.locale, training.slug),
    alternate:
      training.alternate === null
        ? null
        : {
            locale: training.alternate.locale,
            path: trainingHref(
              training.alternate.locale,
              training.alternate.slug,
            ),
          },
  });
}

export default function LearningDetailRoute() {
  const { credentials, learningArtifacts, training } =
    useLoaderData<typeof loader>();
  const overviewHref =
    training.locale === 'fr' ? '/fr/apprentissage' : '/en/learning';
  const paragraphs =
    training.body
      ?.split(/\n\s*\n/)
      .map((part) => part.trim())
      .filter(Boolean) ?? [];

  return (
    <main className="aks-proof-page">
      <Container>
        <div className="aks-proof-stack">
          <section className="aks-proof-hero">
            <Text className="aks-proof-eyebrow" size="sm" tone="muted">
              {training.provider}
            </Text>
            <Heading level={1} size="lg">
              {training.title}
            </Heading>
            <Text>{training.summary}</Text>
            <Text size="sm" tone="muted">
              {trainingDateRange(training)} ·{' '}
              {trainingStateLabel(training.state, training.locale)}
            </Text>
          </section>

          {paragraphs.length > 0 ? (
            <section className="aks-proof-stack">
              <Heading level={2} size="sm">
                {training.locale === 'fr' ? 'Contexte' : 'Context'}
              </Heading>
              {paragraphs.map((paragraph) => (
                <Text key={paragraph}>{paragraph}</Text>
              ))}
            </section>
          ) : null}

          <section className="aks-proof-stack">
            <Heading level={2} size="sm">
              {training.locale === 'fr'
                ? 'Preuves liées'
                : 'Connected evidence'}
            </Heading>
            {credentials.length === 0 && learningArtifacts.length === 0 ? (
              <Text tone="muted">
                {training.locale === 'fr'
                  ? 'Aucune preuve publiée n’est encore reliée à cette formation.'
                  : 'No published evidence is connected to this Training yet.'}
              </Text>
            ) : (
              <div className="aks-admin-asset-list">
                {credentials.map((credential) => (
                  <article className="aks-admin-asset" key={credential.credentialId}>
                    <div className="aks-proof-stack">
                      <Text size="sm" tone="muted">
                        {credential.kind} · {credential.issuer}
                      </Text>
                      <Heading level={3} size="sm">
                        {credential.title}
                      </Heading>
                      <Text>{credential.summary}</Text>
                      <Link
                        href={
                          training.locale === 'fr'
                            ? `/fr/apprentissage/justificatifs/${credential.slug}`
                            : `/en/learning/credentials/${credential.slug}`
                        }
                      >
                        {training.locale === 'fr'
                          ? 'Inspecter le justificatif'
                          : 'Inspect Credential'}
                      </Link>
                    </div>
                  </article>
                ))}

                {learningArtifacts.map((artifact) => (
                  <article className="aks-admin-asset" key={artifact.learningArtifactId}>
                    <div className="aks-proof-stack">
                      <Text size="sm" tone="muted">
                        {training.locale === 'fr'
                          ? 'Preuve d’apprentissage'
                          : 'Learning artifact'}
                      </Text>
                      <Heading level={3} size="sm">
                        {artifact.title}
                      </Heading>
                      <Text>{artifact.summary}</Text>
                      <Link
                        href={
                          training.locale === 'fr'
                            ? `/fr/apprentissage/preuves/${artifact.slug}`
                            : `/en/learning/artifacts/${artifact.slug}`
                        }
                      >
                        {training.locale === 'fr'
                          ? 'Inspecter la preuve'
                          : 'Inspect learning artifact'}
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <Link href={overviewHref}>
            {training.locale === 'fr'
              ? 'Retour à Apprentissage'
              : 'Back to Learning'}
          </Link>
        </div>
      </Container>
    </main>
  );
}
