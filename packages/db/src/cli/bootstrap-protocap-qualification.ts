import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { bootstrapProtoCapDomain } from '../protocap-bootstrap.js';
import { createDatabase } from '../database.js';
import { databaseUrlFromEnv } from './env.js';

const db = createDatabase(databaseUrlFromEnv());

try {
  const mediaId = randomUUID();
  const storageKey = `qualification/browser/protocap/${mediaId}.png`;
  const testRoot = process.env.ASSET_STORAGE_TEST_ROOT?.trim();

  if (!testRoot) {
    throw new Error('ASSET_STORAGE_TEST_ROOT is required for browser qualification.');
  }

  const fixture = await readFile(path.resolve(process.cwd(), 'apps/web/scripts/fixtures/protocap-reference-cover.png'));
  const target = path.resolve(testRoot, storageKey);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, fixture);
  const result = await bootstrapProtoCapDomain(db, {
    media: {
      id: mediaId,
      storageKey,
      originalFilename: 'protocap-reference-cover.png',
      mimeType: 'image/png',
      width: 1280,
      height: 720,
      byteSize: 109020,
    },
  });

  process.stdout.write(
    `ProtoCap browser qualification bootstrap ${result.created ? 'created' : 'reused'} System ${result.systemId}.\n`,
  );
} finally {
  await db.destroy();
}
