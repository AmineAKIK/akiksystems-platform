import { getPublishedCredential } from '@akiksystems/db';
import { Container, Heading, Link, Text } from '@akiksystems/ui';
import { data, useLoaderData } from 'react-router';

import { requireLocale } from '../i18n/locales';
import { appDb } from '../lib/db.server';
import { buildLocalizedPublicMeta, buildNoIndexMeta } from '../lib/public-seo';

import type { Route } from './+types/credential-detail';

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
function requiredSlug(value: string | undefined): string {
  if (value === undefined || !slugPattern.test(value)) {
    throw new Response('Credential not found.', { status: 404 });
  }
  return value;
}

function credentialHref(locale: 'en' | 'fr', slug: string): string {
  return locale === 'fr'
    ? `/${locale}/apprentissage/justificatifs/${slug}`
    : `/${locale}/learning/credentials/${slug}`;
}

function trainingHref(locale: 'en' | 'fr', slug: string): string {
  return locale === 'fr'
    ? `/${locale}/apprentissage/${slug}`
    : `/${locale}/learning/${slug}`;
}

function kindLabel(kind: 'diploma' | 'title' | 'certification', locale: 'en' | 'fr') {
  const labels = {
    diploma: locale === 'fr' ? 'Diplôme' : 'Diploma',
    title: locale === 'fr' ? 'Titre' : 'Title',
    certification: locale === 'fr' ? 'Certification' : 'Certification',
  };
  return labels[kind];
}

export async function loader({ params }: Route.LoaderArgs) {
  const locale = requireLocale(params.locale);
  const slug = requiredSlug(params.slug);
  const credential = await getPublishedCredential(appDb, { locale, slug });

  if (credential === null) {
    throw new Response('Credential not found.', { status: 404 });
  }

  return data(
    {
      credential: {
        ...credential,
        publishedAt: credential.publishedAt.toISOString(),
      },
      localContext: {
        title: credential.title,
        alternateHref:
          credential.alternate === null
            ? null
            : credentialHref(
                credential.alternate.locale,
                credential.alternate.slug,
              ),
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

  const credential = loaderData.credential;
  return buildLocalizedPublicMeta({
    title: credential.title,
    description: credential.summary,
    locale: credential.locale,
    canonicalPath: credentialHref(credential.locale, credential.slug),
    alternate:
      credential.alternate === null
        ? null
        : {
            locale: credential.alternate.locale,
            path: credentialHref(
              credential.alternate.locale,
              credential.alternate.slug,
            ),
          },
  });
}

export default function CredentialDetailRoute() {
  const { credential } = useLoaderData<typeof loader>();
  const overviewHref =
    credential.locale === 'fr' ? '/fr/apprentissage' : '/en/learning';
  const paragraphs =
    credential.body
      ?.split(/\n\s*\n/)
      .map((part) => part.trim())
      .filter(Boolean) ?? [];

  return (
    <main className="aks-proof-page">
      <Container>
        <div className="aks-proof-stack">
          <section className="aks-proof-hero">
            <Text className="aks-proof-eyebrow" size="sm" tone="muted">
              {kindLabel(credential.kind, credential.locale)}
            </Text>
            <Heading level={1} size="lg">
              {credential.title}
            </Heading>
            <Text>{credential.summary}</Text>
            <Text size="sm" tone="muted">
              {credential.issuer}
              {credential.issuedOn === null ? '' : ` · ${credential.issuedOn}`}
            </Text>
          </section>

          {paragraphs.length > 0 ? (
            <section className="aks-proof-stack">
              <Heading level={2} size="sm">
                {credential.locale === 'fr' ? 'Détails' : 'Details'}
              </Heading>
              {paragraphs.map((paragraph) => (
                <Text key={paragraph}>{paragraph}</Text>
              ))}
            </section>
          ) : null}

          <section className="aks-proof-stack">
            <Heading level={2} size="sm">
              {credential.locale === 'fr' ? 'Preuves' : 'Evidence'}
            </Heading>
            <div className="aks-proof-actions">
              {credential.sourceAssetId !== null ? (
                <Link href={`${credentialHref(credential.locale, credential.slug)}/source`}>
                  {credential.locale === 'fr'
                    ? 'Ouvrir le document source'
                    : 'Open source document'}
                </Link>
              ) : null}
              {credential.verificationUrl !== null ? (
                <Link href={credential.verificationUrl}>
                  {credential.locale === 'fr'
                    ? 'Vérifier auprès de la source'
                    : 'Verify with issuer'}
                </Link>
              ) : null}
            </div>
            {credential.sourceAssetId === null &&
            credential.verificationUrl === null ? (
              <Text tone="muted">
                {credential.locale === 'fr'
                  ? 'Aucune preuve externe supplémentaire n’est publiée pour ce justificatif.'
                  : 'No additional external proof is published for this Credential.'}
              </Text>
            ) : null}
          </section>

          {credential.training !== null ? (
            <section className="aks-proof-stack">
              <Heading level={2} size="sm">
                {credential.locale === 'fr'
                  ? 'Contexte de formation'
                  : 'Training context'}
              </Heading>
              <Link
                href={trainingHref(
                  credential.locale,
                  credential.training.slug,
                )}
              >
                {credential.training.title}
              </Link>
            </section>
          ) : null}

          <Link href={overviewHref}>
            {credential.locale === 'fr'
              ? 'Retour à Apprentissage'
              : 'Back to Learning'}
          </Link>
        </div>
      </Container>
    </main>
  );
}
