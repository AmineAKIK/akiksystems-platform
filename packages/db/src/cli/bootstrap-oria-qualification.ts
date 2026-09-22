import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { bootstrapOriaDomain } from '../oria-bootstrap.js';
import { createDatabase } from '../database.js';
import { databaseUrlFromEnv } from './env.js';

const db = createDatabase(databaseUrlFromEnv());

try {
  const mediaId = randomUUID();
  const storageKey = `qualification/browser/oria/${mediaId}.webp`;
  const testRoot = process.env.ASSET_STORAGE_TEST_ROOT?.trim();

  if (!testRoot) {
    throw new Error('ASSET_STORAGE_TEST_ROOT is required for browser qualification.');
  }

  const fixture = await readFile(
    new URL('../../../../apps/web/scripts/fixtures/oria-reference-collations.webp', import.meta.url),
  );
  const target = path.resolve(testRoot, storageKey);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, fixture);
  const result = await bootstrapOriaDomain(db, {
    media: {
      id: mediaId,
      storageKey,
      originalFilename: 'oria-reference-collations.webp',
      mimeType: 'image/webp',
      width: 1280,
      height: 720,
      byteSize: 97042,
    },
  });

  process.stdout.write(
    `Oria browser qualification bootstrap ${result.created ? 'created' : 'reused'} System ${result.systemId}.\n`,
  );
} finally {
  await db.destroy();
}
