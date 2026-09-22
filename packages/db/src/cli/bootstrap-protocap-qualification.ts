import { randomUUID } from 'node:crypto';

import { bootstrapProtoCapDomain } from '../protocap-bootstrap.js';
import { createDatabase } from '../database.js';
import { databaseUrlFromEnv } from './env.js';

const db = createDatabase(databaseUrlFromEnv());

try {
  const mediaId = randomUUID();
  const result = await bootstrapProtoCapDomain(db, {
    media: {
      id: mediaId,
      storageKey: `qualification/browser/protocap/${mediaId}.png`,
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
