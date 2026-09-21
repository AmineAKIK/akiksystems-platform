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

### Experience context

Professional Experience is modeled once and localized independently from Systems.

- `experiences` owns the stable Experience identity.
- `experience_localizations` stores EN/FR title and summary without duplicating the Experience itself.
- `system_experiences` links Systems to shared Experience records through a typed relation.
- The initial relation kind is `origin_context`, matching the product model `Marelli → origin context → Sentinel`.
- A Sentinel record can therefore reference Marelli context without copying Marelli editorial content into the System.
- Foreign-key cascades remove relation/localization rows when their owning entity is deleted.

Broader Experience publication/profile rules remain outside AKS-016 and can evolve with the Profile milestone.

### Presentation documents

Each localized System can carry a versioned structured presentation document without becoming a page builder.

- `system_localizations.presentation_document` stores the locale-specific document as JSONB.
- Schema v1 is explicit and limited to `heading`, `paragraph`, `list`, `code`, `image`, and `quote` blocks.
- Heading levels are constrained to h2/h3 semantics; lists are ordered or unordered; image blocks reference contextual asset IDs.
- Raw HTML, embeds, templates, columns, arbitrary style/layout properties, and unknown blocks are rejected by the shared server-side validator.
- The document carries an explicit `version: 1`; PostgreSQL also enforces the version, block-array envelope, and absence of unknown top-level controls.
- EN and FR presentation documents remain independent because they live with their respective System localizations.
- Code-defined renderers remain responsible for visual composition; content JSON carries semantics and evidence only.

### System links

Systems can expose multiple ordered external destinations without adding dedicated URL columns.

- `system_links` stores one typed link per row with a UUID, System relation, kind, URL, and position.
- Supported kinds are `live`, `repository`, `demo`, and `documentation`.
- URLs must use HTTP or HTTPS; unsafe schemes such as `javascript:` are rejected by PostgreSQL constraints.
- Position is unique per System and non-negative, giving a stable explicit presentation order.
- Exact duplicate kind+URL pairs are rejected for the same System.
- Deleting a System cascades its links; the System table itself remains free of one-off URL columns.

### Contextual assets

Assets are stored once, related to domain context, and localized independently.

- `assets` stores immutable storage identity plus original filename, MIME type, and byte size.
- `asset_localizations` stores EN/FR alt text and captions without duplicating the binary object.
- `system_assets` links assets to a System with explicit ordering; media is managed from the System context rather than through a public media library.
- Uploads accept JPEG, PNG, WebP, AVIF, and PDF up to 10 MiB. Validation is enforced both before storage and by PostgreSQL constraints.
- Private object bytes live in S3-compatible storage. The web server signs PUT/DELETE requests with AWS Signature Version 4; storage credentials remain server-only.
- Deleting an asset that is still referenced is blocked by database constraints. The admin removal path verifies references before unlinking metadata and deleting the object.
- Staging uses an isolated Railway Storage Bucket, so staging assets do not share credentials or objects with other environments.

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
`ADMIN_EMAIL`. Contextual asset operations additionally require `BUCKET`, `REGION`, `ENDPOINT`,
`ACCESS_KEY_ID`, and `SECRET_ACCESS_KEY`. `ADMIN_PASSWORD` is intentionally only used for the
one-time bootstrap command.

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
pnpm db:verify-assets
pnpm db:verify-presentation-documents
pnpm db:verify-system-experiences
pnpm db:verify-system-links
pnpm db:verify-system-technologies
pnpm smoke:web
pnpm smoke:worker
pnpm smoke:observability
pnpm config:verify
pnpm observability:verify
pnpm format:check
```

## Backlog traceability

AKS-001 through AKS-019 establish the monorepo, strict conventions, SSR runtime, PostgreSQL/Kysely,
Graphile Worker, typed fail-fast runtime configuration, baseline observability, reproducible separated
Web/Worker containers, permanent PR/push continuous integration, explicit bilingual routing, shared UI foundations, staging qualification, a secured single-user administration, the foundational System domain model, reusable ordered System↔Technology relations, localized Experience↔System origin context, contextual S3-backed asset management, ordered typed System links, and versioned localized presentation documents.
