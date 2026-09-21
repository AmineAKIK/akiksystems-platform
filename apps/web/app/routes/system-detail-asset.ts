import { getPublishedSystem } from '@akiksystems/db';

import { requireLocale } from '../i18n/locales';
import { getAssetObject } from '../lib/asset-storage.server';
import { appDb } from '../lib/db.server';

import type { Route } from './+types/system-detail-asset';

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function loader({ params }: Route.LoaderArgs) {
  const locale = requireLocale(params.locale);
  const slug = params.slug;
  const assetId = params.assetId;

  if (
    slug === undefined ||
    assetId === undefined ||
    !slugPattern.test(slug) ||
    !uuidPattern.test(assetId)
  ) {
    throw new Response('Asset not found.', { status: 404 });
  }

  const db = appDb;

    const asset = await db
      .selectFrom('systems')
      .innerJoin(
        'system_localizations',
        'system_localizations.system_id',
        'systems.id',
      )
      .innerJoin(
        'system_assets',
        'system_assets.system_id',
        'systems.id',
      )
      .innerJoin('assets', 'assets.id', 'system_assets.asset_id')
      .select(['assets.storage_key', 'assets.mime_type'])
      .where('systems.lifecycle', '=', 'active')
      .where('system_localizations.locale', '=', locale)
      .where('system_localizations.slug', '=', slug)
      .where('system_localizations.editorial_state', '=', 'published')
      .where('assets.id', '=', assetId)
      .executeTakeFirst();

    if (asset === undefined) {
      throw new Response('Asset not found.', { status: 404 });
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
