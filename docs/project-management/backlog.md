# CampusSwap — Backlog (v2 Baseline, MVP)

> Ordered product backlog. Each item traces to requirements IDs in
> `docs/requirements/functional-requirements.md` (FR-xxx) and
> `non-functional-requirements.md` (NFR/P/S/A-xxx).
> Product-level `what` + acceptance only. No architecture/stack/file prescriptions.
> Sizes: XS (trivial) / S (one slice) / M (several rules) / L (phase-level).

## MVP (must-have for pilot)

- [ ] **BL-01 Signup + roles + 18+ gate (S)** — Traces FR-ID-1/2/5, BR-3/9.
  - Acceptance: any-email signup with required campus (default KFS) + 18+ check +
    rules accept; visitor read-only; all mutations require member session.
  - Verify: gmail/yahoo/KFS accepted; missing campus / unchecked 18+ rejected
    field-specifically; logged-out mutation blocked with login + return-to-context.
- [ ] **BL-02 Profile view/edit (S)** — FR-ID-3/4.
  - Acceptance: self-declared campus labeled `self-declared (not verified)`;
    email never displayed; bio ≤500 enforced.
- [ ] **BL-03 Offer/Request CRUD + lifecycle (M)** — FR-L-1..4.
  - Acceptance: skill/item × offer/request publish; required-field validation
    (title ≤80, description ≤2000, image counts); Draft/Active/Paused/Archived
    with only Active discoverable; 20-active cap with reason on 21st.
- [ ] **BL-04 Item modalities + loan terms (S)** — FR-L-5, BR-7.
  - Acceptance: `lend` requires lender-defined return date/duration; `swap`
    requires counterpart description; disclaimers on lend create.
- [ ] **BL-05 Prohibited-category enforcement (S)** — FR-L-6, BR-5/6.
  - Acceptance: haram / medical / legal / weapons / drugs-alcohol / stolen /
    sexual / commercial classes blocked or fast-removed; seeded fixture per
    class verified.
- [ ] **BL-06 Public browse/search/filter + detail (M)** — FR-D-1..3, SC-2.
  - Acceptance: logged-out search/filter/detail works; opposite-side +
    same/related-category suggestions; visitors see login CTA, not actions.
- [ ] **BL-07 Proposals: create/respond/expire/withdraw, capped at 5 (M)** —
  FR-E-1..3, BR-2.
  - Acceptance: ≥1 listing per side required; 7-day expiry; max 5 open per
    listing with 6th rejected (`proposal-cap-reached`) + Locked indicator;
    accept auto-pauses listing and freezes other pendings; terms freeze on accept.
  - Verify: 6th proposal rejected; second accept blocked while paused.
- [ ] **BL-08 Schedule + place + safety nudge (S)** — FR-E-5, D11.
  - Acceptance: Cairo-labeled date/time + place required; public-spot
    recommendation shown; private residence accepted after reminder.
- [ ] **BL-09 Two-step completion + cancellation (M)** — FR-E-4/6.
  - Acceptance: Done-mark → Confirm/Dispute ≤7 days → auto-complete on silence
    with log; cancellation requires reason; schedule-less completion rejected
    without override + reason.
- [ ] **BL-10 Exchange text thread + block/mute (S)** — FR-E-7, FR-M-6.
  - Acceptance: participant-only plain-text thread; non-participant denied;
    block/mute stops proposals/messages from that user.
- [ ] **BL-11 Blind bilateral reviews + response + aggregate (M)** — FR-R-1..5.
  - Acceptance: one 1–5 + ≤1000-char text per participant; hidden until both
    submit or 14 days; 48h edit window; one ≤1000-char response; average +
    count + distribution + history consistent; no reviews on Cancelled/Disputed
    or self-reviews.
- [ ] **BL-12 Reporting flow + reporter status (S)** — FR-M-1..3.
  - Acceptance: reason codes incl. haram/medical-legal/money/stolen;
    ≥20-char description for `other`; ≤3 images; `Received → Under review →
    Resolved` in-app updates; reported party notified only on action.
- [ ] **BL-13 Moderation queue + audit (M)** — FR-M-4/5, S-5.
  - Acceptance: hide/warn/suspend/ban with actor+reason+timestamp log; review
    voids logged; stolen-item hide-first + owner-approved handover; no silent
    review edits; post-escalation deletion blocked.
- [ ] **BL-14 In-app notification inbox (M)** — FR-N-1, D9.
  - Acceptance: one unread item per event (proposal/schedule/completion/
    cancellation/review/report/lend T-3d/T+0/T+3d/overdue/moderation); zero
    emails sent.
- [ ] **BL-15 Disclaimers on 5 flows (S)** — NFR-L-1, BR-7.
  - Acceptance: short notice + full-terms link on signup, listing create,
    proposal accept, schedule confirm, item-lend; release fails if any missing;
    disclaimers meet contrast + screen-reader bar.
- [ ] **BL-16 Terms + privacy notice + retention behavior (S)** — P-1..6, D8/D13.
  - Acceptance: Terms/privacy published (human-developer owned); 12-month
    message / 24-month log retention then anonymize; moderator access only on
    open case + logged; deactivation hides immediately; delete/anonymize ≤30
    days except disclosed holds; uploads strip location metadata.
- [ ] **BL-17 Accessibility baseline (S)** — A-1..5.
  - Acceptance: keyboard-only J0–J6 + report pass; visible focus; text-labeled
    statuses; alt-text prompts; Cairo-time labels; reduced-motion respected.
- [ ] **BL-18 Pilot metrics + launch gate (S)** — D12/D14, NFR-O-1, §10.
  - Acceptance: dashboard tracks members/listings/completions/triage/incidents;
    launch checklist (Terms, consult note, 2 moderators, backup/health,
    SECURITY contact drill, disclaimer + keyboard audits) all green.

## Explicitly out of scope (do not schedule in MVP)

Money/payments; native apps; video; calendars/sync; smart matching; escrow/
insurance; multi-campus logic; SSO/verification; multi-language; shipping;
group/chained swaps; org accounts; public API/export; gamification/ads;
email/SMS/push; fixed loan caps. (See product-requirements §5.)

## Backlog discipline

- Every behavior change needs tests per `AGENTS.md`; no validation/security
  control may be disabled to make work pass.
- Human developer is final authority on requirements, scope, security, and merges.
