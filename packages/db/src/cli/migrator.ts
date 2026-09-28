import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { sql, type Kysely } from 'kysely';
import { FileMigrationProvider, Migrator } from 'kysely/migration';

import type { Database } from '../schema.js';

const migrationFolder = fileURLToPath(new URL('../migrations', import.meta.url));

type MigrationMap = Awaited<ReturnType<FileMigrationProvider['getMigrations']>>;
type Migration = MigrationMap[string];

export const historicalCompatibilityMigrationNames = [
  '20260922_011_create_profile_work_principles',
  '20260922_012_create_profile_systems',
  '20260922_013_create_profile_experiences',
  '20260922_014_create_profile_capabilities',
  '20260922_015_create_profile_languages_and_mobility',
  '20260922_016_add_profile_source_cv',
  '20260922_017_add_work_principle_evidence_system',
  '20260922_018_create_profile_technology_journey',
  '20260922_019_harden_profile_publication',
  '20260923_029a_add_profile_systemic_scale_writing',
] as const;

function postgresErrorCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return null;
  }

  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : null;
}

async function executedMigrationNames(db: Kysely<Database>): Promise<string[]> {
  try {
    const result = await sql<{ name: string }>`
      select name
      from "kysely_migration"
      order by "timestamp" asc, name asc
    `.execute(db);

    return result.rows.map((row) => row.name);
  } catch (error) {
    if (postgresErrorCode(error) === '42P01') {
      return [];
    }

    throw error;
  }
}

function historicalMigrationTombstone(name: string): Migration {
  const rejectExecution = async (): Promise<void> => {
    throw new Error(
      `Historical migration ${name} is a compatibility marker and must not be executed or rolled back.`,
    );
  };

  return {
    up: rejectExecution,
    down: rejectExecution,
  };
}

export function reconcileMigrationHistory(
  migrations: MigrationMap,
  executedNames: readonly string[],
): MigrationMap {
  if (executedNames.length === 0) {
    return migrations;
  }

  const resolved: MigrationMap = { ...migrations };
  const executed = new Set(executedNames);
  const lastExecuted = executedNames.at(-1);

  if (lastExecuted === undefined) {
    return migrations;
  }

  for (const name of historicalCompatibilityMigrationNames) {
    if (executed.has(name)) {
      if (resolved[name] === undefined) {
        resolved[name] = historicalMigrationTombstone(name);
      }
      continue;
    }

    if (name.localeCompare(lastExecuted) < 0) {
      delete resolved[name];
    }
  }

  return resolved;
}

class HistoryCompatibleMigrationProvider {
  readonly #db: Kysely<Database>;
  readonly #files: FileMigrationProvider;

  constructor(db: Kysely<Database>) {
    this.#db = db;
    this.#files = new FileMigrationProvider({
      fs,
      path,
      migrationFolder,
    });
  }

  async getMigrations(): Promise<MigrationMap> {
    const [migrations, executedNames] = await Promise.all([
      this.#files.getMigrations(),
      executedMigrationNames(this.#db),
    ]);

    return reconcileMigrationHistory(migrations, executedNames);
  }
}

export function createMigrator(db: Kysely<Database>): Migrator {
  return new Migrator({
    db,
    provider: new HistoryCompatibleMigrationProvider(db),
  });
}

export function reportMigrationResults(
  results: readonly { migrationName: string; status: string }[] | undefined,
): void {
  if (results === undefined || results.length === 0) {
    process.stdout.write('No migration changes were required.\n');
    return;
  }

  for (const result of results) {
    process.stdout.write(`${result.status}: ${result.migrationName}\n`);
  }
}
