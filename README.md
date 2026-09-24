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

## System content provisioning and recovery

Database migrations own schema evolution, not editorial content. `deploy:migrate`
therefore migrates the schema and backfills publication snapshots for content
that already exists; it does not silently recreate portfolio evidence.

For development or a deliberately empty staging environment, the three
code-backed L4 reference Systems can be provisioned explicitly and
idempotently with:

```sh
pnpm content:bootstrap-l4-reference-systems
```

That command provisions ProtoCap, Oria Nutrition, and Tugères and publishes
their EN/FR snapshots. Sentinel remains domain/admin content rather than a
migration fixture.

The verified DWWM Training can be provisioned independently and idempotently
with:

```sh
pnpm content:bootstrap-dwwm
```

This creates the STUDI Full-Stack Web & Mobile Developer / Développeur web et
web mobile Training for the level-5 Professional Title RNCP 37674, publishes EN/FR, keeps
the state as in progress, and intentionally leaves dates unset because the
current internal source does not establish reliable start/end dates.

Once the DWWM Training and the bilingual Sentinel System are both published,
the verified Sentinel project dossier can be provisioned independently with:

```sh
pnpm content:bootstrap-sentinel-dossier
```

The command creates or synchronizes one bilingual LearningArtifact connected to
both DWWM and Sentinel. Its inspection copy is grounded in the Sentinel dossier
source and the documented examination baseline `v1.0.0-rc.9` /
`ed26a25e3c005cabb0da30a4553dfbbee03afe81`.

AKS-094 renders this artifact as an autonomous native Web dossier rather than a
PDF-shaped page. The LearningArtifact body remains editable from the existing
admin and uses a constrained content contract: ten `##` sections — context,
objectives, architecture, design choices, security, tests, difficulties,
results, limits, and evidence — plus optional `-` list items. Code owns the
reading hierarchy, table of contents, responsive composition, evidence cards,
and relationship surfaces; admin owns the evolving copy. Generic
LearningArtifacts keep their existing renderer.

The source document still carries explicit finalization markers, so the Web
reading does not attach or imply a finalized PDF. Source-document publication
is deliberately separate from the native Web reading.

AKS-095 provides the source-PDF publication workflow from the LearningArtifact
admin. The original PDF is uploaded directly to private object storage as an
`application/pdf` asset; upload/replacement marks both localized drafts as
changed but does not mutate existing public snapshots. The source becomes
public for a locale only after that LearningArtifact locale is explicitly
republished, through its stable `/source` deep link with inline PDF delivery.
Removing or replacing a draft source preserves the prior storage object so an
older published snapshot cannot be broken. Re-running the Sentinel dossier
bootstrap also preserves an attached source asset.

The original Sentinel dossier PDF is intentionally not generated from the
Markdown dossier and is not stored in the Sentinel Git repository or its
`v1.0.0-rc.9` release. Publishing AKS-095 therefore requires importing the
actual original PDF through the admin; a rendered substitute must not be
presented as the original source.

AKS-097 treats Credential as the stable extension boundary for future diplomas,
professional titles, and certifications. New Credential instances are created
from the private Learning admin, choose one of the existing evidence kinds, may
optionally connect to Training/source/issuer verification, and publish EN/FR
independently. No credential-specific route, schema, or renderer is required:
the Learning overview provides summary depth and the generic Credential route
provides inspection depth.

AKS-098 gives every published Learning surface one SEO contract. Learning
overviews, Trainings, Credentials, and LearningArtifacts render localized
title/description, explicit indexing directives, Open Graph/Twitter metadata,
canonical URLs, reciprocal locale alternates, and an English `x-default`
directly in the initial server-rendered HTML. Missing or unpublished detail
routes render a noindex fallback while still returning 404. Raw Credential and
LearningArtifact source documents send an HTTP `X-Robots-Tag: noindex`
directive so the autonomous HTML inspection route remains the search surface.

AKS-100 closes the Learning architecture review by preserving three distinct
domain boundaries: Training is context, while Credential and LearningArtifact
are evidence. The review deliberately does not introduce an LMS layer or a
generic Evidence supertype. LearningArtifact may now stand alone when relevant
learning has no honest formal Training context; its Training, System, and source
relations remain explicit and optional. Training detail pages resolve Credential
and LearningArtifact relationships from publication snapshots, so draft relation
changes cannot leak into the public experience before republication.

