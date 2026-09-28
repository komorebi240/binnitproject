# Architecture Decision Records (ADR)

An ADR captures a REVIEW- or CRITICAL-level decision (per `.claude/CLAUDE.md`'s decision
hierarchy) at the time it was made — the alternatives considered, and why one was chosen.
Write one when a decision would be expensive to re-litigate from scratch later: a new
dependency, a schema shape, an auth approach, a service boundary.

Do not write one for routine feature work — only for decisions in section 2 of the root
[CLAUDE.md](../../CLAUDE.md) (architecture, security, data model, scope).

## File naming

`NNNN-short-title.md`, zero-padded, sequential — e.g. `0001-use-httponly-cookie-for-auth-token.md`.

## Template

```markdown
# NNNN. Title

Date: YYYY-MM-DD
Status: Proposed | Accepted | Superseded by NNNN

## Context
What problem or question forced this decision? What constraints applied?

## Decision
What was decided, stated as a single clear sentence.

## Alternatives considered
Option A — why not.
Option B — why not.

## Consequences
What becomes easier, what becomes harder, what risk is accepted.
```
