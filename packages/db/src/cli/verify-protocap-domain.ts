import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';

import { bootstrapProtoCapDomain } from '../protocap-bootstrap.js';
import { getPublishedSystem, listPublishedSystems } from '../public-system.js';
import { createDatabase } from '../database.js';
import { databaseUrlFromEnv } from './env.js';
import { createMigrator, reportMigrationResults } from './migrator.js';

const db = createDatabase(databaseUrlFromEnv());
const mediaId = randomUUID();
let systemId: string | null = null;
let experienceId: string | null = null;

try {
  const migrationResult = await createMigrator(db).migrateToLatest();
  reportMigrationResults(migrationResult.results);

  if (migrationResult.error !== undefined) {
    throw migrationResult.error;
  }

  const bootstrap = await bootstrapProtoCapDomain(db, {
    media: {
      id: mediaId,
      storageKey: `qualification/protocap/${mediaId}.png`,
      originalFilename: 'protocap-reference-cover.png',
      mimeType: 'image/png',
      byteSize: 109020,
    },
  });

  assert.equal(bootstrap.created, true);
  systemId = bootstrap.systemId;

  const english = await getPublishedSystem(db, {
    locale: 'en',
    slug: 'protocap',
  });
  const french = await getPublishedSystem(db, {
    locale: 'fr',
    slug: 'protocap',
  });

  assert.ok(english);
  assert.ok(french);
  assert.equal(english.id, systemId);
  assert.equal(french.id, systemId);
  assert.equal(english.presentationKind, 'guided_demo');
  assert.equal(french.presentationKind, 'guided_demo');

  assert.deepEqual(
    english.technologies.map(({ name }) => name),
    [
      'TypeScript',
      'React',
      'Vite',
      'Express',
      'Node.js',
      'Playwright',
      'Vitest',
      'Tailwind CSS',
    ],
  );

  assert.equal(english.origin?.title, "L'Oreal / La Roche-Posay");
  assert.match(english.origin?.summary ?? '', /industrial operations context/i);
  assert.equal(french.origin?.title, "L'Oreal / La Roche-Posay");

  assert.deepEqual(
    english.links.map(({ kind }) => kind),
    ['live', 'demo', 'repository', 'documentation'],
  );
  assert.equal(
    english.links.find(({ kind }) => kind === 'live')?.url,
    'https://protocap-production.up.railway.app/',
  );
  assert.equal(
    english.links.find(({ kind }) => kind === 'demo')?.url,
    'https://protocap-demo-production.up.railway.app/demo',
  );
  assert.equal(
    english.links.find(({ kind }) => kind === 'repository')?.url,
    'https://github.com/AmineAKIK/protocap',
  );

  assert.deepEqual(
    english.media.map(({ id, mimeType, position }) => ({
      id,
      mimeType,
      position,
    })),
    [{ id: mediaId, mimeType: 'image/png', position: 0 }],
  );
  assert.match(english.media[0]?.caption ?? '', /ProtoCap repository/i);
  assert.match(french.media[0]?.caption ?? '', /depot ProtoCap/i);

  const englishPresentation = JSON.stringify(english.presentationDocument);
  const frenchPresentation = JSON.stringify(french.presentationDocument);

  assert.match(englishPresentation, /fictitious/i);
  assert.match(englishPresentation, /not evidence of an industrial deployment/i);
  assert.match(englishPresentation, /process-local/i);
  assert.match(frenchPresentation, /fictives/i);
  assert.match(frenchPresentation, /deploiement industriel/i);

  const englishLibrary = await listPublishedSystems(db, { locale: 'en' });
  const frenchLibrary = await listPublishedSystems(db, { locale: 'fr' });

  assert.equal(
    englishLibrary.some(({ id, slug }) => id === systemId && slug === 'protocap'),
    true,
  );
  assert.equal(
    frenchLibrary.some(({ id, slug }) => id === systemId && slug === 'protocap'),
    true,
  );

  const repeated = await bootstrapProtoCapDomain(db, {
    media: {
      id: randomUUID(),
      storageKey: 'qualification/protocap/duplicate.png',
      originalFilename: 'duplicate.png',
      mimeType: 'image/png',
      byteSize: 1,
    },
  });

  assert.deepEqual(repeated, { created: false, systemId });

  experienceId = english.origin?.id ?? null;

  process.stdout.write(
    'ProtoCap domain verification passed: localized publication, guided-demo selection, technologies, origin context, links, media, explicit limits, and idempotent bootstrap are enforced.\n',
  );
} finally {
  if (systemId !== null) {
    await db.deleteFrom('systems').where('id', '=', systemId).execute();
  }
  if (experienceId !== null) {
    await db.deleteFrom('experiences').where('id', '=', experienceId).execute();
  }
  await db.deleteFrom('assets').where('id', '=', mediaId).execute();
  await db.destroy();
}