AKS-101 establishes Writings as one editorial domain rather than three separate
content systems. A single Writing identity carries a kind (`note`, `article`,
or `essay`) and editorial weight (`normal`, `featured`, or `major`), while
localized EN/FR drafts publish independently to immutable public snapshots.
Editorial weight remains a controlled domain signal; AKS-111 maps it to fixed
feed compositions while keeping layout code-owned. The initial renderer intentionally accepts plain text
paragraphs only, keeping page semantics code-owned until the Tiptap and
rich-content schema tickets earn a broader controlled document model.

AKS-102 adds reusable editorial Categories as their own stable identities rather
than copying category labels into individual Writings. Category slug, name,
description, and publication are localized independently in EN/FR; the
Writing↔Category relation is ordered and many-to-many. A Writing publication
snapshot captures the Category identities assigned at publication time, while
current published Category snapshots resolve the localized labels and deep
routes. This keeps draft assignment edits isolated until the Writing is
republished, keeps draft Category copy isolated until that Category locale is
published, and prevents missing French Category copy from falling back to
English. Category routes organize published Writings without introducing a
generic filter UI, styling controls, or page-builder semantics.

AKS-103 adds reusable localized Tags with a stricter deduplication boundary.
Each Tag has one stable lowercase canonical key that is unique across the
editorial domain, while public slug and name publish independently in EN/FR.
Writing↔Tag relations are ordered and many-to-many, and a Writing publication
snapshot captures Tag identities at publication time. Public reads resolve only
Tag snapshots published in the requested locale, so draft Tag edits and draft
assignment changes cannot leak and missing French labels never fall back to
English. Tag deep routes make the taxonomy inspectable and future-ready for
search/filter work without introducing the filter UI early.

AKS-104 relates Writings to Systems without copying System-owned content into
the editorial relation. The private Writing admin owns an ordered many-to-many
Writing↔System relation; publishing a Writing locale captures only the stable
System identities in that Writing snapshot. Public Writing pages resolve those
identities through current published System references for the requested locale,
while public System pages resolve Writings whose published snapshots reference
that System. Draft relation changes remain invisible until the corresponding
Writing locale is republished, EN/FR remain independent, and a missing localized
System publication never falls back across languages. Updating a published
System title or summary is reflected through System-owned publication data
without republishing related Writings.

AKS-105 integrates Tiptap as a headless Writing editor inside the existing
AkikSystems admin instead of adding a generic CMS surface.

AKS-106 turns that draft payload into the shared, versioned Writing rich-content
contract. Schema v1 supports paragraphs, H2/H3 headings, ordered and unordered
lists, quotations, code blocks, callouts, contextual image references, and
galleries. Images point to Asset UUIDs; AKS-107 owns contextual upload, localized
alt text/captions, and the final media-management workflow. Tables are deliberately
not in v1 because no current real Writing case justifies their complexity.

The document carries `version: 1`, is validated through the shared core contract,
and is persisted under `writing_localizations.editor_document`. PostgreSQL
enforces the versioned document envelope while the application validator rejects
unknown nodes, marks, raw HTML, arbitrary attributes, styles, templates, columns,
and other page-builder semantics. Existing AKS-105 documents are migrated to
`version: 1`.

Publishing freezes the validated rich document into the Writing publication
snapshot and also keeps the plain-text `body` projection for compatibility.
Older snapshots without the rich document remain readable by deriving schema v1
from their stored body.

AKS-109 makes the structured document the public rendering source. One shared
React renderer maps schema v1 to controlled semantic HTML: paragraphs, H2/H3,
ordered and unordered lists, block quotations, code blocks, callouts, images,
and galleries. Public and authenticated preview routes use the same renderer.
Text is rendered as React text content rather than injected HTML, and the schema
still rejects marks, raw HTML, arbitrary attributes, styles, columns, and
templates.

Writing media stays private in object storage. Public image routes only serve an
Asset UUID when that UUID is frozen into the requested localized Writing
publication snapshot; authenticated previews use the private admin asset route.
The renderer consumes the frozen localized alt text/caption and dimensions from
the snapshot, so editorial metadata cannot drift after publication. The admin
Tiptap surface exposes only schema-v1 block controls and therefore remains an
editor, not a page builder.

