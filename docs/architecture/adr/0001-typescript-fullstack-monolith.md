# ADR-0001: TypeScript Full-Stack Monolith

## Status
Accepted

## Date
2026-09-17

## Context
CampusSwap MVP needs one deployable web app for a single-campus pilot (KFS):
signup, listings, proposals/exchanges with a proposal cap and lifecycle state
machines, blind reviews, reports/moderation with audit, and an in-app
notification inbox. `AGENTS.md` requires: simple over complex, modular and
maintainable, no premature microservices, no unjustified technologies. The
human chose the stack direction (TypeScript full-stack) and local-first
development.

## Decision
Build the MVP as a single-deployable, modular TypeScript application
(one language end-to-end) implementing the modules in
`docs/architecture/architecture.md` §2. No separate API deployable, no
microservices, no additional runtime infrastructure for the pilot.

## Alternatives Considered

### Decoupled SPA + standalone API
- Pros: Reusable API for a future mobile app; independent frontend deploys.
- Cons: Two auth surfaces, contract drift, CORS/session complexity, double ops
  for a pilot that explicitly excludes mobile apps and public APIs.
- Rejected: Cost without a corresponding MVP requirement.

### Other-language monolith (Python/PHP-style)
- Pros: Viable; choice is mostly team-skill driven.
- Cons: Human selected TypeScript; no countervailing constraint.
- Rejected: Defer to human's stack decision.

## Consequences
- Module seams are in-process interfaces (see architecture.md §2); distribution
  later would require an explicit new ADR.
- Type safety covers the exchange/review state machines end-to-end.
- Framework choice within TypeScript (and file layout, CSS, job runner) is
  still open — fixed at implementation-planning time.
