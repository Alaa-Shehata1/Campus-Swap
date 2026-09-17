# ADR-0002: MySQL/MariaDB as Primary Datastore

## Status
Accepted

## Date
2026-09-17

## Context
The domain is inherently relational: users, listings, proposals, exchanges,
reviews (+responses), reports, notifications, and an audit log, with
invariants spanning entities (e.g. only `Completed` exchanges grant review
rights; proposal cap counts open proposals per listing; retention jobs
anonymize by age). ACID transactions matter for accept/complete/sanction
transitions. The human chose MySQL/MariaDB; development starts locally.

## Decision
Use MySQL/MariaDB as the single primary datastore for the MVP pilot
(entities + audit log). File objects (listing/report images) live alongside as
managed uploads subject to the limits in the architecture doc §6.

## Alternatives Considered

### PostgreSQL
- Pros: Strong relational + advanced typing/search features.
- Cons: Human selected MySQL/MariaDB; nothing in the MVP (category search,
  pagination, counts) needs Postgres-specific features.
- Rejected: Defer to human's datastore decision.

### SQLite
- Pros: Zero-ops local file DB; attractive for local-first start.
- Cons: Weaker concurrent-write story for a multi-user pilot; migration to a
  server DB later is itself a project.
- Rejected: Start where the pilot will run (client/server MySQL-compatible),
  including locally via a container or local server.

### Document store (e.g. MongoDB-style)
- Pros: Flexible per-listing attributes.
- Cons: Cross-entity invariants and audit joins become application-level work;
  relational shape is already fixed by the requirements.
- Rejected: Relational data in a document store adds cost with no benefit here.

## Consequences
- Schema design must encode the lifecycles in architecture.md §4 with
  constraints where cheap (e.g. one review per participant per exchange).
- Retention/anonymization jobs assume SQL age queries + transactions.
- Hosting/managed-vs-self-hosted MySQL is undecided (local-first); a later
  hosting decision must not reopen this ADR unless the store itself changes.
