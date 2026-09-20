# AkikSystems Platform

The production platform behind AkikSystems.

## Workspace

This repository is a pnpm monorepo with two applications and four shared packages:

- `apps/web` — public and private web application surface.
- `apps/worker` — asynchronous worker surface.
- `packages/core` — platform/domain primitives shared across applications.
- `packages/db` — database boundary.
- `packages/ui` — shared UI boundary.
- `packages/config` — shared TypeScript, ESLint, and Prettier conventions.

The application runtimes are intentionally placeholders at this stage. Runtime, database, worker,
routing, and deployment behavior are introduced by later L0 backlog items.

## Requirements

- Node.js 22 or newer.
- pnpm 10 or newer.

## Commands

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm format:check
```

Internal workspace packages use the `@akiksystems/*` namespace. When one workspace starts depending
on another, declare it with the pnpm `workspace:*` protocol rather than a registry version.

## TypeScript policy

The shared compiler configuration enables strict mode and explicitly rejects implicit `any`.
Additional safety checks such as unchecked indexed access and exact optional property types are also
enabled from the start.

## Backlog traceability

This foundation implements the repository capabilities described by Linear items AKS-001 and
AKS-002 in milestone L0.
