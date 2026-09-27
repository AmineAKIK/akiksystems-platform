# Production database reset — 2026-09-27

## Context

The Profile domain was intentionally rebuilt with a clean migration history before production data had value. The production PostgreSQL service still contained the retired Profile migration history, so Railway correctly rejected later deploys as a corrupted Kysely migration set.

The failing marker was:

`20260922_011_create_profile_work_principles`

The active repository history had already removed that migration and rewritten the initial Profile migration, so deleting migration-history rows in place would not have been a valid repair.

## Recovery

The production PostgreSQL `public` schema was recreated from zero with explicit operator approval.

The object-storage bucket was not reset.

After the reset:

1. `pnpm deploy:migrate` recreated the Better Auth schema and replayed the current application migration history from zero.
2. A second deploy confirmed the migration path is idempotent.
3. The production administrator is reprovisioned through the server-only `auth:bootstrap-admin` path.
4. Web and worker deployments are aligned to the current `main`.

## Invariant

Production migration history must now match the repository migration history exactly. Future migration files that have reached a persistent environment must not be rewritten or removed without an explicit environment-rebuild plan.
