import { getPublishedLearningArtifact } from '@akiksystems/db';

import { requireLocale } from '../i18n/locales';
import { getAssetObject } from '../lib/asset-storage.server';
import { appDb } from '../lib/db.server';

import type { Route } from './+types/learning-artifact-source';

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const sourceRobotsDirective = 'noindex, noarchive, nosnippet';

function sourceNotFound(message: string): Response {
  return new Response(message, {
    status: 404,
    headers: {
      'X-Robots-Tag': sourceRobotsDirective,
    },
  });
}

export async function loader({ params }: Route.LoaderArgs) {
  const locale = requireLocale(params.locale);
  const slug = params.slug;
  if (slug === undefined || !slugPattern.test(slug)) {
    throw sourceNotFound('Learning artifact source not found.');
  }

  const artifact = await getPublishedLearningArtifact(appDb, { locale, slug });
  if (artifact === null || artifact.sourceAssetId === null) {
    throw sourceNotFound('Learning artifact source not found.');
  }

  const asset = await appDb
    .selectFrom('assets')
    .select(['storage_key', 'mime_type', 'original_filename'])
    .where('id', '=', artifact.sourceAssetId)
    .where('mime_type', '=', 'application/pdf')
    .executeTakeFirst();

  if (asset === undefined) {
    throw sourceNotFound('Learning artifact source not found.');
  }

  const stored = await getAssetObject(asset.storage_key);
  const safeFilename = asset.original_filename.replace(/[\r\n"]/g, '_');

  return new Response(stored.body, {
    headers: {
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
      'Content-Type': asset.mime_type,
      'Content-Disposition': `inline; filename="${safeFilename}"`,
      'X-Robots-Tag': sourceRobotsDirective,
    },
  });
}