AKS-110 turns the Writings destination into one living editorial surface. Note,
Article, and Essay remain explicit forms in metadata and admin, but they are not
split into separate public blogs, tabs, or route families. The overview, Category,
and Tag surfaces all reuse the same ordered feed component and every item keeps
its localized deep link. The feed preserves the existing code-defined `editorialPosition` ordering
contract from the Writing read model. Publication timestamps remain reader-facing
metadata rather than becoming implicit layout instructions.

AKS-110 deliberately leaves `editorialWeight` out of presentation. AKS-111
owns that next step: the published weight becomes a private composition hook
without becoming a reader-facing label.

AKS-111 maps `normal`, `featured`, and `major` onto three fixed,
product-owned feed compositions. NORMAL keeps the baseline row, FEATURED gives
the editorial copy more visual room and hierarchy, and MAJOR uses a broader
desktop composition that collapses back to one safe column on narrow screens.
The same semantic list/article structure, localized deep links, taxonomy links,
and publication ordering remain intact across all three variants.

The admin still authors only the existing editorial-weight enum. It does not
expose layout, template, style, column, spacing, or arbitrary presentation
controls. Category and Tag routes reuse the same feed component, so a published
Writing carries one editorial signal consistently across the editorial surface
without turning content management into page building.

AKS-112 gives Writing deep links a dedicated long-form reading composition.
The page uses the wide platform container only as an outer canvas: prose remains
on a controlled 44rem measure with increased line-height, while code, contextual
media, and galleries can use a wider 64rem track. Code preserves whitespace and
scrolls inside its own block rather than widening the document; published images
keep responsive source variants, intrinsic dimensions, lazy loading, localized
alt text, and captions.

The reader is one semantic article on desktop and mobile. Its title, summary,
taxonomy, controlled rich document, publication boundary note, and return path
retain the existing bilingual deep-route contract. Related Systems move after
the reading flow so supporting evidence does not interrupt the article itself.

Writing detail routes also opt the existing global Experience Shell into a
`reading` mode. The same Home/destination navigation, local context, locale
switch, skip link, and mobile disclosure remain available, but the desktop shell
uses a smaller fixed footprint so navigation stays present without competing
with the article. The admin preview reuses the same reader component, preserving
preview/public rendering parity without adding a second presentation system.

AKS-113 confronts that reader with the existing 25-page French essay
*Rendre l’attention au réel*. The native Writing is generated from the original
ProtoCap PDF rather than rewritten for the portfolio, publishes as `ESSAY / MAJOR`,
retains the source publication date (16 September 2026), and deliberately does
not fabricate an English localization. When the published ProtoCap System is
available, the Writing links to it through the existing Writing↔System relation
instead of copying System content into the essay.


AKS-114 keeps Notes inside that same Writing domain while giving them a
deliberately lighter authoring contract. A Note localization needs a slug, title,
and direct paragraph body; it does not ask the editor to write a separate
summary or use the long-form rich-block toolbar. Publication derives the feed
excerpt from the Note body, requires non-empty content, and rejects non-paragraph
rich structure so changing an Article or Essay to NOTE cannot carry hidden
long-form layout forward. Notes still use the same bilingual publication
snapshots, deep links, editorial feed, taxonomy, related-System model, preview,
accessibility, and responsive reader as every other Writing.


AKS-115 keeps that unified feed visually quiet until filtering is genuinely
useful. The public overview exposes no filter chrome below six published
Writings, and it also stays hidden when a larger corpus has no discriminating
type, Category, or Tag dimension. Once the threshold is met, filtering remains
on the same localized overview route through ordinary GET query parameters:
`type`, `category`, and `tag`. Category and Tag are presented together as
the thematic layer; no separate Theme entity, blog, tab, or route family is
introduced.

Filter options and counts are derived only from the published Writing read model.
Unknown query values are ignored, multiple valid dimensions compose with AND
semantics, editorial order is preserved, and filtered output is resolved in SSR
rather than hidden client-side. Category and Tag deep routes remain available as
their existing taxonomy inspection surfaces, while AKS-115 itself creates no new
editorial silo. The filter form is keyboard/native-form accessible, bilingual,
and collapses to one column on narrow screens.


