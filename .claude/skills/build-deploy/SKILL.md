---
name: build-deploy
description: Prepare and verify builds and deployments using the project's actual runtime, environments, migration process, health checks, and rollback plan.
---

# Build and deploy

Use for build, environment, staging, release, or deployment work.

## Workflow

Inspect runtime, package manager, build tool, environment configuration, external services, secrets handling, database migrations, CI/CD, and deployment documentation first. Use the normal path: feature → review/PR → CI → tests → build → staging → verification → production.

Before production, explicitly verify migration plan, backup, environment/secrets, compatibility, health checks, monitoring, and rollback. Production deploys and migrations need explicit approval. Never claim a deployment succeeded without observable verification.
