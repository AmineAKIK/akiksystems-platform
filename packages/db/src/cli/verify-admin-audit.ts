import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';

import { writeAdminAuditEvent } from '../admin-audit.js';
import { createDatabase } from '../database.js';
import { databaseUrlFromEnv } from './env.js';
import { createMigrator, reportMigrationResults } from './migrator.js';

class VerificationRollback extends Error {}

interface PostgreSqlError {
  code?: string;
  message?: string;
}

const db = createDatabase(databaseUrlFromEnv());

try {
  const migrationResult = await createMigrator(db).migrateToLatest();
  reportMigrationResults(migrationResult.results);

  if (migrationResult.error !== undefined) {
    throw migrationResult.error;
  }

  try {
    await db.transaction().execute(async (transaction) => {
      const systemId = randomUUID();

      await transaction.insertInto('systems').values({ id: systemId }).execute();

      await writeAdminAuditEvent(transaction, {
        actorUserId: 'verification-admin',
        actorEmail: 'verification@example.invalid',
        action: 'system.localization_published',
        entityType: 'system_localization',
        entityId: `${systemId}:en`,
        systemId,
        locale: 'en',
        metadata: {
          previousState: 'draft',
          fields: ['editorial_state', 'published_at'],
        },
      });

      const event = await transaction
        .selectFrom('admin_audit_events')
        .select([
          'actor_user_id',
          'actor_email',
          'action',
          'entity_type',
          'entity_id',
          'system_id',
          'locale',
          'metadata',
        ])
        .where('system_id', '=', systemId)
        .executeTakeFirstOrThrow();

      assert.equal(event.actor_user_id, 'verification-admin');
      assert.equal(event.actor_email, 'verification@example.invalid');
      assert.equal(event.action, 'system.localization_published');
      assert.equal(event.entity_type, 'system_localization');
      assert.equal(event.entity_id, `${systemId}:en`);
      assert.equal(event.locale, 'en');
      assert.deepEqual(event.metadata, {
        previousState: 'draft',
        fields: ['editorial_state', 'published_at'],
      });

      throw new VerificationRollback('rollback successful audit verification');
    });
  } catch (error) {
    assert.ok(error instanceof VerificationRollback);
  }

  let updateError: unknown;

  try {
    await db.transaction().execute(async (transaction) => {
      const systemId = randomUUID();
      await transaction.insertInto('systems').values({ id: systemId }).execute();
      await writeAdminAuditEvent(transaction, {
        actorUserId: 'verification-admin',
        actorEmail: 'verification@example.invalid',
        action: 'system.created',
        entityType: 'system',
        entityId: systemId,
        systemId,
      });

      await transaction
        .updateTable('admin_audit_events')
        .set({ action: 'tampered' })
        .where('system_id', '=', systemId)
        .execute();
    });
  } catch (error) {
    updateError = error;
  }

  assert.ok(updateError !== undefined);
  assert.equal((updateError as PostgreSqlError).code, 'P0001');
  assert.match(
    (updateError as PostgreSqlError).message ?? '',
    /admin audit events are append-only/,
  );

  let deleteError: unknown;

  try {
    await db.transaction().execute(async (transaction) => {
      const systemId = randomUUID();
      await transaction.insertInto('systems').values({ id: systemId }).execute();
      await writeAdminAuditEvent(transaction, {
        actorUserId: 'verification-admin',
        actorEmail: 'verification@example.invalid',
        action: 'system.created',
        entityType: 'system',
        entityId: systemId,
        systemId,
      });

      await transaction
        .deleteFrom('admin_audit_events')
        .where('system_id', '=', systemId)
        .execute();
    });
  } catch (error) {
    deleteError = error;
  }

  assert.ok(deleteError !== undefined);
  assert.equal((deleteError as PostgreSqlError).code, 'P0001');

  process.stdout.write(
    'Admin audit verification passed: readable event persistence works and audit rows are append-only.\n',
  );
} finally {
  await db.destroy();
}
