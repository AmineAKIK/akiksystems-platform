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
pnpm smoke:web
pnpm smoke:worker
pnpm smoke:observability
pnpm config:verify
pnpm observability:verify
pnpm format:check
```

## Backlog traceability

AKS-001 through AKS-009 establish the monorepo, strict conventions, SSR runtime, PostgreSQL/Kysely,
Graphile Worker, typed fail-fast runtime configuration, baseline observability, reproducible separated
Web/Worker containers, and permanent PR/push continuous integration.
