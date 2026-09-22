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
