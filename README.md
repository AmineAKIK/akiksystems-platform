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
- The shared primitives are `Text`, `Heading`, `Link`, `Button`, `Container`, `BrandMark`, and `BrandSignature`.
- Primitives stay intentionally semantic and low-opinionated; page-specific composition remains in the web app.
- The current bilingual walking-skeleton pages consume these primitives directly as proof of integration.

### Global identity

`@akiksystems/ui` owns the reusable AkikSystems identity primitives.

- `BrandMark` is an inline SVG mark that inherits `currentColor`, works without network assets, and can be decorative or explicitly labelled when used alone.
- `BrandSignature` combines the mark and AkikSystems wordmark into one accessible linked signature with controlled size variants.
- Brand markup and styling live in the shared UI package rather than individual routes or the Experience Shell.
- The public shell consumes the shared signature and supplies only route-specific destination/accessibility context.

### Global destinations

The five first-level public destinations are code-defined in one typed registry: Profile, Systems, Writings, Learning, and Work with us.

- Each destination owns stable EN/FR labels, a first-level slug, a concise localized description, and href generation.
- Deep routes resolve back to their first-level destination from the URL, so shell context does not depend on page-specific conditionals.
- Current paths are Profile `/en/profile` ↔ `/fr/profil`, Systems `/en/systems` ↔ `/fr/systems`, Writings `/en/writings` ↔ `/fr/ecrits`, Learning `/en/learning` ↔ `/fr/apprentissage`, and Work with us `/en/work-with-us` ↔ `/fr/travailler-ensemble`.
- Minimal SSR route surfaces make every first-level destination directly addressable now; richer navigation and Home presentation remain scoped to later L2 tickets.

### Desktop global navigation

The Experience Shell exposes Home plus all five global destinations from every localized public route.

- Navigation items are generated from the typed global destination registry rather than duplicated route-specific markup.
- Deep routes resolve to their first-level destination, so `/en/systems/sentinel` keeps Systems marked with `aria-current="page"`.
- The desktop composition keeps the complete first-level information architecture visible in one persistent shell.
- Narrow layouts retain the same complete destination set in an overflow-safe row; the dedicated touch-oriented mobile navigation treatment remains scoped to AKS-041.

## Experience Shell

The public `/:locale` route boundary owns the AkikSystems Experience Shell.

- AkikSystems identity, primary navigation, current route context, locale access, and the public experience outlet are rendered once around all localized public pages.
- Direct deep links remain understandable because child route loader data can enrich the shell context, including the current published System title.
- The shell provides a first-focus skip link and responsive desktop/mobile layout without turning domain renderers into navigation containers.
- Public domain renderers stay responsible for their content; private admin preview remains outside the public shell.

## System domain model

The core System model keeps shared identity separate from localized editorial content.

- `systems` owns the stable UUID identity and technical lifecycle (`active` / `archived`).
- `system_localizations` owns locale-specific slug, title, summary, editorial state, and publication timestamp.
- EN and FR publication state is independent for the same System identity.
- Slugs are unique within a locale, allowing the same slug in different languages.
- Lifecycle and editorial publication are separate state machines; archiving a System does not rewrite localization publication state.
- Database constraints enforce supported locales, allowed states, publication/archive timestamp consistency, and cascading localization deletion.

Publication readiness is explicit: a localized System requires a valid slug, non-empty title and summary, plus a valid versioned presentation document containing at least one block before it can be published.

### Publication readiness

Publication readiness is a shared domain rule rather than UI-only validation.

- A localization is ready only when its slug is valid, title is non-empty, summary is non-empty, and `presentation_document` is valid v1 with at least one block.
- The shared `validateSystemPublicationReadiness` helper returns understandable reasons for incomplete content.
- The Sentinel workspace shows readiness independently for EN and FR.
- PostgreSQL prevents incomplete rows from entering or remaining in `published` state, including later edits that would make an already-published localization incomplete.
- Actual publish/unpublish controls remain scoped to AKS-023; AKS-022 defines and enforces the precondition.

### Public localized System route

Published Systems are directly accessible by localized deep link.

