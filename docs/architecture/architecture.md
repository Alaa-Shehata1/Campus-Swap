# CampusSwap — Architecture (Approved)

> Status: **Approved by human.** Implements the S1–S9 design with D7 rev.1
> (proposal cap) and S9 decisions (TypeScript full-stack monolith, MySQL/MariaDB,
> local-first, server-side sessions by default).
> Requirements source: `docs/requirements/*` (v2 + D7 rev.1). Plan source:
> `docs/project-management/{roadmap,backlog}.md`. Decisions: `adr/0001`, `adr/0002`.

## 1. Overview

One deployable TypeScript web app, internally divided into deep modules behind
small interfaces, backed by a single MySQL/MariaDB store. No microservices, no
separate API deployable, no new infrastructure for the MVP pilot. Local-first
development; deployment target undecided and therefore nothing here depends on
a host.

Runtime shape: browser-facing web tier → module layer (domain logic +
authorization) → single relational store (entities + audit log + file objects
for listing/report images). Time-based duties (proposal expiry, review
auto-reveal, lend reminders, auto-complete, anonymization) run as scheduled
jobs owned by their modules, not as separate services.

## 2. Modules

| Module | Does | Interface (verbs only) | Depends on |
|---|---|---|---|
| `identity` | signup/login/logout, roles (visitor/member/moderator), 18+ gate, campus field, block/mute store | register, authenticate, setRole, block, mute | `policy` |
| `policy` | prohibited categories, academic boundary, disclaimer texts, Terms versioning | isProhibited, disclaimerFor(flow), termsVersion | nothing |
| `listings` | Offer/Request CRUD + Draft/Active/Paused/Archived, 20-cap, lend/give/swap terms, image-count limits | publish, update, pause, archive, get, search | `identity`, `policy` |
| `exchanges` | proposals (cap 5, 7-day expiry, terms freeze), schedule (Cairo time + place), two-step completion, cancellation, participant thread | propose, respond, withdraw, schedule, markDone, confirm, dispute, cancel, postMessage | `listings`, `identity`, `policy` |
| `reputation` | blind review intake, 14-day reveal, 48h edit, one response, aggregate | submitReview, revealDue, respond, aggregate | `exchanges` |
| `moderation` | reports, queue, hide/warn/suspend/ban, review voids, stolen-item escalation + handover log | report, triage, sanction, voidReview, escalate | `identity`, `listings`, `exchanges`, `reputation` |
| `notifications` | in-app inbox only; one item per event; lend reminders | emit(event), inbox, markRead | all modules emit; none depend on it |
| `privacy` | retention clock (12-mo messages, 24-mo logs), anonymization, moderator-read gating + access log | dueForAnonymization, anonymize, checkCaseAccess | `exchanges`, `moderation` |

Depth note: `exchanges` is the deep module (proposal cap + lock + auto-pause +
completion state machine behind ~9 verbs). `notifications` is intentionally
shallow (a sink). No other seams exist in MVP.

## 3. Data flow per journey

- **J0 browse (logged-out):** web tier → `listings.search` (Active only) →
  detail with reputation summary via `reputation.aggregate` → any action
  redirects to login with return-to-context. No session, no writes.
- **J1 signup → publish:** `identity.register` (any email, campus default KFS,
  18+ check, rules accept) → `listings.publish` (validates against `policy`,
  enforces 20-cap + image counts) → Active.
- **J2 discover:** `listings.search` (side/kind/category/zone/availability) +
  compatible hint (opposite side + related category, recency order).
- **J3 propose → accept:** `exchanges.propose` (≥1 listing/side, terms text,
  rejects 6th open proposal with `proposal-cap-reached`) → counterparty
  `respond`/`withdraw` or 7-day `expire` job → on accept the listing
  auto-pauses and other pendings go read-only → `schedule` → `notifications.emit`.
- **J4 meet → complete:** `schedule` (Cairo-labeled time + place, safety nudge)
  → `markDone` → `confirm`/`dispute` within 7 days → silence triggers
  auto-complete job with notification log. `cancel` needs a reason code.
- **J5 review:** `reputation.submitReview` (one per participant, only if
  Completed) → hidden until both-in or 14-day reveal job → `aggregate`
  (average + count + distribution + history) → one `respond` allowed.
- **J6 report → sanction:** `moderation.report` → Received → Under review →
  Resolved via `notifications.emit` → `sanction` writes audit entry;
  stolen-item path hides first and requires owner approval for handover.

## 4. State machines & key invariants

- Listing: `Draft → Active ⇄ Paused → Archived`. Only Active is searchable.
  Owner-only transitions, plus system auto-pause on accept. `Locked` is derived
  (5 open proposals), not a stored state.
- Proposal: `Proposed → Accepted | Declined | Expired | Withdrawn`. Terms
  immutable after Accepted. Max 5 open per listing.
- Exchange: `Scheduled → Completed | Cancelled | Disputed`. Completion requires
  a schedule (override needs reason). Only participants act.
- Review: `Hidden → Published` (both-in or 14 days). No reviews for
  Cancelled/Disputed/self.
- Report: `Received → Under review → Resolved`. Reported party notified only
  on sanction.
- Invariants live inside owning modules, never in callers: reciprocity, no
  money, 18+, meeting-place privacy (participants only), moderator reads only
  on open cases.

## 5. Interface contracts & error semantics

- One error shape across all user actions: field-specific validation failures
  name the field and the fix; authorization failures say "login required" or
  "not permitted" without leaking hidden objects.
- Validation at the edge (forms/entry points); trusted types inside modules.
- Browse is paginated from day one; filters are additive; datetimes cross seams
  labeled `Africa/Cairo`.
- Unsafe-to-retry actions (accept, markDone, confirm, report) return explicit
  outcome states so resubmits report existing state instead of duplicating.

## 6. Security & privacy design

- All mutations require a member session (server-side sessions by default);
  visitors read-only by construction.
- Owner-only writes; only cross-user writes are `moderation` sanctions, each
  audit-logged (actor + reason + timestamp). No silent review edits.
- Uploads limited (count/size/type), images only on listings/reports, location
  metadata stripped before others can see them.
- Throttles on proposals/messages/reports (numeric thresholds at implementation
  time, owned by `moderation`/`exchanges`).
- Retention jobs per P-3/P-4: 12-mo message / 24-mo log anonymization,
  purpose-bound moderator reads, immediate hide on deactivation.

## 7. Testing strategy

- Interface-level tests per module seam: register/gate, publish/validation/cap,
  propose/respond/expiry/freeze/cap-reject/auto-pause, schedule/complete/
  dispute/auto-complete, blind-reveal/response/aggregate, report/triage/
  sanction/handover-gate, inbox emission (asserting zero emails).
- Journey tests J0–J6 plus launch-gate checks: keyboard-only run, disclaimer
  presence on all 5 flows, Cairo labeling audit, triage drill.
- Every behavioral change carries tests per `AGENTS.md`; no validation or
  security control disabled to pass.

## 8. Risks & trade-offs

1. D7 double-commit solved by construction (cap + auto-pause); residual is the
   deliberate reopen-then-accept path, flaggable for single items.
2. Self-declared campus puts all trust weight on reputation/moderation — the
   ≤48h triage SLA is load-bearing.
3. In-app-only notifications risk missed lend returns — mitigated by persistent
   overdue badges, not by adding email without a decision.

## 9. Deferred (not decided here)

File layout, schema detail, session-mechanism specifics, job runner, rate-limit
numbers, CSS approach, deployment target. To be fixed at implementation-planning
time; this document constrains them but names none.
