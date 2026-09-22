import { requireExactLocale } from '../i18n/locales';
import { getAssetObject } from '../lib/asset-storage.server';
import { appDb } from '../lib/db.server';

import type { Route } from './+types/profile-cv';

export async function loader({ params }: Route.LoaderArgs) {
  requireExactLocale(params.locale, 'en');

  const cv = await appDb
    .selectFrom('profiles')
    .innerJoin('assets', 'assets.id', 'profiles.source_cv_asset_id')
    .select([
      'assets.storage_key',
      'assets.mime_type',
      'assets.original_filename',
    ])
    .where('profiles.singleton_key', '=', 'public')
    .where('assets.mime_type', '=', 'application/pdf')
    .executeTakeFirst();

  if (cv === undefined) {
    throw new Response('CV not found.', { status: 404 });
  }

  const stored = await getAssetObject(cv.storage_key);

  return new Response(stored.body, {
    headers: {
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
      'Content-Type': cv.mime_type,
      'Content-Disposition': `inline; filename="${cv.original_filename.replaceAll('"', '')}"`,
    },
  });
}
