import { getPublicProfile } from '@akiksystems/db';

import { requireExactLocale } from '../i18n/locales';
import { getAssetObject } from '../lib/asset-storage.server';
import { appDb } from '../lib/db.server';

import type { Route } from './+types/profile-portrait';

export async function loader({ params }: Route.LoaderArgs) {
  const locale = requireExactLocale(params.locale, 'en');
  const profile = await getPublicProfile(appDb, locale);
  const assetId = profile?.portraitAssetId ?? null;

  if (assetId === null) {
    throw new Response('Portrait not found.', { status: 404 });
  }

  const asset = await appDb
    .selectFrom('assets')
    .select(['storage_key', 'mime_type'])
    .where('id', '=', assetId)
    
    .executeTakeFirst();

  if (asset === undefined) {
    throw new Response('Portrait not found.', { status: 404 });
  }

  const stored = await getAssetObject(asset.storage_key);

  return new Response(stored.body, {
    headers: {
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
      'Content-Type': asset.mime_type,
      'Content-Disposition': 'inline',
    },
  });
}
