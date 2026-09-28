---
name: project-onboarding
description: Inspect an unfamiliar project or subsystem before making changes, identifying its stack, workflows, boundaries, and operational constraints.
---

# Project onboarding

Use before coding in an unfamiliar project or when the affected subsystem is unclear.

## Workflow

1. Inspect the project tree, manifests, lockfiles, README, scripts, formatter/linter, test configuration, CI/CD, containers, and environment examples.
2. Identify the technology stack, framework, package manager, build and real test commands, runtime, deployment configuration, and migration strategy.
3. Trace the relevant architecture: entry points, modules/services/components, database access, API boundaries, authentication, authorization, and external integrations.
4. Check repository status and existing `.claude/` guidance before modifying anything.
5. State what was verified, what is absent, and what remains unknown. Do not infer missing details.

## Checklist

- Project structure and ownership boundaries understood.
- Database, API, auth/authz, CI/CD, deployment, and migrations identified or explicitly unavailable.
- Actual build/test commands sourced from project files.
- Existing local changes and configuration preserved.
