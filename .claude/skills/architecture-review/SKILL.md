---
name: architecture-review
description: Assess and propose significant feature or cross-module changes before implementation; use for architecture, data-flow, or integration decisions.
---

# Architecture review

Use before a significant feature, cross-cutting change, new integration, or data-flow change.

## Workflow

1. Clarify the business objective, users, workflow, expected result, exclusions, and failure behavior.
2. Map the current architecture and affected modules, contracts, dependencies, and data flow.
3. Assess database, API, UI, security, authorization, test, operational, migration, and deployment impact.
4. Propose the smallest maintainable design, responsibilities, interfaces, error paths, and rollout/rollback approach.
5. Present alternatives and trade-offs when material; identify decisions requiring approval before implementation.

## Checklist

- Compatibility and ownership boundaries considered.
- Failure, concurrency, idempotency, and external-service behavior considered where applicable.
- Test strategy covers behavior and regressions.
- Significant architecture, data, security, or UX decisions are approved before coding.
