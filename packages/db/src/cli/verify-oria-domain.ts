import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';

import { bootstrapOriaDomain } from '../oria-bootstrap.js';
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

  const bootstrap = await bootstrapOriaDomain(db, {
    media: {
      id: mediaId,
      storageKey: `qualification/oria/${mediaId}.webp`,
      originalFilename: 'oria-reference-collations.webp',
      mimeType: 'image/webp',
      byteSize: 97042,
    },
  });

  assert.equal(bootstrap.created, true);
  systemId = bootstrap.systemId;

  const english = await getPublishedSystem(db, {
    locale: 'en',
    slug: 'oria-nutrition',
  });
  const french = await getPublishedSystem(db, {
    locale: 'fr',
    slug: 'oria-nutrition',
  });

  assert.ok(english);
  assert.ok(french);
  assert.equal(english.id, systemId);
  assert.equal(french.id, systemId);
  assert.equal(english.presentationKind, 'interactive_entry');
  assert.equal(french.presentationKind, 'interactive_entry');
  assert.equal(english.origin, null);
  assert.equal(french.origin, null);

  assert.deepEqual(
    english.technologies.map(({ name }) => name),
    [
      'TypeScript',
      'React',
      'Vite',
      'React Router',
      'Playwright',
      'Tailwind CSS',
      'Progressive Web App',
    ],
  );

  assert.equal(
    english.links.find(({ kind }) => kind === 'live')?.url,
    'https://amineakik.github.io/orianutrition/',
  );
  assert.equal(
    english.links.find(({ kind }) => kind === 'repository')?.url,
    'https://github.com/AmineAKIK/orianutrition',
  );
  assert.equal(
    english.links.filter(({ kind }) => kind === 'documentation').length,
    2,
  );

  assert.deepEqual(
    english.media.map(({ id, mimeType, position }) => ({
      id,
      mimeType,
      position,
    })),
    [{ id: mediaId, mimeType: 'image/webp', position: 0 }],
  );
  assert.match(english.media[0]?.caption ?? '', /no real client material/i);
  assert.match(french.media[0]?.caption ?? '', /aucun contenu de client reel/i);

  const englishPresentation = JSON.stringify(english.presentationDocument);
  const frenchPresentation = JSON.stringify(french.presentationDocument);

  assert.match(englishPresentation, /deliberately non-industrial/i);
  assert.match(englishPresentation, /fictional portfolio material/i);
  assert.match(englishPresentation, /No real client data/i);
  assert.match(englishPresentation, /general wellbeing/i);
  assert.match(englishPresentation, /98\.55 KiB gzip to 86\.03 KiB gzip/i);
  assert.match(frenchPresentation, /volontairement non industriel/i);
  assert.match(frenchPresentation, /Aucune donnee de client reel/i);

  const englishLibrary = await listPublishedSystems(db, { locale: 'en' });
  const frenchLibrary = await listPublishedSystems(db, { locale: 'fr' });

  assert.equal(
    englishLibrary.some(({ id, slug }) => id === systemId && slug === 'oria-nutrition'),
    true,
  );
  assert.equal(
    frenchLibrary.some(({ id, slug }) => id === systemId && slug === 'oria-nutrition'),
    true,
  );

  const repeated = await bootstrapOriaDomain(db, {
    media: {
      id: randomUUID(),
      storageKey: 'qualification/oria/duplicate.webp',
      originalFilename: 'duplicate.webp',
      mimeType: 'image/webp',
      byteSize: 1,
    },
  });
  assert.deepEqual(repeated, { created: false, systemId });

  process.stdout.write(
    'Oria domain verification passed: localized publication, interactive-entry selection, capabilities, links, media, non-industrial positioning, privacy/health boundaries, and idempotent bootstrap are enforced.\n',
  );
} finally {
  if (systemId !== null) {
    await db.deleteFrom('systems').where('id', '=', systemId).execute();
  }
  await db.deleteFrom('assets').where('id', '=', mediaId).execute();
  await db.destroy();
}
