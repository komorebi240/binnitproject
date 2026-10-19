# Project instructions

> **Document scope.** This file defines session operating procedure — when to ask before acting, and the SAFE/REVIEW/CRITICAL decision hierarchy below. The root [CLAUDE.md](../CLAUDE.md) defines engineering standards and philosophy (architecture, security, database, testing, UI/UX), including stack-specific conventions in its section 46. Follow this file for *when to act*; follow root `CLAUDE.md` for *what the correct technical outcome looks like*.

## Operating principles

Prioritize correctness, security, data integrity, maintainability, testability, reliability, accessibility, performance, observability, and clear UX. Inspect the relevant source, configuration, tests, documentation, and repository state before changing code. Do not guess commands, stack behavior, schemas, API contracts, environment variables, deployment processes, or file locations when the project can answer them.

Preserve existing user changes. Do not overwrite or delete important files, data, or configuration without understanding their purpose and confirming the exact target when needed.

## Decision hierarchy

| Level | Action |
| --- | --- |
| SAFE | Proceed: formatting, imports, obvious variable renames, typos, unused imports, syntax fixes, necessary focused unit tests, and cleanup verified to have no references. |
| REVIEW | Explain the proposal and obtain approval first: adding dependencies, changing component structure/data flow/API responses, service refactors, indexes, or libraries. |
| CRITICAL | Obtain explicit approval first: schema or migration changes, data deletion, authentication/authorization/encryption changes, significant architecture or business rules, breaking APIs, production migration/deploy, commit, or push. |

## Pre-coding meeting

Before a feature or material change, inspect the current implementation and report: requirement and expected outcome; relevant architecture/modules/data flow; database, API, UI, security, test, and deployment impact; implementation proposal; risks; and tests to add. Ask for confirmation when the decision is REVIEW or CRITICAL. Do not pause for SAFE, obvious work.

Explain concepts simply before implementation. Present trade-offs when there is more than one credible option.

## Security baseline

Never hard-code or log secrets, credentials, passwords, tokens, or private keys. Do not expose production stack traces, SQL, paths, or internal details. Validate untrusted input server-side; use parameterized queries; enforce authentication and authorization at the backend; minimize returned sensitive data. Apply the security-review skill when a change touches a relevant attack surface.

## Testing and verification

Every code change requires proportionate test consideration. First inspect package/build manifests, CI configuration, test configuration, documentation, and scripts to identify real commands. Never claim a test, build, audit, or deployment succeeded unless it was actually run and verified. Run targeted tests first, then related/regression tests, full suite, and build when appropriate.

## Cleanup and documentation

While modifying an area, inspect for duplicate, unused, unreachable, overwritten, debug, obsolete, or commented-out legacy code. Check references before removing it; do not retain obsolete implementations "just in case." Update the relevant documentation when behavior, interfaces, configuration, architecture, data, security, or operations change.

The product specification [docs/SPECIFICATION.md](../docs/SPECIFICATION.md) (English) describes what the product does today. Any change to behavior, roles, limits, data, or endpoints updates its matching section and its change log in the same change; refactors with no visible effect do not.

## Git and release safety

Before Git operations, inspect status, branch, and recent history. Never discard user changes, force-push a protected branch, bypass checks, commit, or push automatically. After the user has approved an implementation, ask exactly: **"Code đã được duyệt. Bạn có muốn tôi commit và push lên GitHub không?"**

Only after explicit approval: inspect `git status` and `git diff`, run targeted tests and appropriate full suite/build, check for secrets and uncommittable files, then commit and push. Report the commit hash and verified result. Never commit `.env`, credentials, tokens, private keys, or production secrets; commit `.env.example` only when appropriate.

## Skill routing

Use the focused skill(s) that match the task. Start with project-onboarding for an unfamiliar area; use architecture-review before major work. Use specialized review/workflow skills only when their domain is materially involved. Their procedures supplement these global rules and must not be copied into unrelated work.

## Code Integrity and Anti-Workaround Rule

Do not add code merely to make the application run or silence an error.

Before adding new code to fix a problem:
1. Identify and explain the root cause.
2. Inspect existing code and architecture for the intended solution.
3. Reuse or modify the existing implementation when appropriate.
4. Do not create duplicate utilities, services, components, handlers, abstractions, or configuration.
5. Do not add temporary hacks, fallback logic, dead code, commented-out alternatives, debug code, or unnecessary wrappers.
6. Do not change unrelated files to compensate for a defect.
7. If the correct fix requires an architectural change, stop and request REVIEW approval.

Prefer:
root-cause fix > modify existing code > reuse existing implementation > refactor > create new code.

Never:
error → add workaround → add another workaround → leave obsolete code behind.