AKS-122 begins L7 with a narrow Work with us content boundary. The public
destination keeps section order and layout in code while the private admin owns
localized EN/FR copy and publishes each locale independently as a snapshot. The
model reserves the fixed L7 sections for the following tickets without exposing
page-builder controls. AKS-122 intentionally does not create the public inquiry
form or persist contact details; AKS-127+ owns that boundary.

AKS-123 fills the first reserved L7 section with bilingual open-situations copy. It welcomes both organizations and individuals, asks visitors to describe the situation in their own words, and explicitly keeps framing after the first human exchange. The content is provisioned with `pnpm content:bootstrap-work-with-us-open-situations`; the bootstrap is idempotent and does not overwrite an already-authored situations draft. It deliberately leaves capabilities, collaboration, inquiry, and privacy sections for their later tickets.

AKS-124 fills the capabilities section with concrete bilingual engineering abilities while keeping them deliberately combinable rather than packaging them as services. The copy covers bounded system design, architecture and interfaces, web/internal/data-backed software, integration and automation, and inspectability through tests, documentation, observability, and explicit limits. `pnpm content:bootstrap-work-with-us-capabilities` provisions the copy idempotently, preserves authored capability drafts, and leaves collaboration, inquiry, privacy, pricing, and project qualification to later boundaries.

AKS-125 fills the collaboration section with the understand-first, frame-after-contact sequence in direct bilingual copy. The first exchange is explicitly for understanding the situation rather than qualifying a predefined project; only after that human exchange can a useful next step be framed together around boundaries, responsibilities, and expected evidence. `pnpm content:bootstrap-work-with-us-collaboration` provisions the copy idempotently, preserves authored collaboration drafts, exposes no internal methodology name, and leaves inquiry/contact capture and privacy to later L7 tickets.

AKS-126 adds a deliberately small commercial proof layer by reusing the existing published `SystemReference` contract instead of copying System content into Work with us. The code-owned selection is ProtoCap plus Tugères: each card exposes only the published title, summary, role/maturity transparency and canonical System link. Oria Nutrition remains a published System but is intentionally excluded from this surface, proving that Work with us is not a second Systems library. The first-contact flow itself remains unchanged and no inquiry or qualification fields are introduced.

AKS-121 closes the L6 architecture review using the real authoring and mobile
evidence from AKS-119/120. The review keeps one Writing domain, publication
snapshots as public truth, schema v1 as the bounded semantic document contract,
and responsive reading behavior in code. It deliberately does not introduce a
schema v2, tables, page-builder controls, or speculative inline-mark framework.
The concrete refinement is locale-independent contextual media: EN and FR alt
text/captions can now be authored independently, while insertion/save/publication
still require alt text in the locale that actually uses the image. The complete
decision record lives in
`docs/qualification/aks-121-writings-architecture-review.md`.

AKS-120 qualifies long-form mobile reading beyond a simple overflow check.
Chromium exercises the real 25-page French Essay and the rich admin-authored
Article from AKS-119 at 320, 390, and 430 pixel viewport widths. The gate checks
minimum prose size, generous line-height, sustained scroll depth, final-content
reachability, local horizontal code scrolling without page drift, long-quotation
wrapping, contextual-image containment/lazy loading, and axe accessibility.
Writing schema v1 still deliberately excludes tables; AKS-120 records that
ticket/schema mismatch rather than adding a test-only table or silently widening
the content model. Full evidence lives in
`docs/qualification/aks-120-long-form-mobile-reading.md`.

AKS-119 qualifies the Writing admin as a real authoring path rather than only
a collection of isolated controls. CI creates a blank ARTICLE/FEATURED Writing,
types a representative engineering article through the visible Tiptap UI,
uploads and inserts contextual media, assigns the existing Category, Tag, and
ProtoCap System context, previews it, publishes EN only, then verifies the same
content in SSR, desktop Chromium, and a 390 × 844 mobile viewport. The
qualification never writes the hidden editor payload, calls a content bootstrap,
or mutates PostgreSQL directly. Detailed evidence and the editor capability gaps
observed during the exercise live in
`docs/qualification/aks-119-real-writing-authoring.md`.

