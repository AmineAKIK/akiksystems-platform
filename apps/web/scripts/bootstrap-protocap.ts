import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';

import { bootstrapProtoCapDomain } from '@akiksystems/db';

import { deleteAssetObject, putAssetObject } from '../app/lib/asset-storage.server';
import { imageDimensions } from '../app/lib/image-dimensions.server';
import { appDb } from '../app/lib/db.server';

const existing = await appDb
  .selectFrom('system_localizations')
  .select('system_id')
  .where('locale', '=', 'en')
  .where('slug', '=', 'protocap')
  .executeTakeFirst();

if (existing !== undefined) {
  process.stdout.write(
    `ProtoCap bootstrap skipped: System already exists as ${existing.system_id}.\n`,
  );
  await appDb.destroy();
  process.exit(0);
}

const assetId = randomUUID();
const storageKey = `systems/protocap/${assetId}.png`;
const source = new URL('./fixtures/protocap-reference-cover.png', import.meta.url);
const bytes = await readFile(source);
const dimensions = imageDimensions('image/png', new Uint8Array(bytes));
if (dimensions === null) {
  throw new Error('Unable to read intrinsic media dimensions.');
}
const file = new File([bytes], 'protocap-reference-cover.png', {
  type: 'image/png',
});

try {
  await putAssetObject(storageKey, file);

  const result = await bootstrapProtoCapDomain(appDb, {
    media: {
      id: assetId,
      storageKey,
      originalFilename: file.name,
      mimeType: 'image/png',
      byteSize: file.size,
      width: dimensions.width,
      height: dimensions.height,
    },
  });

  if (!result.created) {
    await deleteAssetObject(storageKey);
    process.stdout.write(
      `ProtoCap bootstrap skipped after concurrent creation: ${result.systemId}.\n`,
    );
  } else {
    process.stdout.write(
      `ProtoCap bootstrap completed: ${result.systemId}.\n`,
    );
  }
} catch (error) {
  try {
    await deleteAssetObject(storageKey);
  } catch {
    // Best-effort compensation if the upload itself failed or storage is unavailable.
  }

  throw error;
} finally {
  await appDb.destroy();
}
