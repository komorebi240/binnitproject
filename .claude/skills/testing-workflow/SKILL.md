---
name: testing-workflow
description: Plan and execute proportionate unit, integration, API, security, regression, and end-to-end verification for code changes.
---

# Testing workflow

Use whenever code behavior changes.

## Workflow

1. Inspect real test/build commands and test configuration; never invent commands.
2. Define behavior-focused cases: happy path, empty/invalid/boundary input, authentication, authorization, failure behavior, external-service failure, concurrency, and security cases as applicable.
3. Add or update focused tests with the implementation.
4. Run targeted tests, related tests, regression tests, the full suite, and build in that order when each is applicable.
5. Report commands actually executed, results, skipped verification, and reason.

Do not claim passed tests without execution. Avoid testing implementation details when observable behavior can be tested.
