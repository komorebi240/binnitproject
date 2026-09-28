---
name: security-review
description: Review application changes or code for exploitable security weaknesses, sensitive-data handling, and server-side trust boundaries.
---

# Security review

Use for auth, data access, endpoints, inputs, uploads, integrations, configuration, or explicit security review.

## Review

Inspect authentication, server-side authorization and ownership/tenant checks, IDOR and privilege escalation, injection (SQL, command, template), XSS, CSRF, SSRF, path traversal, file upload, CORS, session/token handling, passwords, rate limits, encryption, HTTPS, logging, errors, and secret exposure.

Validate untrusted input at the backend. Require parameterized queries and safe path/command handling. Ensure errors are safe for clients and logs omit sensitive data.

## Findings

For each issue report severity (CRITICAL/HIGH/MEDIUM/LOW), affected component, attack scenario, remediation, and regression test. For a serious unresolved risk, pause the relevant implementation and request direction rather than normalizing the risk.
