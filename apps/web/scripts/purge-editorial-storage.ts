import { deleteAssetObject } from '../app/lib/asset-storage.server';
import { appDb } from '../app/lib/db.server';

try {
  const assets = await appDb
    .selectFrom('assets')
    .select(['id', 'storage_key'])
    .orderBy('created_at')
    .execute();

  for (const asset of assets) {
    await deleteAssetObject(asset.storage_key);
  }

  console.info(
    `[content-reset] deleted ${assets.length} tracked editorial asset object(s) from object storage.`,
  );
} finally {
  await appDb.destroy();
}
