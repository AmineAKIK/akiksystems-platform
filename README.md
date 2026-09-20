# AkikSystems Platform

The production platform behind AkikSystems.

## Workspace

This repository is a pnpm monorepo with two applications and four shared packages:

- `apps/web` — React Router Framework Mode web runtime served by Express.
- `apps/worker` — asynchronous worker surface.
- `packages/core` — platform/domain primitives shared across applications.
- `packages/db` — database boundary.
- `packages/ui` — shared UI boundary.
- `packages/config` — shared TypeScript, ESLint, and Prettier conventions.

## Requirements

- Node.js 22.12 or newer.
- pnpm 10 or newer.

## Commands

```bash
pnpm install
pnpm dev:web
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm smoke:web
pnpm format:check
```

The web runtime uses React Router Framework Mode with Vite and a custom Express server. Production
build output is served from `apps/web/build`. The smoke check starts the production server and
verifies an SSR route, a second navigation route, hydration markup, and an HTTP 404 response.

Internal workspace packages use the `@akiksystems/*` namespace. When one workspace starts depending
on another, declare it with the pnpm `workspace:*` protocol rather than a registry version.

## TypeScript policy

The shared compiler configuration enables strict mode and explicitly rejects implicit `any`.
Additional safety checks such as unchecked indexed access and exact optional property types are also
enabled from the start.

## Backlog traceability

The repository foundation tracks the L0 AkikSystems backlog. AKS-001 and AKS-002 establish the
workspace and code-quality conventions; AKS-003 introduces the SSR web runtime.
