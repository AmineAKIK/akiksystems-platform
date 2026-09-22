import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { bootstrapTugeresDomain } from '../tugeres-bootstrap.js';
import { createDatabase } from '../database.js';
import { databaseUrlFromEnv } from './env.js';

const db = createDatabase(databaseUrlFromEnv());

try {
  const mediaId = randomUUID();
  const storageKey = `qualification/browser/tugeres/${mediaId}.webp`;
  const testRoot = process.env.ASSET_STORAGE_TEST_ROOT?.trim();

  if (!testRoot) {
    throw new Error('ASSET_STORAGE_TEST_ROOT is required for browser qualification.');
  }

  const fixture = await readFile(path.resolve(process.cwd(), 'apps/web/scripts/fixtures/tugeres-reference-menu.webp'));
  const target = path.resolve(testRoot, storageKey);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, fixture);
  const result = await bootstrapTugeresDomain(db, {
    media: {
      id: mediaId,
      storageKey,
      originalFilename: 'tugeres-reference-menu.webp',
      mimeType: 'image/webp',
      width: 1280,
      height: 720,
      byteSize: 82846,
    },
  });

  await db
    .insertInto('system_links')
    .values([
      {
        id: randomUUID(),
        system_id: result.systemId,
        kind: 'live',
        url: 'https://unsupported.example.test/live',
        position: 90,
      },
      {
        id: randomUUID(),
        system_id: result.systemId,
        kind: 'demo',
        url: 'https://unsupported.example.test/demo',
        position: 91,
      },
    ])
    .onConflict((conflict) => conflict.column('id').doNothing())
    .execute();

  process.stdout.write(
    `Tugeres browser qualification bootstrap ${result.created ? 'created' : 'reused'} System ${result.systemId}, including unsupported stored links for public-filter qualification.\n`,
  );
} finally {
  await db.destroy();
}
