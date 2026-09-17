# CampusSwap — Non-Functional Requirements (v2, Decided)

> Product-level constraints and qualities. No architecture/stack choices here;
> those come later and must satisfy these requirements.

## 1. Usability

- NFR-U-1: Core flows (signup, publish, discover, propose, schedule, complete,
  review, report) completable without tutorial; inline validation; every action
  acknowledges within 1s at UI level.
  *Verify: manual walkthrough of J0–J6 with no prior training succeeds.*
- NFR-U-2: All datetimes display with explicit `Cairo time (Africa/Cairo)`
  label; unambiguous date format (e.g. `12 Mar 2026, 15:30 Cairo time`).
- NFR-U-3: Errors state what happened + how to fix (field-specific); no silent
  failures. *Verify: each required-field and auth-gate error reviewed.*

## 2. Performance (initial SLOs, to validate in design)

- NFR-P-1: p95 page load < 2.5s on broadband; p95 search < 1s at ≤10k listings.
  Proposed SLO, not SLA. *Verify: measured in pre-launch perf pass; waivers
  require human approval.*

## 3. Availability & Scalability & Maintainability

- NFR-A-1: Best-effort single-region pilot; health check + backup/restore
  procedure required before launch. No HA commitment in MVP.
- NFR-S-1: Must support one pilot university without rework (design point:
  ≤20k users, ≤10k active listings). Multi-university is post-MVP.
- NFR-M-1: Modular monolith preferred (per `AGENTS.md`; no microservices, no
  unjustified infra). Every behavioral change has tests; docs reflect
  implementation.

## 4. Internationalization

- NFR-I-1: English only in MVP; all user-visible strings externalized so a
  second language needs no code changes.
  *Verify: no hard-coded UI strings outside string resources (design review).*

## 5. Privacy (decided)

- P-1 Data minimization: collect only signup/profile, listings, proposals,
  exchanges, messages, reviews, reports, moderation log. No location tracking.
- P-2 Email privacy: any email used for login/ownership only; never displayed,
  sold, or shared. Owner contact between strangers happens only inside the
  exchange thread after acceptance.
- P-3 Retention `[DECIDED-AGENT]`: messages + proposal history **12 months
  after exchange closure**, then anonymized (counts preserved, text dropped).
  Reports/moderation logs **24 months**, then anonymized. Deactivation hides
  profile/listings immediately; delete/anonymize on request within 30 days
  except legal/moderation holds disclosed in the privacy notice.
  *Verify: aged fixtures return `anonymized`; holds documented.*
- P-4 Purpose-bound moderator access: messages visible only on an opened
  case; every access logged. No bulk export in MVP.
  *Verify: access without open case denied + logged.*
- P-5 Visibility: listings + reputation visible publicly (logged-out included);
  precise meeting place visible only to exchange participants; email never public.
- P-6 Photos: no real-face-photo requirement; location/EXIF stripping expected
  at design time (requirement, not design: `uploaded images must not retain
  location metadata visible to other users`).

## 6. Security (product level — what, not how)

- S-1 Verified-session gate: all mutations require member session; anonymous
  mutations impossible (see FR-ID-2).
- S-2 Authorization: users act only on own objects except audited moderators;
  cross-user actions (e.g. completing another's exchange) rejected + logged.
- S-3 Abuse controls: proposal/message/report throttles exist (thresholds at
  design time), plus block/mute, 20-listing cap, session expiry.
- S-4 Content safety: upload count/size/type limits; images only on listings/
  reports (not chat); executables rejected; money links are policy violations.
- S-5 Auditability: every exchange transition, moderation action, verification
  event, and stolen-item handover records who/when/why; moderators cannot
  silently alter reviews (voids are logged).
- S-6 Takedown: dangerous content triaged ≤24h (target; pilot SLA: median
  ≤48h per D12). Published contact via existing `SECURITY.md` (product aligns
  with it). Stolen-item evidence preserved on escalation (no participant
  deletion post-escalation).

## 7. Accessibility

- A-1 Target **WCAG 2.2 AA** for J0–J6 + report. *Verify: keyboard-only run of
  publish→propose→schedule→review→report; visible focus; contrast; errors
  announced to assistive tech.*
- A-2 No color-only meaning (statuses have text labels); images prompt for alt
  text; times labeled per NFR-U-2.
- A-3 Mobile-first responsive; no hover-only actions; touch targets meet
  platform minimum.
- A-4 Plain-language safety/reporting/disclaimer copy; disclaimers meet the
  same contrast/readability bar (no fine-print gray-on-gray) and are
  screen-reader announced in each of the 5 disclaimer flows.
- A-5 Respect reduced-motion; no auto-playing media.

## 8. Legal / Disclaimer Pervasiveness

- NFR-L-1: Short disclaimer + full-terms link on all of: signup, listing
  create, proposal accept, schedule confirm, item-lend flow. Full Terms +
  privacy notice owned by **human developer**; KFS student-affairs consult
  required pre-launch for haram/academic wording. *Verify: release checklist
  fails if any of the 5 flows lacks disclaimer text.*

## 9. Observability (product level)

- NFR-O-1: Audit trail for exchanges, reports, moderation, handovers;
  product metrics dashboarded: activated members, listings, completed
  exchanges, triage latency, safety incidents. Targets per D12.

## 10. Launch Gate (pilot readiness checklist)

1. Terms + privacy notice + disclaimers signed off by human developer.
2. KFS student-affairs consult on haram/academic wording recorded.
3. 2 moderators named (lead = human developer).
4. Backup/restore + health check demonstrated.
5. `SECURITY.md` contact verified; triage path exercised with a fixture report.
6. Disclaimer presence on all 5 flows verified; keyboard-only pass completed.
