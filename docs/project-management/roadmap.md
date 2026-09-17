# CampusSwap — Roadmap (v2 Baseline)

> Source of truth: `docs/requirements/{product,functional,non-functional}-requirements.md` (v2, Decided).
> This roadmap is product sequencing only. No architecture, stack, or implementation choices.

## Pilot Goal (8 weeks post-launch, KFS University)

Per D12: ≥200 activated members, ≥150 published listings, ≥30 completed
exchanges, median report triage ≤48h, no critical safety incident mishandled.

## Phase 0 — Terms & Readiness (blocks launch)

- Terms v1 + privacy notice + 5-flow disclaimers signed off by human developer.
- KFS student-affairs consult on haram-content + academic-boundary wording recorded.
- 2 moderators named (lead = human developer).
- `SECURITY.md` contact verified; triage path exercised with a fixture report.
- **Exit:** launch-gate checklist in `non-functional-requirements.md` §10 all green.

## Phase 1 — Identity + Listings + Public Discovery (J0–J2)

Vertical slice: visitor can browse/search KFS listings; member can sign up
(any email + campus + 18+) and publish Offer/Request (skill/item, lend/give/swap).
- Covers FR-ID-1..5, FR-L-1..6, FR-D-1..3.
- **Exit:** SC-1 (signup → first listing < 3 min p50) and SC-2 (logged-out browse
  with login-gated actions) verified by manual walkthrough.

## Phase 2 — Proposals + Exchange + Scheduling + Completion (J3–J4)

Vertical slice: capped proposals (5 open max, lock at cap) → accept/decline/
withdraw/7-day expiry → auto-pause on accept → Scheduled exchange (Cairo time
+ place, public-spot nudge) → two-step completion / cancellation with reason
→ participant text thread → block/mute.
- Covers FR-E-1..7, FR-M-6.
- D7 resolved by construction: cap bounds the queue; first acceptance
  auto-pauses the listing so double-commit cannot happen silently.
- **Exit:** two test users complete a full propose → schedule → complete loop;
  one-sided proposal and schedule-less completion correctly rejected; 6th
  proposal rejected with reason; second accept blocked while paused.

## Phase 3 — Reviews + Reports + Moderation + In-App Notifications (J5–J6)

Vertical slice: blind bilateral reviews + response + aggregate; report flow with
reason codes + `Received → Under review → Resolved`; moderation actions
(hide/warn/suspend/ban, audit-logged); stolen-item hide-first + approved
handover path; in-app notification inbox for all events (no email).
- Covers FR-R-1..5, FR-M-1..5, FR-N-1, retention + access rules (P-3/P-4).
- **Exit:** SC-4 verified — bilateral review invisibility holds pre-reveal;
  every report transitions states; handover without owner approval impossible.

## Phase 4 — Pilot Hardening & Launch

- Keyboard-only pass over J0–J6 + report; disclaimer presence on all 5 flows;
  contrast/readability of disclaimers; Cairo-time labeling audit.
- Backup/restore + health check demonstrated; product metrics dashboarded
  (members, listings, completions, triage latency, incidents).
- **Exit:** D12 metrics instrumentation live; 8-week pilot clock starts.

## Post-MVP (not committed, unordered)

Verified-enrollment badge; richer engagement states (e.g. multi-copy listings
that stay open after one accept); per-category loan caps;
map safe-spots; calendar export; email/push opt-in; Arabic UI; true
second-campus scoping; endorsements; lend-tracking; sustainability metrics;
community jury + appeals; anonymized research with consent.