AKS-118 gives every published Writing detail a first-class localized SEO
contract. The publication snapshot drives title/description, canonical URL,
published-only hreflang alternates, Open Graph/Twitter metadata, Article
publication time, and server-rendered JSON-LD. Note, Article, and Essay remain
one editorial system and therefore share the Schema.org `Article` type while
retaining their form through `genre`. Categories, tags, and published System
context enrich structured data without inventing missing translations or
modification timestamps.

AKS-117 keeps related editorial navigation contextual rather than promotional.
A Writing detail may surface at most two other published Writings when they share
one or more published System identities with the current Writing. The current
Writing is excluded, duplicate candidates are collapsed, stronger shared-System
context wins before the existing editorial-position order, and no contextual
block is rendered when the Writing has no matching published peers. This
selection is resolved server-side and appears only after the reading flow, so it
does not interrupt long-form content or create a second recommendation system.

AKS-116 adds search to that same editorial surface without introducing an
external search service or a separate results application. Each published
Writing snapshot owns a generated PostgreSQL `tsvector`: title terms receive
weight A, summary terms weight B, and body terms weight C. English publications
use PostgreSQL's `english` text-search configuration and French publications use
`french`; a GIN index keeps matching on the publication table rather than
scanning draft authoring data.

The public EN/FR overview accepts a normalized `q` GET parameter and resolves
matches in SSR with `websearch_to_tsquery`, so quoted phrases, exclusions, and
ordinary search terms use PostgreSQL semantics. Relevance ranks search results
before editorial position as the deterministic tie-breaker. Drafts, archived
Writings, and the other locale never enter the result set. Search and AKS-115
facets compose on the same overview route: the six-item filter threshold remains
based on the full published corpus, while the final feed is the intersection of
the PostgreSQL search result and any active type/category/tag facets. The search
form is always available, bilingual, keyboard/native-form accessible, and
collapses safely on narrow screens.

AKS-096 keeps Learning and Systems connected without duplicating evidence into
the System domain. LearningArtifact remains the owner of its optional System
relation and the private LearningArtifact admin remains the management surface.
Public System pages resolve only localized published LearningArtifact snapshots
whose `systemId` points to that System, then render concise evidence cards that
deep-link back to Learning. Draft relation or ordering changes do not affect the
System page until that LearningArtifact locale is republished. The reverse
LearningArtifact → System link continues to resolve from the same published
snapshot, so the navigation is bilingual and bidirectional while Training
context remains a distinct Learning concern.

A production recovery is expected to restore PostgreSQL and object storage
together; bootstrap scripts are not a substitute for a content backup or
restore procedure.

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

- `BrandMark` renders the canonical uploaded emblem from `apps/web/public/brand/AKSYS.svg`; the vector master remains untouched and display treatment is handled by shared UI CSS.
- `BrandSignature` combines that emblem and the AkikSystems wordmark into one accessible linked signature with controlled size variants.
- The same canonical SVG is used for the global favicon and Safari mask icon, so browser identity and in-product identity cannot drift.
- Brand markup and styling live in the shared UI package rather than individual routes or the Experience Shell.
- The public shell, Home portal, and private administrator sign-in consume the shared identity primitives.

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

### Mobile global navigation

At narrow viewports, the Experience Shell switches from the persistent desktop row to a native disclosure menu.

- The menu uses semantic `details/summary`, so opening and closing require no client-side JavaScript.
- Home and all five global destinations remain available, with the current first-level destination marked by `aria-current="page"`.
- Menu links provide at least 44px touch targets, and the shell preserves the route context and locale control outside the disclosure.
- The browser qualification exercises the menu at 320px, verifies collapsed/open behavior, touch target size, active deep-route orientation, and no horizontal page overflow.

### Route transition system

Public shell navigation is progressively enhanced with React Router View Transitions.

