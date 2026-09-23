import { createDatabase } from '../database.js';
import { publishCredentialLocalization } from '../credential-publication.js';
import { databaseUrlFromEnv } from './env.js';

const db = createDatabase(databaseUrlFromEnv());
const trainingId = '7f1b4863-e676-4d55-a0b8-3f8e8b1a8707';
const credentialId = '8d4d7bf4-f34a-4ea6-b34a-5f64efcb8808';

try {
  await db
    .insertInto('credentials')
    .values({
      id: credentialId,
      kind: 'certification',
      issuer: 'Qualification Authority',
      issued_on: '2025-07-01',
      training_id: trainingId,
      source_asset_id: null,
      verification_url: 'https://example.com/verify/qualified-credential',
      editorial_position: 0,
    })
    .onConflict((conflict) =>
      conflict.column('id').doUpdateSet({
        kind: 'certification',
        issuer: 'Qualification Authority',
        issued_on: '2025-07-01',
        training_id: trainingId,
        source_asset_id: null,
        verification_url: 'https://example.com/verify/qualified-credential',
        editorial_position: 0,
        updated_at: new Date(),
      }),
    )
    .execute();

  await db
    .insertInto('credential_localizations')
    .values([
      {
        credential_id: credentialId,
        locale: 'en',
        slug: 'qualified-credential',
        title: 'Qualified Credential',
        summary: 'Published Credential evidence.',
        body: 'Credential inspection depth with issuer-verifiable evidence.',
        editorial_state: 'draft',
        published_at: null,
      },
      {
        credential_id: credentialId,
        locale: 'fr',
        slug: 'justificatif-qualifie',
        title: 'Justificatif qualifié',
        summary: 'Preuve Credential publiée.',
        body: 'Détail inspectable du justificatif et de sa vérification.',
        editorial_state: 'draft',
        published_at: null,
      },
    ])
    .onConflict((conflict) =>
      conflict.columns(['credential_id', 'locale']).doUpdateSet((eb) => ({
        slug: eb.ref('excluded.slug'),
        title: eb.ref('excluded.title'),
        summary: eb.ref('excluded.summary'),
        body: eb.ref('excluded.body'),
        editorial_state: 'draft',
        published_at: null,
        updated_at: new Date(),
      })),
    )
    .execute();

  await publishCredentialLocalization(db, {
    credentialId,
    locale: 'en',
  });
  await publishCredentialLocalization(db, {
    credentialId,
    locale: 'fr',
  });

  process.stdout.write(
    `Credential browser qualification bootstrap published EN/FR Credential ${credentialId}.\n`,
  );
} finally {
  await db.destroy();
}
