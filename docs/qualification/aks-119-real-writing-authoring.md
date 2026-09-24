# AKS-119 — Real Writing authoring qualification

## Purpose

Prove that a complete Article can be created from a blank Writing through the
private administration surface, previewed, related to the existing editorial
graph, and published without SQL, bootstrap content, direct JSON editing, or a
code change to manufacture the Article itself.

The reproducible browser scenario lives in
`apps/web/scripts/smoke-platform-browser.cjs` as
`assertRealArticleAuthoringFromAdmin`.

## Qualified scenario

The browser qualification creates an `ARTICLE / FEATURED` Writing from the
same blank admin form available to the real editor. It authors only the English
locale and deliberately leaves French unpublished.

Through visible admin controls it:

1. enters slug, title, summary, and the opening paragraph;
2. authors H2 and H3 sections, a normal paragraph, unordered and ordered lists,
   a quotation, a code block, and a callout in Tiptap;
3. saves and reloads the draft to prove the structured document survives a
   server-backed round trip;
4. uploads contextual image media with localized accessibility metadata, inserts
   it from the Writing media controls, and saves again;
5. assigns the existing `Engineering practice` Category,
   `Software architecture` Tag, and `ProtoCap` System relation;
6. opens the authenticated no-index preview;
7. publishes the EN locale from the admin;
8. verifies the public Article in SSR and Chromium on desktop and 390 × 844
   mobile, including semantic rich-content blocks, image alt/caption,
   Category/Tag/System context, editorial SEO, no fabricated French alternate,
   accessibility, and horizontal containment.

The Article content is typed through the editor UI. Hidden
`editorDocument`/body fields are inspected only as test evidence after visible
authoring; they are never written by the qualification.

## What the qualification proves

- A long-form Article can start from an empty Writing and reach public delivery
  without a content bootstrap or direct database mutation.
- The controlled schema is sufficient for this representative engineering
  article: prose, hierarchy, lists, quotation, code, callout, contextual media,
  taxonomy, and System context all survive draft, preview, publication, SSR, and
  mobile rendering.
- One-locale publication remains honest: authoring EN does not require a
  fabricated FR Writing publication.
- The same public renderer, SEO contract, accessibility checks, and responsive
  reader used by other Writings handle the admin-authored Article.

## Missing or awkward editor capabilities observed

These are recorded findings, not scope silently added to AKS-119:

| Finding | Current effect | AKS-119 assessment |
| --- | --- | --- |
| Inline marks and hyperlinks are absent from Writing schema v1. | An author cannot add emphasis, inline code, or an editorial link inside prose. | Non-blocking for the qualified Article, but the most material capability gap for broader editorial use. |
| `codeBlock.attrs.language` exists in the schema/renderer but has no admin control. | Code can be authored, but syntax language metadata cannot be set through the editor. | Non-blocking; record for the L6 architecture review. |
| No explicit move/delete controls exist for rich blocks. | Reordering or removing blocks relies on native ProseMirror keyboard editing rather than visible controls. | Usable, but less discoverable than the rest of the admin workflow. |
| Gallery insertion uses the first localized assets (up to 12) rather than an explicit selection/order step. | A Writing with many images cannot compose a precise gallery from the toolbar alone. | Not needed by the qualified Article; keep as a documented editor limitation. |
| Writing image upload currently requires both EN and FR alt text up front. | A one-locale Article must still provide accessibility metadata for the other locale before inserting media. | The Article can still be authored honestly in EN only, but this is avoidable locale coupling in the media workflow. |

None of these findings required bypassing the admin for the representative
Article. They should be confronted during AKS-121 rather than expanded
automatically into schema v1 without a real editorial need.
