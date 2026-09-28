---
name: performance-review
description: Identify measurable performance bottlenecks and propose verified improvements across frontend, backend, database, and integrations.
---

# Performance review

Use for slow behavior, capacity concerns, performance regressions, or optimization proposals.

## Workflow

Measure or inspect evidence first; do not optimize by intuition. Locate the bottleneck and establish a baseline. Review backend N+1 queries, database queries/serialization/memory/concurrency, external API latency, indexes/query plans/joins/filters/pagination/locking, and frontend bundle/rendering/network/images/state/unnecessary requests as applicable.

Propose a focused change with expected benefit, trade-offs, and a verification metric. Preserve correctness and authorization; rerun relevant tests and compare results to the baseline.
