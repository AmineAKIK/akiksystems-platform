# AKS-053 — Ten-second comprehension test

## Purpose

Capture what a first-time visitor believes AkikSystems is, and which destinations they remember, after a ten-second exposure with no explanation.

The automated browser qualification in `apps/web/scripts/smoke-sentinel-browser.cjs` is only a baseline. It proves that the intended identity, proposition, destinations, and deep-link orientation are present after a ten-second, interaction-free exposure on desktop and mobile. It does **not** substitute for human comprehension evidence.

## Participant rule

Use people who have not previously seen AkikSystems and have not been briefed on its information architecture. Do not explain the product before the exposure.

Record responses verbatim. Do not translate, normalize, score, or reinterpret an answer while the participant is present.

## Exposure

Run each participant on one of these first-impression views:

- Desktop Home: 1440 × 900 at `/en`
- Mobile Home: 390 × 844 at `/en`
- Desktop deep link: 1440 × 900 at `/en/systems/sentinel`
- Mobile deep link: 390 × 844 at `/en/systems/sentinel`

Load the route in a fresh browser context. Once stable, expose it for exactly ten seconds. During exposure: no scrolling, clicking, tapping, keyboard navigation, hover prompting, narration, or hints. Hide the page at ten seconds.

## Questions

Ask these in order, without showing the page again:

1. What do you think AkikSystems is?
2. What do you think you could do or find there?
3. Which sections or destinations do you remember seeing?
4. Where in the site did you think you were?
5. What, if anything, felt unclear?

For a deep-link exposure, add:

6. What relationship did you infer between “Systems” and “Sentinel”?

## Capture sheet

| Participant | Device/view | “What is AkikSystems?” verbatim | Remembered destinations | Perceived current location | Unclear / misleading cues |
| --- | --- | --- | --- | --- | --- |
| P01 |  |  |  |  |  |
| P02 |  |  |  |  |  |
| P03 |  |  |  |  |  |
| P04 |  |  |  |  |  |
| P05 |  |  |  |  |  |

## Synthesis

After collection, summarize only recurring patterns:

- Identity language participants independently used.
- Destinations recalled without prompting.
- Destinations consistently missed or confused.
- Whether deep-link participants correctly understood the parent/current relationship.
- Mobile vs desktop differences.
- Copy or hierarchy changes justified by repeated evidence.

Do not turn a single participant preference into a product rule. Preserve the raw verbatim responses alongside any synthesis.

## Current engineering baseline

The CI qualification checks that, after ten seconds with no interaction:

- Home exposes the AkikSystems identity, “Independent software systems”, “Engineering made inspectable.”, the explanatory sentence, and all five semantic destinations.
- At least one destination intersects the initial viewport on both desktop and mobile.
- A direct Sentinel deep link exposes AkikSystems identity and the “Systems / Sentinel” local context without prior navigation.
- The same scenarios remain horizontally readable on desktop and mobile.

Human first-time-visitor responses are the evidence required to complete the perceptual part of AKS-053.
