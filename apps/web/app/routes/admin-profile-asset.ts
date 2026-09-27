import { requireAdminSession } from '../lib/admin.server';
import { getAssetObject } from '../lib/asset-storage.server';
import { appDb } from '../lib/db.server';

import type { Route } from './+types/admin-profile-asset';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireAdminSession(request);

  const assetId = params.assetId;
  if (assetId === undefined || !uuidPattern.test(assetId)) {
    throw new Response('Profile asset not found.', { status: 404 });
  }

  const profile = await appDb
    .selectFrom('profiles')
    .select(['portrait_asset_id', 'source_cv_asset_id'])
    .where('singleton_key', '=', 'public')
    .executeTakeFirstOrThrow();

  if (
    assetId !== profile.portrait_asset_id &&
    assetId !== profile.source_cv_asset_id
  ) {
    throw new Response('Profile asset not found.', { status: 404 });
  }

  const asset = await appDb
    .selectFrom('assets')
    .select(['storage_key', 'mime_type', 'original_filename'])
    .where('id', '=', assetId)
    .executeTakeFirst();

  if (asset === undefined) {
    throw new Response('Profile asset not found.', { status: 404 });
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
