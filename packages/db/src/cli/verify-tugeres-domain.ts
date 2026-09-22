import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';

import { bootstrapTugeresDomain } from '../tugeres-bootstrap.js';
import { getPublishedSystem, listPublishedSystems } from '../public-system.js';
import { createDatabase } from '../database.js';
import { databaseUrlFromEnv } from './env.js';
import { createMigrator, reportMigrationResults } from './migrator.js';

const db = createDatabase(databaseUrlFromEnv());
const mediaId = randomUUID();
let systemId: string | null = null;

try {
  const migrationResult = await createMigrator(db).migrateToLatest();
  reportMigrationResults(migrationResult.results);

  if (migrationResult.error !== undefined) {
    throw migrationResult.error;
  }

  const bootstrap = await bootstrapTugeresDomain(db, {
    media: {
      id: mediaId,
      storageKey: `qualification/tugeres/${mediaId}.webp`,
      originalFilename: 'tugeres-reference-menu.webp',
      mimeType: 'image/webp',
      byteSize: 82846,
    },
  });

  assert.equal(bootstrap.created, true);
  systemId = bootstrap.systemId;

  const english = await getPublishedSystem(db, { locale: 'en', slug: 'tugeres' });
  const french = await getPublishedSystem(db, { locale: 'fr', slug: 'tugeres' });

  assert.ok(english);
  assert.ok(french);
  assert.equal(english.id, systemId);
  assert.equal(french.id, systemId);
  assert.equal(english.presentationKind, 'standard');
  assert.equal(french.presentationKind, 'standard');
  assert.equal(english.origin, null);
  assert.equal(french.origin, null);

  assert.deepEqual(
    english.technologies.map(({ name }) => name),
    ['PHP', 'MySQL', 'Docker', 'Bootstrap', 'Stripe', 'Brevo', 'Cloudinary'],
  );

  assert.deepEqual(
    english.links.map(({ kind }) => kind),
    ['repository', 'documentation', 'documentation'],
  );
  assert.equal(
    english.links.some(({ kind }) => kind === 'live' || kind === 'demo'),
    false,
  );
  assert.equal(
    english.links.find(({ kind }) => kind === 'repository')?.url,
    'https://github.com/AmineAKIK/tugeres',
  );

  assert.deepEqual(
    english.media.map(({ id, mimeType, position }) => ({ id, mimeType, position })),
    [{ id: mediaId, mimeType: 'image/webp', position: 0 }],
  );
  assert.match(english.media[0]?.caption ?? '', /not evidence of a customer deployment/i);
  assert.match(french.media[0]?.caption ?? '', /ne constitue pas une preuve de déploiement client/i);

  const englishPresentation = JSON.stringify(english.presentationDocument);
  const frenchPresentation = JSON.stringify(french.presentationDocument);

  assert.match(englishPresentation, /one isolated instance per caterer/i);
  assert.match(englishPresentation, /authoritative webhook handling/i);
  assert.match(englishPresentation, /does not by itself prove a live customer deployment/i);
  assert.match(englishPresentation, /must not be described as tested until a real restore/i);
  assert.match(frenchPresentation, /instance isolée par traiteur/i);
  assert.match(frenchPresentation, /ne prouve pas à lui seul un déploiement client actif/i);

  const englishLibrary = await listPublishedSystems(db, { locale: 'en' });
  const frenchLibrary = await listPublishedSystems(db, { locale: 'fr' });

  assert.equal(
    englishLibrary.some(({ id, slug }) => id === systemId && slug === 'tugeres'),
    true,
  );
  assert.equal(
    frenchLibrary.some(({ id, slug }) => id === systemId && slug === 'tugeres'),
    true,
  );

  const repeated = await bootstrapTugeresDomain(db, {
    media: {
      id: randomUUID(),
      storageKey: 'qualification/tugeres/duplicate.webp',
      originalFilename: 'duplicate.webp',
      mimeType: 'image/webp',
      byteSize: 1,
    },
  });

  assert.deepEqual(repeated, { created: false, systemId });

  process.stdout.write(
    'Tugeres domain verification passed: localized publication, standard presentation, capabilities, architecture evidence, repository/docs links, reference media, evidence boundaries, and idempotent bootstrap are enforced.\n',
  );
} finally {
  if (systemId !== null) {
    await db.deleteFrom('systems').where('id', '=', systemId).execute();
  }
  await db.deleteFrom('assets').where('id', '=', mediaId).execute();
  await db.destroy();
}
