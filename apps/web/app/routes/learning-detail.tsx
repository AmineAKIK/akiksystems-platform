import { getPublishedTraining } from '@akiksystems/db';
import { Container, Heading, Link, Text } from '@akiksystems/ui';
import { data, type MetaDescriptor, useLoaderData } from 'react-router';

import { requireLocale } from '../i18n/locales';
import { appDb } from '../lib/db.server';

import type { Route } from './+types/learning-detail';

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const canonicalOrigin = 'https://akiksystems.com';

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

export async function loader({ params }: Route.LoaderArgs) {
  const locale = requireLocale(params.locale);
  const slug = requiredSlug(params.slug);
  const training = await getPublishedTraining(appDb, { locale, slug });

  if (training === null) {
    throw new Response('Training not found.', { status: 404 });
  }

  return data(
    {
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

export function meta({ loaderData }: Route.MetaArgs): MetaDescriptor[] {
  if (loaderData === undefined) {
    return [{ title: 'Learning · AkikSystems' }];
  }

  const training = loaderData.training;
  const canonicalPath = trainingHref(training.locale, training.slug);
  const canonicalUrl = `${canonicalOrigin}${canonicalPath}`;
  const descriptors: MetaDescriptor[] = [
    { title: `${training.title} · AkikSystems` },
    { name: 'description', content: training.summary },
    { name: 'robots', content: 'index, follow, max-snippet:-1' },
    { tagName: 'link', rel: 'canonical', href: canonicalUrl },
    {
      tagName: 'link',
      rel: 'alternate',
      hrefLang: training.locale,
      href: canonicalUrl,
    },
  ];

  if (training.alternate !== null) {
    descriptors.push({
      tagName: 'link',
      rel: 'alternate',
      hrefLang: training.alternate.locale,
      href: `${canonicalOrigin}${trainingHref(
        training.alternate.locale,
        training.alternate.slug,
      )}`,
    });
  }

  return descriptors;
}

export default function LearningDetailRoute() {
  const { training } = useLoaderData<typeof loader>();
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
              {training.startDate ?? '—'} → {training.endDate ?? '—'} ·{' '}
              {training.state}
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
            <Text tone="muted">
              {training.locale === 'fr'
                ? 'Les preuves d’apprentissage restent des objets distincts de la formation. Elles seront reliées ici sans dupliquer le contexte.'
                : 'Learning evidence remains distinct from the Training context. Connected artifacts will appear here without duplicating the Training.'}
            </Text>
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
