import { sql, type Transaction } from 'kysely';

import type { Database } from './schema.js';

export async function lockSystemMutation(
  transaction: Transaction<Database>,
  systemId: string,
): Promise<void> {
  await sql`
    select pg_advisory_xact_lock(hashtextextended(${systemId}, 0))
  `.execute(transaction);
}
