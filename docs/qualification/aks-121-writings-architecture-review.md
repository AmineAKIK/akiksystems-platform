# AKS-121 — Writings architecture review

## Scope

Review the Writings architecture after AKS-101–120, using real authoring and
reading evidence before the editorial library scales further.

The review tests whether the implementation has preserved the intended product
boundary:

- Notes, Articles, and Essays form one editorial domain rather than three blogs;
- code owns semantics, layout, feed composition, and reading behavior;
- administration owns evolving editorial content rather than page structure;
- EN and FR publication remain independent;
- relationships and taxonomy stay explicit rather than being embedded into rich
  text;
- public delivery reads immutable publication snapshots;
- mobile reading and accessibility are first-class constraints.

## Evidence base

The implemented L6 surface now exercises:

- one Writing entity with `note`, `article`, and `essay` kinds;
- code-owned NORMAL / FEATURED / MAJOR presentation;
- localized Categories and deduplicated Tags;
- explicit Writing ↔ System relations;
- Tiptap authoring against controlled Writing document schema v1;
- paragraphs, H2/H3, ordered/unordered lists, quotations, code blocks, callouts,
  contextual images, and galleries;
- per-locale draft / preview / publish / archive lifecycle;
- one public Writings feed with conditional facets and PostgreSQL full-text
  search;
- contextual related-Writing navigation derived from shared published Systems;
- localized editorial SEO and Article JSON-LD;
- the real French 25-page Essay `Rendre l’attention au réel`;
- a real Article authored from a blank Writing entirely through the private admin
  in AKS-119;
- mobile long-form qualification at 320, 390, and 430 pixel widths in AKS-120.

## What held up well

### One editorial domain remains correct

Keep Note, Article, and Essay as forms of one Writing entity.

The real Article authored in AKS-119 did not require a second content model,
route family, publication service, or renderer. The 25-page Essay and the
admin-authored Article both pass through the same public reader and SEO boundary.

Do not split Writings into separate blogs or introduce a generic page/content
supertype.

### Publication snapshots remain the public truth

Keep immutable per-locale publication snapshots as the only public content
boundary.

Draft body changes, taxonomy changes, System relationships, asset metadata, and
editorial state must remain invisible publicly until the affected locale is
republished.

### Schema v1 is sufficient for current real content

The controlled block vocabulary survived a representative engineering Article
and a 25-page Essay across authoring, preview, publication, SSR, accessibility,
desktop, and mobile.

Keep schema v1 focused on semantic blocks. The review found no evidence that
columns, arbitrary layout, raw HTML, templates, or page-builder controls are
needed.

### Reading behavior remains code-owned

AKS-120 proved that prose measure, typography, media containment, long quotation
wrapping, and wide-code behavior can remain renderer concerns rather than content
attributes.

Keep responsive behavior out of the document model.

### Taxonomy and relationships belong outside rich text

Categories, Tags, and Systems remained useful as explicit reusable relationships
during real authoring.

Keep those identities outside the document JSON. Public snapshots may freeze
their IDs, but rich text should not become a second graph model.

## Architecture findings

### Finding 1 — contextual media was coupled across locales too early

AKS-119 authored and published an EN-only Article, but the media upload form
required both EN and FR alt text before the asset could even exist.

That requirement contradicted the otherwise independent localization model: an
unused FR Writing had to provide metadata solely because EN wanted to use an
image.

The database and publication model already supported the correct boundary:
`asset_localizations.alt_text` is nullable, the editor disables image insertion
when the active locale lacks alt text, and draft/publication validation rejects a
referenced image without alt text in that same locale.

**Decision:** media metadata is localized independently. Upload/update may leave
either locale blank. Alt text becomes mandatory only when that locale actually
uses the image.

This is implemented in AKS-121 and qualified by the real AKS-119 authoring flow:
the image is uploaded with EN alt/caption only, FR metadata remains empty, EN can
insert/publish it, and FR insertion remains disabled until FR alt text exists.

### Finding 2 — no schema v2 is justified yet

AKS-119 identified absent inline marks/hyperlinks, code-language editing,
explicit block move/delete controls, and precise gallery composition as possible
future improvements.

The evidence does not justify changing the persisted document version now:

- the representative Article reached publication without bypassing the editor;
- the real Essay remains readable and inspectable;
- long source strings are now contained safely on mobile;
- code is readable and keyboard-scrollable without syntax-language authoring;
- no real Writing required a custom gallery composition;
- no real Writing required tables.

**Decision:** keep Writing document schema v1 stable through the end of L6.
Do not mutate the version merely to pre-author hypothetical content.

Hyperlinks/inline emphasis remain the most plausible next schema pressure. They
should enter through an explicit compatibility decision once a real Writing
requires clickable editorial citations or inline semantics, rather than through a
generic mark system added speculatively.

### Finding 3 — tables remain intentionally out of scope

AKS-120 mentioned tables in its acceptance wording, but schema v1 intentionally
rejects them and neither real proof required them.

**Decision:** tables remain absent. If a future Writing genuinely needs tabular
data, introduce it as a deliberate schema evolution with authoring, responsive
rendering, keyboard/screen-reader behavior, and migration compatibility designed
together.

### Finding 4 — editor ergonomics are not document architecture

Block movement/deletion discoverability, code-language controls, and gallery
selection/order are real admin ergonomics questions, but none changes the
current public data model.

**Decision:** do not expand the document schema to solve toolbar ergonomics.
Improve those controls only when repeated authoring demonstrates concrete
friction.

## Refinement implemented in AKS-121

- Writing media upload no longer requires EN and FR alt text simultaneously.
- Writing media metadata updates may leave an unused locale blank.
- The existing locale-specific editor gate remains: an image cannot be inserted
  when that locale has no alt text.
- Existing save/publication readiness continues to require alt text for every
  image referenced by the locale being saved/published.
- AKS-119 browser qualification now proves EN-only contextual media without
  fabricating FR metadata.

No database migration is required because asset localization fields were already
nullable and publication snapshots already freeze the localized metadata actually
used.

## Deliberate non-abstractions

Do not add as a consequence of L6 alone:

- a generic CMS page model;
- separate Note/Article/Essay publication stacks;
- raw HTML or arbitrary styling;
- columns/templates/page-builder controls;
- tables without a real editorial case;
- a generic inline-mark framework without compatibility evidence;
- a global media-library workflow;
- a recommendation engine separate from explicit editorial/System context;
- taxonomy embedded inside rich-content JSON;
- mobile-specific document variants.

## Stable boundary after L6

The stable Writings architecture is:

**Writing = one editorial identity. Kind = editorial form. Document v1 = bounded
semantic blocks. Categories/Tags/Systems = explicit graph context. Publication
snapshot = public truth. Media metadata = locale-specific at point of use.
Renderer = code-owned reading behavior.**

This boundary is considered ready to scale the editorial library without turning
AkikSystems into a generic CMS or weakening localization/publication integrity.