- Internal Home, destination, locale, and local-context links remain navigable anchors in SSR output and still work without client JavaScript.
- On supporting browsers, client-side navigation opts into the native View Transition API.
- The Experience Shell stays visually stable while the experience outlet uses a short 160ms opacity/vertical transition to reduce perceived rupture.
- Motion is limited to compositor-friendly opacity and transform properties; route completion is never delayed behind an animation.
- Navigation remains authoritative and interruptible: transition state does not gate input or route completion.
- Timing and distance are centralized as CSS custom properties.
- With `prefers-reduced-motion: reduce`, route duration collapses to 1ms and travel to 0rem; the route still changes normally, preserving all content, focus targets, deep links, and navigation semantics.
- The reduced-motion contract is qualified in Chromium at both 1280px desktop and 320px mobile widths.

### Local route context

Deep public routes expose compact semantic context inside the Experience Shell rather than a large breadcrumb trail.

- First-level routes show only the active destination.
- A deep route can provide a generic `localContext` payload with a current title and optional localized alternate URL.
- When a child title exists, the shell renders a compact parent/current pair such as `Systems / Sentinel`, with the parent linked and the current item marked by `aria-current="page"`.
- The contract is domain-neutral so later Writings or Learning detail routes can reuse it without System-specific shell logic.
- The context is visible on desktop and mobile, truncates safely in constrained widths, and remains part of the initial SSR output.

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
- The draft workspace may become incomplete while an older public snapshot remains stable; publication readiness is checked again before replacing that snapshot.
- PostgreSQL still protects the legacy draft editorial-state invariants, while `system_publications` is the authoritative public boundary.
- Publish materializes a locale-scoped snapshot; Unpublish removes that snapshot.

### Public localized System route

Published Systems are directly accessible by localized deep link.

- `/:locale/systems/:slug` resolves through the AKS-026 `getPublishedSystem` boundary and renders through the AKS-027 shared renderer.
- Public reads resolve only from `system_publications`; draft edits cannot change the visible title, summary, proof contract, presentation, links, or media until that locale is published again.
- Archived Systems return 404 even when a prior publication snapshot still exists.
- EN and FR remain independent; each URL exists only while that locale has a publication snapshot.
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

- The root query requires `systems.lifecycle = active` and a matching locale/slug row in `system_publications`.
- Draft workspace state is never queried to assemble public content; an existing public snapshot remains stable while a new draft is edited.
- Archived Systems return `null` even if a publication snapshot still exists.
- The returned projection contains only public identity/content plus ordered technologies, localized origin context, typed links, contextual media metadata, and the validated presentation document.
- Admin lifecycle state, editorial state, audit events, storage keys, original filenames, byte sizes, internal timestamps, and content from the other locale are not part of the projection.
- Media is represented by public-safe asset identity and localized metadata; delivery URL construction remains a web/runtime responsibility.
- AKS-027 consumes this projection through the shared System renderer rather than querying admin tables directly.

### Secure unpublished preview

Draft System content can be previewed without creating a public route.

- `/admin/systems/:systemId/preview/:locale` requires an authenticated admin session.
- Preview uses the same experience resolver/renderers as public detail and applies the same `evidence_policy`, so `documented_only` cannot expose live/demo links in preview that public readers would not see.
- Draft assets are fetched through an authenticated preview asset proxy and remain private in object storage.
- Preview responses send `Cache-Control: private, no-store` and both HTML/meta and HTTP `X-Robots-Tag` directives for `noindex, nofollow, noarchive, nosnippet`.
- Anonymous requests to preview pages and preview assets redirect to admin login.
- No localized draft slug is registered as a public route, so preview content is not discoverable from the public routing tree.
- The published public read model remains scoped to AKS-026; the shared renderer is reused by AKS-027.

### Independent localized publication

System publication is controlled per localization rather than per shared System identity.

- EN and FR content are saved through separate locale-scoped admin actions.
- Each locale has its own Publish / Unpublish control and one row in `system_publications` when public.
- Publishing EN atomically replaces only the EN snapshot; FR is untouched, and vice versa.
- A locale can publish only after satisfying the AKS-022 readiness contract.
- Saving localized or presentation content marks that workspace locale draft without deleting its previous public snapshot.
- Shared System changes such as technologies, origin context, evidence policy, presentation kind, links, or contextual assets mark both locale workspaces draft; the already-published snapshots remain unchanged until republished.
- `EN=PUBLIC / FR=DRAFT-ONLY`, `EN=PUBLIC+NEW-DRAFT / FR=PUBLIC`, and the inverse states are explicitly supported.

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

