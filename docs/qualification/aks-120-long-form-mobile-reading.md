# AKS-120 — Long-form mobile reading qualification

## Purpose

Prove that the shared Writing reader remains comfortable on small screens during
sustained long-form reading, not only that the page avoids a single obvious
overflow.

The reproducible browser scenario lives in
`apps/web/scripts/smoke-platform-browser.cjs` as
`assertLongFormMobileReading`.

## Evidence used

AKS-120 deliberately uses two existing editorial proofs through the same public
renderer.

### Real 25-page Essay

`/fr/ecrits/rendre-l-attention-au-reel` is the original French essay already
qualified by AKS-113. It provides the sustained-reading case: more than 180
paragraphs, 13 H2 headings, real chapter transitions, and enough depth to test
whether the mobile reader remains usable from the opening through the final
argument.

At 320 × 720, 390 × 844, and 430 × 932 Chromium viewports the qualification
checks:

- no global horizontal scrolling;
- the reader stays inside the viewport;
- prose remains at least 16px with line-height at least 1.65× the font size;
- the document remains genuinely long enough to exercise sustained reading;
- the final canonical excerpt remains reachable and visible after deep scroll;
- axe reports no serious/critical accessibility regression.

### Rich Writing blocks

The real admin-authored Article from AKS-119,
`/en/writings/from-ambiguity-to-executable-boundaries`, provides controlled
blocks that the original Essay does not contain. AKS-120 lengthens its real
quotation and code example so the mobile qualification exercises actual wrapping
and local code scrolling.

At the same three viewport classes the qualification checks:

- code uses local `overflow-x: auto`, is narrower than the viewport, has genuine
  horizontal overflow, can be scrolled independently, and never moves the whole
  page horizontally;
- the long quotation wraps inside the reader and spans several mobile lines;
- contextual media remains inside the reader, stays below roughly one viewport
  of height, and retains lazy loading;
- the complete rich Writing still has no global horizontal overflow;
- axe remains clean.

## Tables

The AKS-120 ticket mentions tables, but Writing rich-content schema v1
intentionally rejects tables. AKS-106 established that constraint and the
current renderer/admin expose no table node.

AKS-120 therefore does **not** add a test-only table, raw HTML table, or new
schema capability merely to satisfy the wording of the ticket. The qualification
instead asserts that no table rendering has appeared implicitly. If the L6
architecture review decides tables are a real editorial need, they should enter
through a deliberate future schema version with authoring, rendering,
accessibility, and mobile behavior defined together.

## Resulting contract

Long-form mobile comfort is now treated as a measurable renderer property:

- readable prose size and leading;
- no document-level horizontal scrolling;
- wide code scrolls locally;
- quotations wrap without escaping the prose measure;
- media scales within the reading surface;
- a genuinely long document remains navigable to its end;
- the same semantic renderer serves Essay and Article forms without a mobile-only
  content model.
