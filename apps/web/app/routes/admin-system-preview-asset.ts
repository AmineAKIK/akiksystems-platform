import { getPublishedSystem } from '@akiksystems/db';

import { requireAdminSession } from '../lib/admin.server';
import { appDb } from '../lib/db.server';
import { getAssetObject } from '../lib/asset-storage.server';

import type { Route } from './+types/admin-system-preview-asset';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireAdminSession(request);

  const systemId = params.systemId;
  const assetId = params.assetId;

  if (
    systemId === undefined ||
    assetId === undefined ||
    !uuidPattern.test(systemId) ||
    !uuidPattern.test(assetId)
  ) {
    throw new Response('Asset not found.', { status: 404 });
  }

  const db = appDb;

    const asset = await db
      .selectFrom('system_assets')
      .innerJoin('assets', 'assets.id', 'system_assets.asset_id')
      .select([
        'assets.storage_key',
        'assets.mime_type',
        'assets.original_filename',
      ])
      .where('system_assets.system_id', '=', systemId)
      .where('system_assets.asset_id', '=', assetId)
      .executeTakeFirst();

    if (asset === undefined) {
      throw new Response('Asset not found.', { status: 404 });
    }

    const stored = await getAssetObject(asset.storage_key);

    return new Response(stored.body, {
      headers: {
        'Cache-Control': 'private, no-store, max-age=0',
        'Content-Type': asset.mime_type,
        'Content-Disposition': 'inline',
        'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet',
      },
    });
}
