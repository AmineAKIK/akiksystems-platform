import { randomUUID } from 'node:crypto';

import { bootstrapTugeresDomain } from '../tugeres-bootstrap.js';
import { createDatabase } from '../database.js';
import { databaseUrlFromEnv } from './env.js';

const db = createDatabase(databaseUrlFromEnv());

try {
  const mediaId = randomUUID();
  const result = await bootstrapTugeresDomain(db, {
    media: {
      id: mediaId,
      storageKey: `qualification/browser/tugeres/${mediaId}.webp`,
      originalFilename: 'tugeres-reference-menu.webp',
      mimeType: 'image/webp',
      byteSize: 82846,
    },
  });

  process.stdout.write(
    `Tugeres browser qualification bootstrap ${result.created ? 'created' : 'reused'} System ${result.systemId}.\n`,
  );
} finally {
  await db.destroy();
}
