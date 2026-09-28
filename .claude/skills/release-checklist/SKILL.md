---
name: release-checklist
description: Verify release readiness across code quality, security, tests, migrations, operations, documentation, and rollback planning.
---

# Release checklist

Use before a staging or production release.

## Required review

- Code cleanup complete; no secrets or unintended files included.
- Dependency review and relevant security review complete.
- Unit, integration, regression, authorization/security, and applicable end-to-end tests verified.
- Build and staging verification complete.
- Database migration compatibility, backup, rollout, and rollback plan verified.
- Authentication/authorization and configuration/secrets reviewed.
- Production readiness includes health checks, monitoring/alerts, capacity considerations, and documented rollback.
- Relevant documentation and release notes are current.

Record the evidence, unresolved risks, and go/no-go decision. Production actions require explicit approval and must be verified after execution.