### Profile post-CV value-add qualification

AKS-068 qualifies Profile for a visitor who already knows common CV facts and should discover meaningful new context rather than a repetition.

- The automated proxy first establishes a deterministic CV-like baseline in a fresh browser context: identity, professional title, Marelli, languages, and mobility.
- It then visits the localized Profile on desktop/mobile in EN/FR.
- Identity may repeat for orientation, but Marelli chronology must stay outside the first view and remain collapsed inside the professional-evidence disclosure.
- The test verifies new value beyond the baseline: immediate Sentinel proof, a concrete How I work principle linked to Sentinel, a Technical Capability, and the development/AkikSystems technological-journey stage.
- Technical depth must add capability context rather than regress into a React/Docker-style tool list.
- CI records structured observations with `priorCvExposure: "simulated-baseline"` and the newly discovered evidence/context.
- This is a deterministic product proxy, not a substitute for a human study using the real CV PDF. A human post-CV study should still ask what new information or evidence the Profile added after reading the CV.

### Profile direct-entry comprehension qualification

AKS-067 qualifies the Profile as a first-contact destination for someone who has not seen the CV.

- The automated proxy starts from a fresh browser context and loads `/en/profile` or `/fr/profil` as the first visited route.
- It does not visit Home, the source-CV route, or any other context first.
- Desktop and mobile scenarios verify the visitor can identify Amine, his professional position, what he builds, and the immediate Sentinel proof from the first reading.
- The test then verifies that one intentional disclosure action reveals a concrete How I work principle and a concrete Technical Capability.
- The recorded CI observation explicitly marks `priorCvExposure: false` and captures the resolved proof deep link.
- This is a deterministic comprehension proxy, not a substitute for a human comprehension study. Human validation should still ask participants to describe who Amine is, what he builds, how he works, and where proof lives without prompting.

### Profile progressive depth

Profile keeps the first reading immediately scannable and moves deeper proof behind native, one-step disclosures.

- Identity, positioning, immediate System proof, languages, and mobility remain visible on first reading.
- Deeper content is grouped into three stable native `details` disclosures: technical depth, professional evidence, and How I work.
- Disclosures are closed by default and open with one intentional pointer or keyboard action.
- All deeper content remains in SSR HTML; progressive depth does not depend on JavaScript.
- Technical depth contains the technological journey and Technical Capabilities.
- Professional evidence contains selected relevant Experience and additional representative Systems.
- How I work contains concise principles and their optional System examples.
- Existing deep System links remain real routes; disclosures do not duplicate evidence.
- EN/FR labels are localized and both collapsed and expanded states remain mobile-safe.

### Profile technological journey

The Profile technological journey is a fixed five-step technical progression, not a complete autobiography or a tool inventory.

- The stage order is structural: programming → networks/telecom → IT support → relevant industry → development/AkikSystems.
- Each stage has concise EN/FR title and summary copy, constrained in PostgreSQL.
- Admin can edit the localized copy but cannot reorder or invent extra stages.
- A stage can reuse at most one Profile-selected evidence object: an Experience for context or a System for inspectable proof.
- Experience evidence is shown as context; System evidence links to its real localized deep route only when that locale is published.
- Concrete technologies such as React or Docker remain outside this narrative and are handled separately from capabilities.
- The public timeline is responsive and preserves the same five-step order in EN/FR.

### Profile How I work

Working principles stay deliberately short and practice-oriented, with optional links to inspectable System evidence.

- Principle titles are limited to 80 characters and details to 240 characters in both server validation and PostgreSQL.
- Internal methodology names remain excluded from public copy.
- Each principle may reference one active System as an evidence/example relation.
- The public Profile exposes that example only when the referenced System is published and presentation-ready in the current locale.
- The example link reuses the System title and deep route without copying its summary into the principle.
- Evidence association is administered separately from the bilingual principle text and is audit logged.
- Re-editing the ordered principle text preserves evidence associations by principle position.

### Profile first view

The Profile first view is composed as identity plus immediate proof rather than a generic portfolio hero.

