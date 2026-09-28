import type { Kysely } from 'kysely';

/**
 * Historical migration tombstone.
 *
 * This migration name was executed by an earlier staging database before the
 * Profile schema was consolidated. Its effects are no longer required by the
 * current schema, but the filename must remain available so Kysely can
 * reconcile previously executed migration history.
 */
export function up(db: Kysely<unknown>): Promise<void> {
  void db;
  return Promise.resolve();
}

export function down(db: Kysely<unknown>): Promise<void> {
  void db;
  return Promise.resolve();
}
