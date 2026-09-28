---
name: database-convention
description: Safely design, query, review, and migrate relational data structures and database access code.
---

# Database convention

Use for database models, migrations, repositories, queries, transactions, and performance-sensitive data access.

## Workflow

Inspect the actual schema, migration system, models, and query layer first. Review naming, primary/foreign keys, `NOT NULL`, unique and check constraints, indexes, ownership boundaries, transactions, locking, and query plans where relevant.

Use bound parameters; never concatenate untrusted input into SQL. Do not manually change a production schema when migrations exist. Treat schema/index/migration changes as approval-required and describe data compatibility, deployment order, backup, rollback, and tests.

## Checklist

- Constraints enforce important invariants where appropriate.
- Queries enforce authorization/tenant scope and avoid N+1 patterns.
- Transaction and concurrency behavior is explicit for multi-step writes.
- Migration is versioned, repeatable, and tested against existing data when relevant.
