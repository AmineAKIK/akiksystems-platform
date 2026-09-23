import { getPublishedLearningArtifact } from '@akiksystems/db';
import { Container, Heading, Link, Text } from '@akiksystems/ui';
import { data, useLoaderData } from 'react-router';

import {
  isSentinelDossierArtifact,
  SentinelDossierPresentation,
} from '../components/sentinel-dossier-presentation';
import { requireLocale } from '../i18n/locales';
import { appDb } from '../lib/db.server';
import { buildLocalizedPublicMeta, buildNoIndexMeta } from '../lib/public-seo';

import type { Route } from './+types/learning-artifact-detail';

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
function requiredSlug(value: string | undefined): string {
  if (value === undefined || !slugPattern.test(value)) {
    throw new Response('Learning artifact not found.', { status: 404 });
  }
  return value;
}

function artifactHref(locale: 'en' | 'fr', slug: string): string {
  return locale === 'fr'
    ? `/${locale}/apprentissage/preuves/${slug}`
    : `/${locale}/learning/artifacts/${slug}`;
}

function trainingHref(locale: 'en' | 'fr', slug: string): string {
  return locale === 'fr'
    ? `/${locale}/apprentissage/${slug}`
    : `/${locale}/learning/${slug}`;
}

export async function loader({ params }: Route.LoaderArgs) {
  const locale = requireLocale(params.locale);
  const slug = requiredSlug(params.slug);
  const artifact = await getPublishedLearningArtifact(appDb, { locale, slug });

  if (artifact === null) {
    throw new Response('Learning artifact not found.', { status: 404 });
  }

  return data(
    {
      artifact: {
        ...artifact,
        publishedAt: artifact.publishedAt.toISOString(),
      },
      localContext: {
        title: artifact.title,
        alternateHref:
          artifact.alternate === null
            ? null
            : artifactHref(artifact.alternate.locale, artifact.alternate.slug),
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

  const artifact = loaderData.artifact;
  return buildLocalizedPublicMeta({
    title: artifact.title,
    description: artifact.summary,
    locale: artifact.locale,
    canonicalPath: artifactHref(artifact.locale, artifact.slug),
    alternate:
      artifact.alternate === null
        ? null
        : {
            locale: artifact.alternate.locale,
            path: artifactHref(
              artifact.alternate.locale,
              artifact.alternate.slug,
            ),
          },
  });
}

export default function LearningArtifactDetailRoute() {
  const { artifact } = useLoaderData<typeof loader>();
  const overviewHref =
    artifact.locale === 'fr' ? '/fr/apprentissage' : '/en/learning';
  const sourceHref = `${artifactHref(artifact.locale, artifact.slug)}/source`;

  if (isSentinelDossierArtifact(artifact.locale, artifact.slug)) {
    return (
      <SentinelDossierPresentation
        artifact={artifact}
        overviewHref={overviewHref}
        sourceHref={sourceHref}
      />
    );
  }

  const paragraphs =
    artifact.body
      ?.split(/\n\s*\n/)
      .map((part) => part.trim())
      .filter(Boolean) ?? [];

  return (
    <main className="aks-proof-page">
      <Container>
        <div className="aks-proof-stack">
          <section className="aks-proof-hero">
            <Text className="aks-proof-eyebrow" size="sm" tone="muted">
              {artifact.locale === 'fr'
                ? 'Preuve d’apprentissage'
                : 'Learning artifact'}
            </Text>
            <Heading level={1} size="lg">
              {artifact.title}
            </Heading>
            <Text>{artifact.summary}</Text>
          </section>

          {paragraphs.length > 0 ? (
            <section className="aks-proof-stack">
              <Heading level={2} size="sm">
                {artifact.locale === 'fr' ? 'Inspection' : 'Inspection'}
              </Heading>
              {paragraphs.map((paragraph) => (
                <Text key={paragraph}>{paragraph}</Text>
              ))}
            </section>
          ) : null}

          <section className="aks-proof-stack">
            <Heading level={2} size="sm">
              {artifact.locale === 'fr' ? 'Contexte' : 'Context'}
            </Heading>
            {artifact.training !== null ? (
              <div className="aks-proof-stack">
                <Text size="sm" tone="muted">
                  {artifact.locale === 'fr' ? 'Formation' : 'Training'}
                </Text>
                <Link
                  href={trainingHref(
                    artifact.locale,
                    artifact.training.slug,
                  )}
                >
                  {artifact.training.title}
                </Link>
              </div>
            ) : (
              <Text tone="muted">
                {artifact.locale === 'fr'
                  ? 'Le contexte de formation lié n’est pas publié dans cette langue.'
                  : 'The connected Training context is not published in this locale.'}
              </Text>
            )}

            {artifact.system !== null ? (
              <div className="aks-proof-stack">
                <Text size="sm" tone="muted">
                  System
                </Text>
                <Link href={artifact.system.href}>{artifact.system.title}</Link>
              </div>
            ) : null}
          </section>

          {artifact.sourceAssetId !== null ? (
            <section className="aks-proof-stack">
              <Heading level={2} size="sm">
                {artifact.locale === 'fr' ? 'Source' : 'Source'}
              </Heading>
              <Link href={sourceHref}>
                {artifact.locale === 'fr'
                  ? 'Ouvrir le document source'
                  : 'Open source document'}
              </Link>
            </section>
          ) : null}

          <Link href={overviewHref}>
            {artifact.locale === 'fr'
              ? 'Retour à Apprentissage'
              : 'Back to Learning'}
          </Link>
        </div>
      </Container>
    </main>
  );
}
