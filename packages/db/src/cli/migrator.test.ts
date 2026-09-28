import { describe, expect, it } from 'vitest';

import { historicalCompatibilityMigrationNames, reconcileMigrationHistory } from './migrator.js';

type MigrationMap = Parameters<typeof reconcileMigrationHistory>[0];
type Migration = MigrationMap[string];

const migration: Migration = {
  async up() {},
  async down() {},
};

function migrations(...names: string[]): MigrationMap {
  return Object.fromEntries(names.map((name) => [name, migration]));
}

describe('migration history compatibility', () => {
  it('keeps the canonical migration set untouched for a fresh database', () => {
    const canonical = migrations(
      '20260921_010_create_public_profile',
      '20260922_020_add_system_editorial_controls',
      '20260923_029a_add_profile_systemic_scale_writing',
      '20260923_030_create_writing_categories',
    );

    expect(reconcileMigrationHistory(canonical, [])).toEqual(canonical);
  });

  it('does not backfill removed Profile migrations into production history', () => {
    const canonical = migrations(
      '20260921_010_create_public_profile',
      '20260922_020_add_system_editorial_controls',
      '20260923_029a_add_profile_systemic_scale_writing',
      '20260923_030_create_writing_categories',
      '20260927_044_remove_back_office',
      '20260928_045_future_change',
    );

    const resolved = reconcileMigrationHistory(canonical, [
      '20260921_010_create_public_profile',
      '20260922_020_add_system_editorial_controls',
      '20260923_030_create_writing_categories',
      '20260927_044_remove_back_office',
    ]);

    expect(resolved['20260922_011_create_profile_work_principles']).toBeUndefined();
    expect(resolved['20260923_029a_add_profile_systemic_scale_writing']).toBeUndefined();
    expect(resolved['20260928_045_future_change']).toBe(migration);
  });

  it('synthesizes only historical names already recorded by staging', () => {
    const canonical = migrations(
      '20260921_010_create_public_profile',
      '20260922_020_add_system_editorial_controls',
      '20260923_029a_add_profile_systemic_scale_writing',
      '20260923_030_create_writing_categories',
      '20260927_044_remove_back_office',
    );

    const executed = [
      '20260921_010_create_public_profile',
      ...historicalCompatibilityMigrationNames.slice(0, 9),
      '20260922_020_add_system_editorial_controls',
      '20260923_030_create_writing_categories',
      '20260927_044_remove_back_office',
    ];

    const resolved = reconcileMigrationHistory(canonical, executed);

    for (const name of historicalCompatibilityMigrationNames.slice(0, 9)) {
      expect(resolved[name]).toBeDefined();
      expect(resolved[name]).not.toBe(migration);
    }

    expect(resolved['20260923_029a_add_profile_systemic_scale_writing']).toBeUndefined();
  });
});
