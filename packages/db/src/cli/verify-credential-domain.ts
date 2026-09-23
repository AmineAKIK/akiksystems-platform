import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { createDatabase } from '../database.js';
import {
  getPublishedCredential,
  listPublishedCredentialsForTraining,
  publishCredentialLocalization,
  unpublishCredentialLocalization,
} from '../credential-publication.js';
import { publishTrainingLocalization } from '../training-publication.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required.');

const db = createDatabase(connectionString);
const trainingId = randomUUID();
const credentialId = randomUUID();
const assetId = randomUUID();

try {
  await db
    .insertInto('trainings')
    .values({
      id: trainingId,
      provider: 'Credential Qualification Provider',
      state: 'completed',
      start_date: '2025-01-01',
      end_date: '2025-06-30',
      editorial_position: 0,
    })
    .execute();

  await db
    .insertInto('training_localizations')
    .values([
      {
        training_id: trainingId,
        locale: 'en',
        slug: 'credential-training',
        title: 'Credential Training',
        summary: 'Training context for Credential qualification.',
      },
      {
        training_id: trainingId,
        locale: 'fr',
        slug: 'formation-credential',
        title: 'Formation Credential',
        summary: 'Contexte de formation pour la qualification Credential.',
      },
    ])
    .execute();

  await publishTrainingLocalization(db, { trainingId, locale: 'en' });
  await publishTrainingLocalization(db, { trainingId, locale: 'fr' });

  await db
    .insertInto('assets')
    .values({
      id: assetId,
      storage_key: `qualification/credentials/${assetId}.pdf`,
      original_filename: 'credential-proof.pdf',
      mime_type: 'application/pdf',
      byte_size: 2048,
      width: null,
      height: null,
    })
    .execute();

  await db
    .insertInto('credentials')
    .values({
      id: credentialId,
      kind: 'certification',
      issuer: 'Qualification Authority',
      issued_on: '2025-07-01',
      training_id: trainingId,
      source_asset_id: assetId,
      verification_url: 'https://example.com/verify/credential',
      editorial_position: 0,
    })
    .execute();

  await db
    .insertInto('credential_localizations')
    .values([
      {
        credential_id: credentialId,
        locale: 'en',
        slug: 'qualified-credential',
        title: 'Qualified Credential',
        summary: 'Published credential evidence.',
        body: 'Credential inspection depth.',
      },
      {
        credential_id: credentialId,
        locale: 'fr',
        slug: 'justificatif-qualifie',
        title: 'Justificatif qualifié',
        summary: 'Preuve de certification publiée.',
        body: 'Niveau d inspection du justificatif.',
      },
    ])
    .execute();

  await publishCredentialLocalization(db, { credentialId, locale: 'en' });
  await publishCredentialLocalization(db, { credentialId, locale: 'fr' });

  const english = await getPublishedCredential(db, {
    locale: 'en',
    slug: 'qualified-credential',
  });
  assert.ok(english);
  assert.equal(english.kind, 'certification');
  assert.equal(english.issuer, 'Qualification Authority');
  assert.equal(english.sourceAssetId, assetId);
  assert.equal(
    english.verificationUrl,
    'https://example.com/verify/credential',
  );
  assert.equal(english.training?.slug, 'credential-training');
  assert.equal(english.alternate?.slug, 'justificatif-qualifie');

  const connected = await listPublishedCredentialsForTraining(db, {
    locale: 'en',
    trainingId,
  });
  assert.deepEqual(
    connected.map((credential) => credential.credentialId),
    [credentialId],
  );

  await db
    .updateTable('credential_localizations')
    .set({
      title: 'Draft changed credential',
      summary: 'Draft changed summary.',
      editorial_state: 'draft',
      published_at: null,
      updated_at: new Date(),
    })
    .where('credential_id', '=', credentialId)
    .where('locale', '=', 'en')
    .execute();

  const stablePublic = await getPublishedCredential(db, {
    locale: 'en',
    slug: 'qualified-credential',
  });
  assert.equal(stablePublic?.title, 'Qualified Credential');
  assert.equal(stablePublic?.summary, 'Published credential evidence.');

  await unpublishCredentialLocalization(db, {
    credentialId,
    locale: 'fr',
  });
  assert.equal(
    (
      await getPublishedCredential(db, {
        locale: 'en',
        slug: 'qualified-credential',
      })
    )?.alternate,
    null,
  );
  assert.equal(
    await getPublishedCredential(db, {
      locale: 'fr',
      slug: 'justificatif-qualifie',
    }),
    null,
  );

  await assert.rejects(
    db
      .insertInto('credentials')
      .values({
        id: randomUUID(),
        kind: 'certification',
        issuer: 'Invalid URL issuer',
        verification_url: 'javascript:alert(1)',
        editorial_position: 1,
      })
      .execute(),
  );

  process.stdout.write(
    'AKS-088 Credential domain qualification passed: kind, issuer/date, Training relation, optional source asset, verification URL, bilingual publication snapshots, and public linkage are enforced.\n',
  );
} finally {
  await db.deleteFrom('credentials').where('id', '=', credentialId).execute();
  await db.deleteFrom('trainings').where('id', '=', trainingId).execute();
  await db.deleteFrom('assets').where('id', '=', assetId).execute();
  await db.destroy();
}
