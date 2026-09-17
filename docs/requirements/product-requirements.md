# CampusSwap — Product Requirements (v2, Decided)

> Status: **Decided baseline.** Human approved A1–A12; remaining delegated choices
> resolved below by the agent and marked `[DECIDED-AGENT]`. Human retains final
> authority per `AGENTS.md` and may override any item.
> No implementation, architecture, or technology-stack decisions are made here.

## 0. Decision Log (answers to v1 Q1–Q12)

| # | Decision |
|---|---|
| D1 | Any email may register. No university-email restriction. Signup requires display name, email, password, campus/university field (required, default `KFS University`), 18+ confirmation, rules acceptance. Campus is **self-declared, not verified**. |
| D2 | Pilot: **KFS University**. UI language: **English only**. Canonical timezone: **`Africa/Cairo`** (all datetimes labeled Cairo time). |
| D3 | Prohibited listing classes: **haram content, medical advice/services, legal advice/services**, plus weapons, drugs/alcohol, stolen goods, sexual services, commercial advertising. |
| D4 | Item modalities: `lend` \| `give` \| `swap` (item-for-item allowed). Loan duration/return date is **lender-defined per deal** (required for `lend`). **Zero platform liability** for damage/loss/theft; disclaimers pervasive (see NFR-L-1). |
| D5 | Academic help **including project work** is allowed (tutoring, collaboration, code review, essay feedback). Prohibited: submitting assessed work under another's name, exam impersonation, contract cheating. |
| D6 | Reviews are **blind bilateral**; aggregate shows **average + count + distribution + full history**; **one threaded response per review** allowed. |
| D7 (rev.1) | Listings accept max **5 open proposals** (**ProposalCap**). At cap the listing is **Locked** (still visible; no new proposals). Slots free on Declined/Expired/Withdrawn. On Accept the listing **auto-pauses** (owner may reopen); remaining pending proposals go read-only until reopened or declined. |
| D8 | Retention: exchange messages + proposal history **12 months after exchange closure**, then anonymized. Reports/moderation logs **24 months**, then anonymized. Moderators see messages only on an opened case; access logged. `[DECIDED-AGENT]` |
| D9 | Notifications are **in-app only** in MVP. No email/SMS/push. |
| D10 | Stolen-item reports: hide-first, then moderator review; **law-enforcement handover only on owner (human developer) approval** with preserved evidence. Liability disclaimers on signup, listing create, proposal accept, schedule confirm, item-lend flow. |
| D11 | Meeting place: **public on-campus spots recommended**, **private residences allowed** by mutual agreement. **18+ only** (self-confirmation at signup + Terms prohibition). |
| D12 | Pilot success (8 weeks post-launch at KFS): ≥200 activated members, ≥150 published listings, ≥30 completed exchanges, median report triage ≤48h, no critical safety incident mishandled. `[DECIDED-AGENT]` |
| D13 | Haram-content working definition + Terms ownership: **human developer authors Terms v1**, consults KFS student affairs before launch. Working definition in §7 BR-5. `[DECIDED-AGENT]` |
| D14 | Interim moderation: **human developer = moderation lead** + 2 KFS volunteers (TBD). Launch blocked until 2 moderators named. `[DECIDED-AGENT]` |

## 1. Product Vision

CampusSwap is a university-scoped, money-free barter platform where students
exchange **skills** (e.g. "I teach Python") and **physical items** (lend / give /
swap) through structured reciprocal exchanges with scheduling, two-step
completion, and reputation.

Problem (How Might We): How might we let KFS students get help and goods they
need without money, using skills and items they already have, in a way they trust?

### Success criteria (pilot)

- SC-1: New signup → first published listing in < 3 minutes (manual test, p50).
- SC-2: Logged-out visitor can search, filter, and open listing detail; any
  List/Propose/Message/Report action prompts login and returns to prior context.
- SC-3: Pilot targets (D12): 200 members / 150 listings / 30 completed exchanges /
  triage p50 ≤48h within 8 weeks.
- SC-4: Every completed exchange can receive bilateral reviews; every report
  receives `Received → Under review → Resolved` status.

## 2. Target Users / Personas

- **P0. Visitor (logged-out):** evaluates the platform by browsing KFS listings.
  Cannot contact owners or act. Converts via signup prompt.
- **P1. Skilled Helper (e.g. Maya, CS junior):** offers tutoring/editing; wants
  repair/moving help. Fears time-wasters, no-shows, unfair swaps.