- Portrait, display name, professional title, introduction, and foundational copy establish the professional position.
- The first published representative System is promoted as immediate proof with its live localized summary and deep link.
- That System is removed from the lower representative-System list to avoid duplicate proof in the same reading path.
- If no representative System exists, the first view remains useful and does not invent placeholder proof.
- The composition collapses to a single column on narrower layouts and remains readable without horizontal scrolling.
- Job-seeker badges or generic open-to-work messaging are intentionally absent; the view communicates mastery through identity and inspectable evidence.
- Later Profile tickets remain responsible for How I work composition, technological journey, Technical Capabilities, and progressive-depth behavior.

### Profile source CV

The Profile can expose one optional source CV artifact without turning the Profile into an HTML copy of the CV.

- `profiles.source_cv_asset_id` points to one shared Asset and remains nullable.
- The CV reference is distinct from the portrait reference.
- `/admin/profile` accepts PDF only, supports replacement/removal, and records audit events.
- Public Profile renders no CV copy; it exposes only an optional localized link.
- The same PDF is served through `/en/profile/cv` and `/fr/profil/cv`.
- Public delivery verifies the referenced Asset is a PDF and returns 404 when no valid CV is linked.
- Replacing the CV updates the Profile reference before best-effort cleanup of the old storage object.

### Profile languages and mobility

Profile languages and mobility are structured facts rather than duplicated localized prose.

- `profile_languages` stores the ordered public language codes `fr`, `en`, and `ar`.
- PostgreSQL restricts the language vocabulary and prevents duplicate codes or positions per Profile.
- `profile_mobility` stores independent `worldwide`, `remote`, and `relocation` flags for the singleton public Profile.
- `/admin/profile` manages language inclusion/order and mobility flags in one controlled form.
- The public Profile localizes labels in code for EN/FR while preserving the same underlying facts.
- Empty language/mobility facts do not create placeholder public copy.

### Profile capabilities

Profile capabilities are modeled and presented separately from concrete Technologies.

- `profile_capability_groups` owns ordered conceptual groupings for the public Profile.
- `profile_capability_group_localizations` localizes group labels independently in EN/FR.
- `profile_capabilities` owns ordered capability identity within a group.
- `profile_capability_localizations` stores localized capability title and optional summary.
- Capability tables have no relation to `technologies` or `system_technologies`; tools remain evidence/context rather than being treated as abilities.
- The Profile admin rejects capability/group titles that exactly reuse an existing Technology name or slug.
- Public Profile renders capabilities as semantic grouped abilities with explanatory copy, not as badges, tags, logos, or a technology stack.
- The section keeps group/capability ordering from the read model and reflows from two columns to one on mobile.
- Concrete technologies such as React or Docker remain visually and conceptually outside the Technical Capabilities section.

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
- Staging and production use isolated Railway Storage Buckets, so assets, credentials and objects are never shared across environments.
- Browser qualification uses an isolated filesystem object root only under `NODE_ENV=test`, so responsive variants exercise real image bytes without requiring external object storage.

### Sentinel System workspace

AKS-021 consolidates the Sentinel slice into one domain-specific System workspace.

- `/admin/systems/:systemId` is the coherent editing surface for identity/lifecycle, EN/FR title/slug/summary, ordered technologies, origin Experience context, ordered typed links, presentation and media.
- `/admin` can create the initial Sentinel System identity plus minimal EN/FR localization rows whenever Sentinel itself is still missing, even if other reference Systems already exist.
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

### Initial environment commissioning

A newly created environment is not considered operator-ready after migrations alone. Run the one-time,
idempotent commissioning command:

```bash
pnpm provision:initial
```

It performs normal migrations/content publication bootstraps, provisions the single configured
administrator, provisions the L4 reference Systems (ProtoCap, Oria Nutrition, Tugères), creates a
minimal bilingual Sentinel draft if Sentinel is still missing, re-runs System publication bootstrapping,
and provisions the published DWWM training.

The command publishes the canonical initial Profile identity used by the qualified public journey when those fields are still empty. Existing operator-authored Profile fields are preserved. It does not fabricate the Sentinel learning dossier before Sentinel itself satisfies publication readiness; the final Sentinel dossier remains an operator-authored/published boundary.

After successful commissioning, normal deployments must return to `pnpm deploy:migrate`.
`ADMIN_PASSWORD` is a one-time provisioning secret and must not be treated as a permanent runtime
credential mechanism.


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
