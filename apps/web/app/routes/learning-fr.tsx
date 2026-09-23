import {
  listPublishedCredentials,
  listPublishedLearningArtifacts,
  listPublishedTrainings,
} from '@akiksystems/db';
import { data, type MetaDescriptor, useLoaderData } from 'react-router';

import { LearningOverview } from '../components/learning-overview';
import { requireExactLocale } from '../i18n/locales';
import { appDb } from '../lib/db.server';

import type { Route } from './+types/learning-fr';

export async function loader({ params }: Route.LoaderArgs) {
  const locale = requireExactLocale(params.locale, 'fr');
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
        alternateHref: '/en/learning',
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
    { title: 'Apprentissage · AkikSystems' },
    {
      name: 'description',
      content:
        'Contexte de formation et preuves d’apprentissage inspectables chez AkikSystems.',
    },
  ];
}

export default function LearningFrRoute() {
  const { credentials, learningArtifacts, trainings } =
    useLoaderData<typeof loader>();
  return (
    <LearningOverview
      credentials={credentials}
      learningArtifacts={learningArtifacts}
      locale="fr"
      trainings={trainings}
    />
  );
}
