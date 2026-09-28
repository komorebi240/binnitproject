---
name: observability
description: Design or review safe logs, metrics, tracing, health checks, and alerts for operationally diagnosable systems.
---

# Observability

Use when adding/reviewing telemetry, health checks, production diagnostics, or incident readiness.

## Checklist

- Structured logs use useful levels and request/correlation IDs where applicable.
- Metrics cover latency, errors, throughput, database/external-service health, and resource usage appropriate to the service.
- Health checks and alerts have actionable ownership and avoid leaking internals.
- Logging excludes passwords, tokens, API/private keys, credentials, and sensitive personal data.

Inspect existing telemetry and retention/access controls before changing observability architecture. Propose material vendor, data-retention, or privacy changes for approval.
