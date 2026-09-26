# Work with us final release qualification

This document records the final qualification gate for the Work with us refinement
tranche. It does not replace the executable checks: CI remains the authority for
whether the gate passes.

## Release contract

The gate is intentionally layered so that each invariant is tested at the
boundary that owns it instead of duplicating the same scenario everywhere.

| Contract | Executable evidence |
| --- | --- |
| Snapshot v2 only, fixed `understand → structure → build` approach order | `packages/db/src/work-with-us-publication.test.ts` plus the browser publication assertion |
| EN and FR draft/publication isolation | `apps/web/scripts/smoke-work-with-us-admin-browser.cjs` |
| Administrable selected Systems, stable order, maximum four, locale-unpublished omission | `pnpm db:verify-work-with-us-selected-proof` plus `WorkWithUsView` rendering tests |
| Server-side form validation, explicit limits, anti-abuse trap | `apps/web/app/lib/work-with-us-inquiry.test.ts` |
| Durable persistence, idempotent retry and transactional rate limiting | `pnpm db:verify-work-with-us-inquiries` |
| Inquiry handling and notification state remain independent | `pnpm db:verify-work-with-us-inquiry-handling` |
| Real admin → public publication path | Work with us Chromium smoke |
| Real public submission → database persistence | Work with us Chromium smoke |
| Message playback is progressive, locale-scoped and cancelled on submit/navigation | Work with us Chromium smoke |
| Form remains fully functional with JavaScript disabled | Work with us Chromium smoke |
| Mobile reflow at 320, 390 and 430 pixels, plus desktop composition | Work with us Chromium smoke |
| No horizontal overflow and minimum 44px mobile form targets | Work with us Chromium smoke |
| Native labels, semantic section references, decorative ARIA boundaries and keyboard tab order | Work with us Chromium smoke |
| Visible keyboard focus treatment | Work with us Chromium smoke |
| `prefers-reduced-motion: reduce` disables Work with us-owned field/playback transitions | Work with us Chromium smoke |
| Worker production image contains its workspace runtime closure | CI Docker build |
| Asynchronous notification task and transport contract | worker smoke and worker unit tests |
| Privacy disclosure matches the implemented inquiry flow | legal-page tests |

## Deliberate operational boundary

The inquiry database and authenticated inbox are the source of truth. Email is
an asynchronous notification channel. CI qualifies that channel with a
deterministic transport and qualifies the Resend HTTP adapter separately.

Production provider delivery must only be claimed when the worker has a real
provider key and verified sender configured. When transport is not configured,
the inquiry remains durably available in the administration inbox and its
notification state is explicitly blocked rather than being reported as sent.

## Merge and deployment rule

The tranche is releasable only when the pull-request CI is green. After merge,
the main-branch CI and Railway deployment are followed to completion. A green
source-level test run is not sufficient if the production service does not start
or its health probe does not return success.
