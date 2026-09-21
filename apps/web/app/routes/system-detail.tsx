import { createDatabase, getPublishedSystem } from '@akiksystems/db';
import { data, useLoaderData } from 'react-router';

import { SystemDetailView } from '../components/system-detail-view';
import { requireLocale } from '../i18n/locales';
import { authEnv } from '../lib/auth.server';

import type { Route } from './+types/system-detail';

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function requiredSlug(value: string | undefined): string {
  if (value === undefined || !slugPattern.test(value)) {
    throw new Response('System not found.', { status: 404 });
  }

  return value;
}

export async function loader({ params }: Route.LoaderArgs) {
  const locale = requireLocale(params.locale);
  const slug = requiredSlug(params.slug);
  const db = createDatabase(authEnv.DATABASE_URL);

  try {
    const system = await getPublishedSystem(db, { locale, slug });

    if (system === null) {
      throw new Response('System not found.', { status: 404 });
    }

    return data(
      {
        system: {
          ...system,
          publishedAt: system.publishedAt.toISOString(),
          media: system.media.map((asset) => ({
            ...asset,
            url: `/${locale}/systems/${slug}/assets/${asset.id}`,
          })),
        },
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
        },
      },
    );
  } finally {
    await db.destroy();
  }
}

export default function SystemDetailRoute() {
  const { system } = useLoaderData<typeof loader>();

  return (
    <SystemDetailView
      assets={system.media}
      links={system.links}
      locale={system.locale}
      originSummary={system.origin?.summary ?? null}
      originTitle={system.origin?.title ?? null}
      presentationDocument={system.presentationDocument}
      summary={system.summary}
      technologies={system.technologies}
      title={system.title}
    />
  );
}
