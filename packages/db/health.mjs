import pg from 'pg';

const { Pool } = pg;

/**
 * @param {string} connectionString
 * @param {{ onPoolError?: (error: Error) => void }} options
 */
export function createPostgresHealthCheck(connectionString, { onPoolError } = {}) {
  if (connectionString.trim() === '') {
    throw new Error('A non-empty PostgreSQL connection string is required for DB health checks.');
  }

  const pool = new Pool({
    connectionString,
    max: 1,
    connectionTimeoutMillis: 2_000,
    idleTimeoutMillis: 10_000,
  });

  if (onPoolError !== undefined) {
    pool.on('error', onPoolError);
  }

  return Object.freeze({
    async check() {
      const startedAt = performance.now();

      try {
        const result = await pool.query('select 1::int as ok');
        const ok = result.rows[0]?.ok === 1;

        return {
          ok,
          latencyMs: Math.round((performance.now() - startedAt) * 100) / 100,
          ...(ok ? {} : { error: new Error('PostgreSQL health query returned an invalid result.') }),
        };
      } catch (error) {
        return {
          ok: false,
          latencyMs: Math.round((performance.now() - startedAt) * 100) / 100,
          error,
        };
      }
    },
    async close() {
      await pool.end();
    },
  });
}
