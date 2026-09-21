# AkikSystems Platform

The production platform behind AkikSystems.

## Workspace

This repository is a pnpm monorepo with two applications and four shared packages:

- `apps/web` — React Router Framework Mode web runtime served by Express.
- `apps/worker` — Graphile Worker asynchronous job runtime.
- `packages/core` — platform/domain primitives shared across applications.
- `packages/db` — typed PostgreSQL boundary using Kysely plus DB health probing.
- `packages/ui` — shared UI boundary.
- `packages/config` — shared TypeScript, linting, runtime config, and observability contracts.

## Continuous integration

GitHub Actions runs the permanent CI pipeline on every push and pull request.

The `CI / quality` job is deliberately sequential and fail-fast:

1. locked install with `pnpm install --frozen-lockfile`;
2. `pnpm lint`;
3. `pnpm typecheck`;
4. `pnpm test`;
5. `pnpm build`.

A failing step fails the job and prevents later validation steps from reporting a successful pipeline.

## Bilingual routing

The public web runtime uses explicit locale-prefixed routes:

- `/en/...` for English;
- `/fr/...` for French;
- `/` redirects explicitly to `/en`;
- unsupported or unlocalized paths return 404 instead of silently falling back to another language.

Minimal UI dictionaries live under `apps/web/app/i18n` and the document `lang` attribute follows the resolved URL locale.

## UI foundations

`@akiksystems/ui` provides the small shared visual foundation used by the web runtime.

- CSS tokens cover typography, spacing, surfaces, focus treatment, radii, and motion.
- Reduced-motion preferences collapse transition durations.
- The shared primitives are `Text`, `Heading`, `Link`, `Button`, and `Container`.
- Primitives stay intentionally semantic and low-opinionated; page-specific composition remains in the web app.
- The current bilingual walking-skeleton pages consume these primitives directly as proof of integration.

## System domain model

The core System model keeps shared identity separate from localized editorial content.

- `systems` owns the stable UUID identity and technical lifecycle (`active` / `archived`).
- `system_localizations` owns locale-specific slug, title, summary, editorial state, and publication timestamp.
- EN and FR publication state is independent for the same System identity.
- Slugs are unique within a locale, allowing the same slug in different languages.
- Lifecycle and editorial publication are separate state machines; archiving a System does not rewrite localization publication state.
- Database constraints enforce supported locales, allowed states, publication/archive timestamp consistency, and cascading localization deletion.

Publication-readiness rules for required localized fields remain intentionally deferred to AKS-022.

### Technologies

Technologies are modeled as reusable typed entities rather than strings embedded in a System record.

- `technologies` stores one canonical technology identity with a unique slug and display name.
- `system_technologies` is an explicit many-to-many relation between Systems and Technologies.
- `position` preserves a stable display order per System.
- A System cannot reference the same Technology twice or reuse the same position twice.
- Deleting a System or Technology removes only the corresponding relation rows through foreign-key cascades.
- The model intentionally avoids comma-separated stack storage so later features can query, reuse, order, and enrich technologies independently.

## Private administration

The administration surface is intentionally single-user and closed to public registration.

- Better Auth provides database-backed sessions and email/password authentication.
- Public sign-up is disabled; the single allowed identity is constrained by `ADMIN_EMAIL`.
- The initial administrator is created only through the server-side `pnpm auth:bootstrap-admin`
  command with a one-time `ADMIN_PASSWORD`.
- `/admin` and `/admin/security` are guarded by server loaders and redirect anonymous requests to
  `/admin/login`.
- Production-mode cookies are HttpOnly, Secure, SameSite=Lax, and use an AkikSystems-specific prefix.
- TOTP two-factor authentication and recovery codes are available through Better Auth.
- Auth schema changes run through `pnpm auth:migrate` before application database migrations.

Required server-only variables are `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and
`ADMIN_EMAIL`. `ADMIN_PASSWORD` is intentionally only used for the one-time bootstrap command.

## Containers

Web and Worker are built as separate Docker images from the same locked pnpm workspace.

```bash
pnpm docker:build:web
pnpm docker:build:worker
```

Both images use Node 22.22.0 and pnpm 10.17.1, install dependencies from the committed
`pnpm-lock.yaml` with `--frozen-lockfile`, and run as the non-root `node` user.

- `apps/web/Dockerfile` builds and starts the SSR web runtime on port 3000.
- `apps/worker/Dockerfile` builds and starts the Graphile Worker runtime.
- Application containers keep no critical persistent state. PostgreSQL remains external and is
  addressed only through `DATABASE_URL`.
- Build output, source code and installed dependencies are immutable image contents; runtime
  writes are not used as a persistence mechanism.

## Runtime observability

Web and worker emit newline-delimited JSON logs with a stable event field and service name.

The web runtime:

- assigns or accepts safe `x-request-id` and `x-correlation-id` values;
- echoes both IDs on responses;
- records method, path, status, and request duration;
- exposes `GET /health` with a live PostgreSQL probe;
- returns HTTP 503 when database health is unavailable or failing;
- logs unexpected server errors through a redacting serializer without returning secret details.

The worker emits structured lifecycle and job outcome events. Logger redaction removes configured
secret values, sensitive-key fields, PostgreSQL credentials, and bearer tokens.

```bash
pnpm observability:verify
pnpm smoke:observability
```

## Runtime configuration

Server runtime configuration is validated through `@akiksystems/config/env`.

- Web: typed `NODE_ENV`, typed/coerced `PORT`, optional server-only `DATABASE_URL`.
- Worker: requires a valid PostgreSQL `DATABASE_URL`.
- Database CLI: requires the same PostgreSQL connection contract.
- Invalid or inconsistent values fail immediately with an explicit field-level error.
- Browser-safe configuration is an explicit projection; server secrets are never copied into it.

## Requirements

- Node.js 22.22 or newer.
- pnpm 10 or newer.
- PostgreSQL for database, worker, and full web health checks.

## Commands

```bash
pnpm install
pnpm dev:web
pnpm dev:worker
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm db:verify-system-technologies
pnpm smoke:web
pnpm smoke:worker
pnpm smoke:observability
pnpm config:verify
pnpm observability:verify
pnpm format:check
```

## Backlog traceability

AKS-001 through AKS-015 establish the monorepo, strict conventions, SSR runtime, PostgreSQL/Kysely,
Graphile Worker, typed fail-fast runtime configuration, baseline observability, reproducible separated
Web/Worker containers, permanent PR/push continuous integration, explicit bilingual routing, shared UI foundations, staging qualification, a secured single-user administration, the foundational System domain model, and reusable ordered System↔Technology relations.
