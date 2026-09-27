# Profile final visual acceptance

Date: 2026-09-27

## Scope

This closes the Profile implementation milestone after the domain reset, public experience, and visual administration work.

The visual references are:

- `Profil — desktop-html (1)(1).zip` / `Main.dc.html`, reference viewport 1440 × 7800.
- `Profil — mobile-html(1).zip` / `Main-mobile.dc.html`, reference viewport 390 × 8700.

Those artifacts define composition, hierarchy, spacing, responsive representation, and interaction intent. Their sample content is not domain truth.

## Product decisions preserved

The acceptance pass deliberately does not reproduce mockup example data or turn it into application invariants.

- The current project remains a generic published System reference. AkikSystems is not special-cased as a System.
- Sentinel is not special-cased anywhere in Profile.
- Stack groups remain admin-created, ordered, and Technology-backed.
- Stack proof remains canonical published `System ↔ Technology` evidence.
- Systemic Scale links to a published Writing.
- The CV CTA remains present near the Profile identity even though it was omitted from the original mockup.
- Desktop and mobile consume one editorial model; only presentation changes by viewport.
- Missing or unpublished canonical references hide rather than falling back across locales.

## Reference alignment

The release pass locks the source-derived geometry that should remain stable:

### Desktop · 1440 px

- public content measure: 1100 px;
- hero: 80 px top / 96 px bottom;
- hero composition: 7/5 columns with 48 px gap;
- portrait: 104 × 104 px;
- Stack: 96 px top / 112 px bottom;
- Stack introduction is centered against the rail, not sticky;
- Stack title: 46 px;
- guidance title: 50 px;
- guidance introduction: 16 px / 1.7 line-height;
- capability rail: 8 columns, 44 px nodes, 18 px labels;
- capability and cross-cutting cards use the 32 px reference bleed;
- Systemic Scale title: 96 px;
- Systemic Scale rail: 4 columns, 44 px nodes, 18 px labels;
- Systemic Scale panel follows the reference top-summary + full-width process diagram composition;
- process nodes: 120 × 46 px;
- emblem uses the canonical AkikSystems brand mark at the reference 300 px desktop size;
- final CTA: 120 px vertical padding.

### Mobile · 390 px

- content measure: 358 px;
- hero: 36 px top / 52 px bottom;
- standard Profile sections: 56 px vertical padding;
- portrait: 76 × 76 px;
- Stack rail: 40 px nodes, 60 px rows, 14 px row gap;
- Stack technology label: 17 px; category label: 12 px;
- guidance and capability section titles: 30 px;
- capability rail: 4 × 2, 96 px tab height, 44 px nodes;
- Systemic Scale title: 60 px;
- Systemic Scale rail labels: 13 px;
- process chain switches to a vertical 148 px-wide representation;
- emblem switches from desktop callouts to the 220 px mark plus semantic list;
- final CTA: 56 px vertical padding.

## Deliberate non-pixel equivalence

Some mockup details are examples or content that the final contract does not own, so they are intentionally not copied literally:

- mockup System names, evidence text, dates, metrics, and technologies;
- the mockup's AkikSystems current-project brand mark;
- the prototype's single-primary-proof shortcut;
- Systemic Scale example-specific diagram annotations that would require hardcoded scenario text;
- extra mockup subheadings that are not part of the approved localized Profile contract.

The production renderer preserves the same information hierarchy and interaction purpose while consuming canonical data.

## Qualification

`pnpm --filter @akiksystems/web smoke:profile-public` is the release gate.

Chromium exercises the real production build and verifies:

- 390 px and 1440 px reference geometry;
- no page-level horizontal overflow;
- desktop/mobile representation changes;
- Stack disclosure behavior;
- guidance selection;
- capability and Systemic Scale tab behavior;
- canonical emblem representation;
- reduced-motion behavior.

The broader CI additionally runs lint, strict TypeScript, unit/component tests, production build, migration-from-zero, Profile domain qualification, Profile admin smoke, and the existing platform smoke suite.

## Result

The Profile milestone is accepted as complete when the full CI run is green on this acceptance change. Further changes to Profile should be treated as new product work rather than unfinished migration or compatibility cleanup.
