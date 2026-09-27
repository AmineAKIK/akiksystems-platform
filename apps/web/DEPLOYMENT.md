# Web deployment notes

Railway staging must use `GET /health` as the web service healthcheck.

That endpoint probes PostgreSQL and represents runtime liveness. Content routes such as
`/:locale/systems/:slug` are publication-dependent and may intentionally return 404, so they
must not be used as infrastructure healthchecks.

## Production provisioning

Normal Railway production deploys use `pnpm deploy:migrate` as the web pre-deploy command.

After an explicitly approved empty-database rebuild, use `pnpm provision:initial` for exactly one production deploy. It runs the current migrations and the guarded administrator bootstrap. After that deploy succeeds, restore the normal `pnpm deploy:migrate` pre-deploy command.

The production database reset performed on 2026-09-27 is recorded in `docs/qualification/production-db-reset-2026-09-27.md`.
