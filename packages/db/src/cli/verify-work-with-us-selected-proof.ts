import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { bootstrapOriaDomain } from '../oria-bootstrap.js';
import { bootstrapProtoCapDomain } from '../protocap-bootstrap.js';
import { bootstrapTugeresDomain } from '../tugeres-bootstrap.js';
import { createDatabase } from '../database.js';
import { listPublishedSystemReferences } from '../system-reference.js';
import {
  listWorkWithUsProofReferences,
  workWithUsProofSystemSlugs,
} from '../work-with-us-proof.js';
import { databaseUrlFromEnv } from './env.js';

const db = createDatabase(databaseUrlFromEnv());

try {
  await bootstrapProtoCapDomain(db, {
    media: {
      id: randomUUID(),
      storageKey: 'qualification/aks-126/protocap.png',
      originalFilename: 'protocap-commercial-proof.png',
      mimeType: 'image/png',
      byteSize: 1,
    },
  });
  await bootstrapOriaDomain(db, {
    media: {
      id: randomUUID(),
      storageKey: 'qualification/aks-126/oria.webp',
      originalFilename: 'oria-non-selected-control.webp',
      mimeType: 'image/webp',
      byteSize: 1,
    },
  });
  await bootstrapTugeresDomain(db, {
    media: {
      id: randomUUID(),
      storageKey: 'qualification/aks-126/tugeres.webp',
      originalFilename: 'tugeres-commercial-proof.webp',
      mimeType: 'image/webp',
      byteSize: 1,
    },
  });

  assert.deepEqual(workWithUsProofSystemSlugs, ['protocap', 'tugeres']);

  for (const locale of ['en', 'fr'] as const) {
    const library = await listPublishedSystemReferences(db, { locale });
    const selected = await listWorkWithUsProofReferences(db, locale);

    assert.ok(
      library.some(({ slug }) => slug === 'oria-nutrition'),
      'Qualification must include a published non-selected System control.',
    );
    assert.deepEqual(
      selected.map(({ slug }) => slug),
      ['protocap', 'tugeres'],
      'Work with us must keep a stable, deliberately short proof selection.',
    );
    assert.equal(selected.length, 2);
    assert.equal(
      selected.some(({ slug }) => slug === 'oria-nutrition'),
      false,
      'Work with us must not mirror the Systems library.',
    );

    for (const reference of selected) {
      assert.ok(reference.title.length > 0);
      assert.ok(reference.summary.length > 0);
      assert.ok(reference.proofTransparency.role.length > 0);
      assert.ok(reference.proofTransparency.maturity.length > 0);
      assert.match(reference.href, new RegExp(`^/${locale}/systems/`));
    }
  }

  process.stdout.write(
    'AKS-126 qualification passed: Work with us reuses exactly ProtoCap and Tugères as published SystemReference evidence, excludes the published Oria control, preserves transparency metadata, and links back to the canonical System detail.\n',
  );
} finally {
  await db.destroy();
}