- `/:locale/systems/:slug` resolves through the AKS-026 `getPublishedSystem` boundary and renders through the AKS-027 shared renderer.
- Draft localizations and archived Systems return 404 because the public route never queries admin state directly.
- EN and FR remain independent; each URL exists only when that specific localization is published.
- Initial HTML is server-rendered and includes the System title, summary, technologies, origin context, links, and structured presentation without requiring client JavaScript.
- Contextual media uses `/:locale/systems/:slug/assets/:assetId`; the asset route verifies the owning System is active and that the requested localization is published before reading private object storage.
- Public HTML and media responses use short cache lifetimes with stale-while-revalidate.
- Responsive layout comes from the shared renderer styles; technical SEO metadata/canonical/hreflang/OpenGraph remains intentionally scoped to AKS-030.

### System renderer v1

The v1 System renderer is a code-defined semantic rendering boundary shared by private preview and the upcoming public route.

- `SystemDetailView` composes the System title/summary, technology list, typed links, localized origin context, and structured presentation.
- `SystemPresentation` renders the version-1 presentation document in stored source order.
- The six controlled block types map to semantic HTML: headings → `h2/h3`, paragraphs → `p`, lists → `ol/ul`, code → `pre > code`, images → `figure > img + figcaption`, quotations → `blockquote`.
- Contextual image media uses localized alt/caption metadata; non-image media renders as a localized document link rather than invalid image markup.
- Missing media references render nothing instead of producing a broken image.
- Images are lazy-loaded and asynchronously decoded; broader responsive-media optimization remains scoped to the later Systems milestone.
- SSR tests assert semantic output and block ordering without requiring client JavaScript.
- AKS-024 already exercises this renderer through secure draft preview; AKS-028 will connect it to the localized public Sentinel route.

### Public System read model

Public System consumption goes through one explicit query boundary: `getPublishedSystem(db, { locale, slug })`.

- The root query requires `systems.lifecycle = active` and the requested localization to be `published`.
- Draft localizations return `null`, including when another locale for the same System is published.
- Archived Systems return `null` even if a localization still carries a published editorial state.
- The returned projection contains only public identity/content plus ordered technologies, localized origin context, typed links, contextual media metadata, and the validated presentation document.
- Admin lifecycle state, editorial state, audit events, storage keys, original filenames, byte sizes, internal timestamps, and content from the other locale are not part of the projection.
- Media is represented by public-safe asset identity and localized metadata; delivery URL construction remains a web/runtime responsibility.
- AKS-027 consumes this projection through the shared System renderer rather than querying admin tables directly.

### Secure unpublished preview

Draft System content can be previewed without creating a public route.

- `/admin/systems/:systemId/preview/:locale` requires an authenticated admin session.
- Preview uses the shared `SystemDetailView` renderer intended for the public System detail path, so draft review exercises the same semantic rendering surface instead of an admin-only approximation.
- Draft assets are fetched through an authenticated preview asset proxy and remain private in object storage.
- Preview responses send `Cache-Control: private, no-store` and both HTML/meta and HTTP `X-Robots-Tag` directives for `noindex, nofollow, noarchive, nosnippet`.
- Anonymous requests to preview pages and preview assets redirect to admin login.
- No localized draft slug is registered as a public route, so preview content is not discoverable from the public routing tree.
- The published public read model remains scoped to AKS-026; the shared renderer is reused by AKS-027.

### Independent localized publication

System publication is controlled per localization rather than per shared System identity.

- EN and FR content are saved through separate locale-scoped admin actions.
- Each locale has its own Publish / Unpublish control and its own `published_at` timestamp.
- Publishing EN never changes FR state or content; publishing/unpublishing FR never changes EN.
- A locale can publish only after satisfying the AKS-022 readiness contract.
- Editing a draft localization does not write any columns in the other locale, including `updated_at`.
- `EN=PUBLISHED / FR=DRAFT` is an explicitly supported state.
- The public read model remains scoped to AKS-026; AKS-023 guarantees the persisted localized publication boundary it will consume.

### Admin audit trail

Significant private-administration mutations produce readable, append-only audit events.

- `admin_audit_events` records actor user ID/email, action, entity type/ID, optional System/locale scope, minimal metadata, and timestamp.
- Audited operations include initial System creation, archive/restore/lifecycle changes, localized content updates, publish/unpublish, technology stack changes, origin-context changes, typed link changes, presentation updates, and contextual asset upload/deletion.
- Events deliberately exclude passwords, tokens, authentication secrets, raw presentation JSON, summaries, code blocks, and other full editorial payloads.
- PostgreSQL triggers reject UPDATE and DELETE on audit rows so the log is append-only.
- The Sentinel workspace shows the 20 most recent System-scoped events for human inspection.
- Full content rollback/version restoration is intentionally out of scope for AKS-025.

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

