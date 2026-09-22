import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';

import { bootstrapTugeresDomain } from '@akiksystems/db';

import { deleteAssetObject, putAssetObject } from '../app/lib/asset-storage.server';
import { imageDimensions } from '../app/lib/image-dimensions.server';
import { appDb } from '../app/lib/db.server';

const existing = await appDb
  .selectFrom('system_localizations')
  .select('system_id')
  .where('locale', '=', 'en')
  .where('slug', '=', 'tugeres')
  .executeTakeFirst();

if (existing !== undefined) {
  process.stdout.write(
    `Tugeres bootstrap skipped: System already exists as ${existing.system_id}.\n`,
  );
  await appDb.destroy();
  process.exit(0);
}

const assetId = randomUUID();
const storageKey = `systems/tugeres/${assetId}.webp`;
const source = new URL('./fixtures/tugeres-reference-menu.webp', import.meta.url);
const bytes = await readFile(source);
const dimensions = imageDimensions('image/webp', new Uint8Array(bytes));
if (dimensions === null) {
  throw new Error('Unable to read intrinsic media dimensions.');
}
const file = new File([bytes], 'tugeres-reference-menu.webp', {
  type: 'image/webp',
});

try {
  await putAssetObject(storageKey, file);

  const result = await bootstrapTugeresDomain(appDb, {
    media: {
      id: assetId,
      storageKey,
      originalFilename: file.name,
      mimeType: 'image/webp',
      byteSize: file.size,
      width: dimensions.width,
      height: dimensions.height,
    },
  });

  if (!result.created) {
    await deleteAssetObject(storageKey);
    process.stdout.write(
      `Tugeres bootstrap skipped after concurrent creation: ${result.systemId}.\n`,
    );
  } else {
    process.stdout.write(`Tugeres bootstrap completed: ${result.systemId}.\n`);
  }
} catch (error) {
  try {
    await deleteAssetObject(storageKey);
  } catch {
    // Best-effort compensation if upload or storage is unavailable.
  }
  throw error;
} finally {
  await appDb.destroy();
}
