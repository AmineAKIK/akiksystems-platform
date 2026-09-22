import { randomUUID } from 'node:crypto';

import { bootstrapOriaDomain } from '../oria-bootstrap.js';
import { createDatabase } from '../database.js';
import { databaseUrlFromEnv } from './env.js';

const db = createDatabase(databaseUrlFromEnv());

try {
  const mediaId = randomUUID();
  const result = await bootstrapOriaDomain(db, {
    media: {
      id: mediaId,
      storageKey: `qualification/browser/oria/${mediaId}.webp`,
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
