import { requireExactLocale } from '../i18n/locales';
import { getAssetObject } from '../lib/asset-storage.server';
import { appDb } from '../lib/db.server';

import type { Route } from './+types/profile-portrait';

export async function loader({ params }: Route.LoaderArgs) {
  const locale =
    params.locale === 'fr'
      ? requireExactLocale(params.locale, 'fr')
      : requireExactLocale(params.locale, 'en');

  const portrait = await appDb
    .selectFrom('profiles')
    .innerJoin('assets', 'assets.id', 'profiles.portrait_asset_id')
    .innerJoin(
      'asset_localizations',
      'asset_localizations.asset_id',
      'assets.id',
    )
    .select(['assets.storage_key', 'assets.mime_type'])
    .where('profiles.singleton_key', '=', 'public')
    .where('asset_localizations.locale', '=', locale)
    .executeTakeFirst();

  if (portrait === undefined) {
    throw new Response('Portrait not found.', { status: 404 });
  }

  const stored = await getAssetObject(portrait.storage_key);

  return new Response(stored.body, {
    headers: {
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
      'Content-Type': portrait.mime_type,
      'Content-Disposition': 'inline',
    },
  });
}