### Minimal System presentation editor

The private admin can edit each localized System presentation through controlled semantic blocks.

- `/admin/systems/:systemId/presentation/:locale` edits EN or FR independently.
- The editor supports only the v1 presentation vocabulary: headings, paragraphs, ordered/unordered lists, code, contextual images, and quotations.
- Blocks can be added, removed, and reordered without exposing raw JSON or arbitrary HTML.
- Image blocks select only assets already linked to the current System.
- Every save is parsed and validated again on the server with the shared AKS-019 contract before PostgreSQL is updated.
- Server validation rejects unknown block properties, page-builder semantics, invalid image asset IDs, and image references outside the current System context.
- The editor deliberately does not include layout controls, columns, templates, or styling knobs; public rendering remains code-defined.

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

### Sentinel System workspace

AKS-021 consolidates the Sentinel slice into one domain-specific System workspace.

- `/admin/systems/:systemId` is the coherent editing surface for identity/lifecycle, EN/FR title/slug/summary, ordered technologies, origin Experience context, ordered typed links, presentation and media.
- `/admin` can create the initial Sentinel System identity plus minimal EN/FR localization rows when no System exists yet.
- Presentation and contextual media reuse the specialized editors from AKS-020 and AKS-017 instead of duplicating those capabilities.
- Technology and link ordering remain explicit and are rewritten transactionally from the workspace.
- The origin context is managed as a shared Experience relation, not duplicated System text.
- Publication state is visible but remains intentionally read-only here; publication readiness and EN/FR publishing controls belong to AKS-022/023.

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
pnpm db:verify-admin-audit
pnpm db:verify-presentation-documents
pnpm db:verify-publication-readiness
pnpm db:verify-public-system
pnpm db:verify-independent-publication
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

## L1 Sentinel qualification

The Sentinel vertical slice (AKS-028 through AKS-036) is the first end-to-end System qualification baseline.

- Public Sentinel renders inside minimal AkikSystems context with publication-aware EN/FR navigation.
- Public routes emit technical SEO metadata (title/description, canonical, published-only hreflang, OpenGraph); private preview remains non-indexable.
- CI provisions PostgreSQL 16 and executes the System constraint/read-model verification suite before browser qualification.
- Chromium covers admin login → bilingual edit → private preview → independent publication → localized public SSR.
- The browser gate checks keyboard/focus, semantic structure, 320px reflow, reduced-motion preference, axe serious/critical violations, no-JS reading, and mobile Lighthouse performance.
- The post-Sentinel architecture review is recorded in Linear before the pattern is replicated to later portfolio areas.
- Railway staging health is checked through `GET /health`; published content routes are never used as infrastructure liveness probes.

## Backlog traceability

AKS-001 through AKS-036 establish the monorepo, strict conventions, SSR runtime, PostgreSQL/Kysely,
Graphile Worker, typed fail-fast runtime configuration, baseline observability, reproducible separated
Web/Worker containers, permanent PR/push continuous integration, explicit bilingual routing, shared UI foundations, staging qualification, a secured single-user administration, the foundational System domain model, reusable ordered System↔Technology relations, localized Experience↔System origin context, contextual S3-backed asset management, ordered typed System links, versioned localized presentation documents, a server-validated localized presentation editor, a coherent Sentinel System workspace spanning identity, bilingual content, technologies, professional context, links, presentation, and media, explicit publication-readiness rules enforced in the domain, admin, and PostgreSQL, independent EN/FR save/publish/unpublish flows, secure non-indexed preview of unpublished localized System content through the shared renderer, an append-only readable audit trail for significant admin mutations, a single public System read model that excludes drafts, archived Systems, admin state, private storage details, and other-locale content, a semantic SSR-capable System renderer v1 shared by preview and public delivery, a localized deep-linkable public System route backed only by published read-model data, minimal AkikSystems context around Sentinel, route-level technical SEO with publication-aware alternates, PostgreSQL-backed domain qualification, a real Chromium admin-to-public EN/FR journey, accessibility and mobile performance gates, staging qualification, and a documented post-Sentinel architecture review.