- **P2. Item Owner/Borrower (e.g. Jonas, first-year):** lends/borrows drill, tent,
  textbooks. Fears theft, damage, unclear return dates.
- **P3. New/International Student (e.g. Aisha):** low budget, few contacts. Needs
  low-barrier help. Fears scams, unsafe meetings, language barriers.
- **P4. Moderator (human developer as lead + volunteers):** resolves reports with
  a clear evidence trail. Needs bounded queue, SLA, audit log.

## 3. Core User Journeys (acceptance-level)

- **J0. Browse logged-out:** search/filter/view detail → act → login prompt →
  return to context. *Verify: all mutation entry points gated; no anonymous POST.*
- **J1. Signup + publish:** email(any) + password + display name + campus
  (default KFS) + 18+ check + rules accept → publish Offer or Request in ≤5 steps.
  Drafts retained. *Verify: missing campus / unchecked 18+ blocks signup with
  specific errors; `gmail.com`/`yahoo.com`/KFS domains all accepted.*
- **J2. Discover:** browse/search/filter (offer/request, skill/item, category,
  campus zone, availability) → detail (terms + reputation + report + login CTA).
  *Verify: category + opposite-side match surfaces counterparts; empty state
  explains creating the complementary listing.*
- **J3. Propose → negotiate → accept:** proposal links ≥1 listing per side +
  terms text; counterparty Accepts/Declines; proposer may Withdraw; expiry 7 days.
  Max 5 open proposals per listing (6th rejected, listing Locked); auto-pause
  on accept. Accepted ⇒ Exchange `Scheduled`. *Verify: one-sided proposals rejected; terms freeze on accept.*
- **J4. Schedule → meet → complete:** date/time (Cairo) + free-text place
  (public-spot recommendation shown; private allowed) → meet → A marks Done →
  B Confirms (or Disputes within 7 days; auto-complete after 7 days silence with
  notification log). *Verify: completion without schedule rejected unless
  override + reason recorded.*
- **J5. Review:** blind bilateral (hidden until both submit or 14 days), then
  publish; one 1–5 + text (≤1000 chars) per participant; 48h edit window; one
  ≤1000-char response by reviewee. *Verify: no self-review; no review on
  Cancelled/Disputed; pre-reveal invisibility enforced.*
- **J6. Report:** any member reports any listing/user with reason code +
  description + optional images (≤3) → `Received → Under review → Resolved`
  updates in-app. *Verify: duplicate reports deduplicated visibly; reported party
  notified only on action, not on mere report.*

## 4. MVP Scope

**In:** signup/login/logout/profile (D1, 18+); Offer/Request CRUD (skill/item,
lend/give/swap); public browse/search/filter/detail; capped proposals (5 open max,
lock at cap, auto-pause on accept) + participant-only text thread; schedule
(Cairo time + place) + two-step completion + cancellation with reason;
blind reviews + responses + aggregate; report + moderation queue
(hide/warn/suspend/ban, audit-logged) + reporter status; in-app notifications
for proposal/schedule/completion/cancellation/review/report/lend-due events;
pervasive disclaimers; block/mute user.

**MVP simplifications:** single pilot campus (text field, no multi-campus logic);
single language; in-person by default; no payments; typed place (no maps);
no file sharing in chat (images only on listings/reports); no algorithmic
matching beyond category + opposite-side; no insurance/escrow; no email channel.

## 5. Explicitly Out of Scope (MVP)

1. Money, credits, tokens, tips, payment links/integration.
2. Native mobile apps; video/remote-service tooling.
3. Availability calendars; third-party calendar sync.
4. Algorithmic/smart matching, recommendations, skill pricing.
5. Escrow, deposits, insurance, damage compensation.
6. True multi-university scoping; SSO/university-email verification.
7. Multi-language UI; accessibility beyond §14 baseline (baseline required).
8. Courier/shipping; off-campus logistics.
9. Group (>2-party) exchanges; chained/barter-ring swaps; org accounts.
10. Public API, embeds, data export.
11. Gamification, ads, monetization.
12. Email/SMS/push notifications; fixed loan caps.

## 6. Future Expansion (post-MVP, not committed)

Verified-enrollment badge; richer engagement states (e.g. multi-copy listings
that stay open after one accept); per-category loan caps;
map safe-spots; calendar export; email/push opt-in; Arabic UI; true second-campus
scoping; endorsements/vouching; availability overlap; lend-tracking with return
confirmation; sustainability metrics (opt-in); community jury + appeals;
anonymized research with consent.
