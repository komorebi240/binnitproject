---
name: refactoring-cleanup
description: Safely remove or simplify dead, duplicate, obsolete, unreachable, debug, or overwritten code without altering intended behavior.
---

# Refactoring and cleanup

Use for cleanup or refactoring work, and during adjacent code changes when safe.

## Workflow

Identify dead/unused/unreachable code, duplicate logic, obsolete and commented-out implementation, debug artifacts, and code overwritten by later logic. Inspect callers, exports, runtime references, tests, and configuration before removal.

Keep behavior change separate from structural cleanup when practical. Do not expand a small bug fix into a broad refactor without approval. Remove proven-obsolete code instead of preserving it for hypothetical reuse; version control retains history. Run relevant tests and report behavior intentionally preserved.
