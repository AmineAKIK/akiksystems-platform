# AkikSystems Platform

The production platform behind AkikSystems.

## Workspace

This repository is a pnpm monorepo with two applications and four shared packages:

- `apps/web` — React Router Framework Mode web runtime served by Express.
- `apps/worker` — Graphile Worker asynchronous job runtime.
- `packages/core` — platform/domain primitives shared across applications.
- `packages/db` — typed PostgreSQL boundary using Kysely.
- `packages/ui` — shared UI boundary.
- `packages/config` — shared TypeScript, ESLint, Prettier, and runtime environment contracts.

## Runtime configuration

Server runtime configuration is validated through `@akiksystems/config/env`.

- Web: typed `NODE_ENV`, typed/coerced `PORT`, optional server-only `DATABASE_URL`.
- Worker: requires a valid PostgreSQL `DATABASE_URL`.
- Database CLI: requires the same PostgreSQL connection contract.
- Invalid or inconsistent values fail immediately with an explicit field-level error.
- Browser-safe configuration is an explicit projection; server secrets are never copied into it.

```bash
pnpm config:verify
pnpm --filter @akiksystems/web check:client-secrets
```

The client-secret check scans the built browser bundle and rejects server-only markers such as
`DATABASE_URL`, PostgreSQL URLs, or a secret sentinel.

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
pnpm config:verify
pnpm format:check
```

The web runtime uses React Router Framework Mode with Vite and a custom Express server.
The asynchronous runtime uses Graphile Worker backed by PostgreSQL.

## Database

Database commands read validated `DATABASE_URL` configuration.

```bash
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/akiksystems

pnpm db:check
pnpm db:migrate
pnpm db:migrate:down
pnpm db:verify
```

## Backlog traceability

AKS-001 through AKS-006 establish the monorepo, strict conventions, SSR runtime, PostgreSQL/Kysely,
Graphile Worker, and typed fail-fast runtime configuration.
