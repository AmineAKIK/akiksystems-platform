# AkikSystems Platform

AkikSystems is a bilingual public website built and administered directly through code.

## Architecture

The current repository intentionally has no back-office, CMS, editor, application database, migration layer, background worker, or editorial persistence engine.

The active runtime is:

- `apps/web` — React Router Framework Mode application served by Express;
- `packages/ui` — shared presentation primitives;
- `packages/config` — minimal runtime configuration and observability utilities.

Public content is authored in source files, reviewed in Git, qualified by CI, and deployed with the application.

## Current product scope

The Home page is the established public baseline.

The Systems page is being implemented as the next full public surface.

Profile, Writings, Learning, and Work with us keep their public routes so Home navigation remains stable, but those surfaces are intentionally marked as pending until they are rebuilt directly in code. They are no longer backed by database content.

Privacy, legal notice, and cookie pages remain code-backed public documents.

## Runtime configuration

The web runtime needs only:

```text
NODE_ENV
PORT
```

There is no `DATABASE_URL`, PostgreSQL migration step, worker runtime, object-storage credential, administrator credential, or publication bootstrap command.

## Commands

```sh
pnpm install --frozen-lockfile
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm build
pnpm smoke:web
pnpm smoke:observability
```

The CI workflow also runs Chromium qualification for the Home and Systems pages and builds the production web image.

## Deployment

Production is a single web container on the AkikSystems VPS (OVHcloud):

- built from an exact Git commit with `apps/web/Dockerfile`;
- published only on `127.0.0.1` on the server (port 3100), behind Nginx, which terminates HTTPS;
- served for `akiksystems.com`, `www.akiksystems.com`, `akiksystems.fr` and `www.akiksystems.fr` (`www` redirects to the bare domain);
- monitored through `GET /health`, which does not depend on any external service.

The procedure, Compose file and Nginx reference are in [`deploy/vps/`](deploy/vps/README.md).

Content changes are code changes.
