# Landing animation performance — 2026-11-01

Scope: dev changes only; no Git publication or public deployment.

## Method

Separate production build (`NEXT_DIST_DIR=.next-perf`) on localhost:3102. Playwright Chromium, 1365×900, normal motion, fonts loaded, three runs of 180 requestAnimationFrame-driven scroll updates through the setup-step scene. No other test suite ran concurrently with the measured runs. CDP Performance metrics and root attribute MutationObserver counts were collected. Raw local artifacts: `.artifacts/performance-before.json` and `.artifacts/performance-after-final.json`; helper: `.artifacts/measure-marketing.mjs`.

## Median results

| Metric | Before | After |
| --- | ---: | ---: |
| Root attribute writes | 716.00 | 0.00 |
| Main-thread task duration (ms) | 619.17 | 300.64 |
| 95th percentile frame interval (ms) | 83.30 | 49.90 |
| Style recalculations | 361.00 | 529.00 |
| Frames above 25 ms | 179.00 | 163.00 |

## Changes

- Batch geometry reads before writes; only write stage attributes when their values change.
- Cache footer lookup and use ResizeObserver box sizes rather than remeasuring after writes.
- Update the connector element transform directly; React updates only on the three discrete step transitions.
- Avoid unnecessary scroll geometry work for static mobile/reduced-motion step layouts.
- Remove per-chip backdrop sampling inside the already-blurred orbit, clip the fixed scene and remove the redundant viewport backdrop filter. Existing orbit blur and themed focus veil remain.

## Validation and limits

Production build, typecheck and focused lint passed. Initial regression suite: 10 passed, 4 intentionally skipped by device. After the final connector/filter refinement: 3 passed, 1 mobile-only skip for the desktop pinned sequence. Browser timing is environment-dependent; these headless measurements do not certify 60 FPS on a physical browser/GPU. Final median main-thread task time decreased about 51% and frame-interval p95 about 40%; some slow frames remain. The style-recalculation count did not decrease. Verify perceptual smoothness in the user's external browser. Production local preview remains available on localhost:3102; public is unchanged.
