---
name: dependency-audit
description: Evaluate proposed or changed dependencies for necessity, maintenance, security, licensing, compatibility, and operational impact.
---

# Dependency audit

Use before adding a dependency and when auditing dependency changes.

## Workflow

First determine whether existing project capabilities solve the need. Evaluate maintenance activity, known security advisories, license, compatibility, transitive dependencies, bundle/package-size impact, and operational risk. Adding or replacing dependencies requires approval.

After an approved change, verify manifest and lockfile consistency, run the available security audit and tests/build, and record material risks or upgrades required. Do not invent audit commands.
