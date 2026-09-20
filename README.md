# AkikSystems Platform

The production platform behind AkikSystems.

## Workspace

This repository is a pnpm monorepo with two applications and four shared packages:

- `apps/web` — React Router Framework Mode web runtime served by Express.
- `apps/worker` — Graphile Worker asynchronous job runtime.
- `packages/core` — platform/domain primitives shared across applications.
- `packages/db` — typed PostgreSQL boundary using Kysely.
- `packages/ui` — shared UI boundary.
- `packages/config` — shared TypeScript, ESLint, and Prettier conventions.

## Requirements

- Node.js 22.22 or newer.
- pnpm 10 or newer.
- PostgreSQL for database and worker commands.

## Commands

```bash
pnpm install
pnpm dev:web
pnpm dev:worker
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm smoke:web
pnpm smoke:worker
pnpm format:check
```

The web runtime uses React Router Framework Mode with Vite and a custom Express server. Production
build output is served from `apps/web/build`. The smoke check starts the production server and
verifies an SSR route, a second navigation route, hydration markup, and an HTTP 404 response.

## Worker

The asynchronous runtime uses Graphile Worker backed by the same PostgreSQL database.

```bash
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/akiksystems

pnpm dev:worker
pnpm --filter @akiksystems/worker enqueue:foundation
pnpm smoke:worker
```

The `foundation:test` task is the walking-skeleton proof job. It logs its probe ID when executed.
The smoke command starts a worker, queues that task, waits for Graphile Worker's `job:success`
event, and then performs a graceful shutdown.

The production worker process handles SIGINT and SIGTERM itself and calls `runner.stop()` before
exiting.

## Database

Database commands read `DATABASE_URL` directly. Runtime-wide environment validation belongs to a
separate foundation capability; the database package intentionally owns only the connection string
needed for its commands.

```bash
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/akiksystems

pnpm db:check
pnpm db:migrate
pnpm db:migrate:down
pnpm db:verify
```

- `db:check` opens PostgreSQL through the typed Kysely boundary and executes a connectivity probe.
- `db:migrate` applies all pending versioned migrations.
- `db:migrate:down` rolls back the most recently applied migration.
- `db:verify` checks connectivity, applies pending migrations, and executes a typed query against
  the foundation table.

Migration files live under `packages/db/src/migrations` and are ordered by their version prefix.

Internal workspace packages use the `@akiksystems/*` namespace. When one workspace starts depending
on another, declare it with the pnpm `workspace:*` protocol rather than a registry version.

## TypeScript policy

The shared compiler configuration enables strict mode and explicitly rejects implicit `any`.
Additional safety checks such as unchecked indexed access and exact optional property types are also
enabled from the start.

## Backlog traceability

The repository foundation tracks the L0 AkikSystems backlog. AKS-001 and AKS-002 establish the
workspace and code-quality conventions; AKS-003 introduces the SSR web runtime; AKS-004 establishes
the PostgreSQL and Kysely persistence boundary; AKS-005 establishes the asynchronous worker.
