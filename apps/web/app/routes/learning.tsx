import {
  listPublishedCredentials,
  listPublishedLearningArtifacts,
  listPublishedTrainings,
} from '@akiksystems/db';
import { data, type MetaDescriptor, useLoaderData } from 'react-router';

import { LearningOverview } from '../components/learning-overview';
import { requireExactLocale } from '../i18n/locales';
import { appDb } from '../lib/db.server';

import type { Route } from './+types/learning';

export async function loader({ params }: Route.LoaderArgs) {
  const locale = requireExactLocale(params.locale, 'en');
  const [credentials, learningArtifacts, trainings] = await Promise.all([
    listPublishedCredentials(appDb, locale),
    listPublishedLearningArtifacts(appDb, locale),
    listPublishedTrainings(appDb, locale),
  ]);

  return data(
    {
      locale,
      credentials: credentials.map((credential) => ({
        ...credential,
        publishedAt: credential.publishedAt.toISOString(),
      })),
      learningArtifacts: learningArtifacts.map((artifact) => ({
        ...artifact,
        publishedAt: artifact.publishedAt.toISOString(),
      })),
      trainings: trainings.map((training) => ({
        ...training,
        publishedAt: training.publishedAt.toISOString(),
      })),
      localContext: {
        title: null,
        alternateHref: '/fr/apprentissage',
      },
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      },
    },
  );
}

export function meta(): MetaDescriptor[] {
  return [
    { title: 'Learning · AkikSystems' },
    {
      name: 'description',
      content: 'Training context and inspectable learning evidence at AkikSystems.',
    },
  ];
}

export default function LearningRoute() {
  const { credentials, learningArtifacts, trainings } =
    useLoaderData<typeof loader>();
  return (
    <LearningOverview
      credentials={credentials}
      learningArtifacts={learningArtifacts}
      locale="en"
      trainings={trainings}
    />
  );
}
