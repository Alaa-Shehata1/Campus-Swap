# CampusSwap — Functional Requirements (v2, Decided)

> Companion to `product-requirements.md`. Product-level `what`, not implementation
> `how`. Every rule below is testable by exercising user-visible behavior.

## 1. Identity & Profiles

- FR-ID-1: Signup accepts **any valid email** (no university-email restriction).
  Required: email, password, display name, campus/university (required, default
  `KFS University`), 18+ confirmation checkbox, rules acceptance.
  *Verify: gmail/yahoo/KFS addresses accepted; missing campus or unchecked 18+
  rejected with field-specific errors.*
- FR-ID-2: Roles: `visitor` (logged-out, read-only) / `member` / `moderator`.
  All mutations (publish, propose, message, schedule, complete, review, report,
  block) require `member` session.
  *Verify: logged-out POST-equivalent action is blocked with a login prompt and
  post-login return to context.*
- FR-ID-3: Profile shows display name, self-declared campus labeled
  `self-declared (not verified)`, join date, completed-exchange count, aggregate
  rating, and moderation badges if any. University email never displayed.
  *Verify: no `Verified KFS student` badge exists in MVP.*
- FR-ID-4: Editable: display name, bio (≤500 chars), skill tags, availability
  notes. *Verify: over-long bio rejected; email change re-verifies ownership.*
- FR-ID-5: One account per person (keyed by email). Misrepresenting campus or
  age is a policy violation. *Verify: duplicate-email signup rejected.*

## 2. Offers & Requests (Listings)

- FR-L-1: Members can create **Offers** (what I give) and **Requests** (what I
  need), each typed `skill` or `item`. *Verify: each publish path exercised.*
- FR-L-2: Required fields: side (offer/request), kind (skill/item), title
  (≤80 chars), description (≤2000 chars), category (fixed taxonomy), campus zone
  / meetup area text, images (items 0–5, skills 0–2). Optional: estimated
  duration (skills), availability window.
  *Verify: missing/invalid required field blocks publish with specific error.*
- FR-L-3: Lifecycle `Draft → Active → Paused → Archived`. Only `Active`
  discoverable. Owner may pause/archive anytime; drafts retained.
  *Verify: paused/archived/draft listings absent from browse/search.*
- FR-L-4: Max **20 active listings** per member (spam control).
  *Verify: 21st publish rejected with reason + link to manage listings.*
- FR-L-5: Item modality required: `lend` (return expected; **lender-defined
  return date/duration required**) | `give` (permanent) | `swap`
  (item-for-item; desired counterpart required).
  *Verify: `lend` without return term rejected; `swap` without counterpart
  description rejected.*
- FR-L-6: Prohibited classes are unpublishable/unretainable: haram content,
  medical advice/services, legal advice/services, weapons, drugs/alcohol,
  stolen goods, sexual services, commercial advertising.
  *Verify: seeded fixture in each class is blocked or fast-removed via report.*

## 3. Discovery (public read)

- FR-D-1: Visitors and members can browse, keyword-search, and filter by side
  (offer/request), kind (skill/item), category, campus zone, availability.
  *Verify: combined filters narrow results; logged-out search works.*
- FR-D-2: Detail view shows full terms, loan terms if `lend`, owner reputation
  summary (average + count), report entry, and opposite-side same/related-category
  suggestions. Visitors see `Log in to propose` instead of action buttons.
- FR-D-3: `Compatible` (MVP) = opposite side + same/related category + both
  `Active`. Ranking: recency + category match only (no recommender).
  *Verify: incompatible-side listings never suggested as compatible.*

## 4. Proposals & Exchanges

- FR-E-1: A Proposal references **≥1 listing from each side**
  (e.g. A.Offer × B.Request, or Offer × Offer). Free-text terms required.
  *Verify: one-sided proposal rejected.*
- FR-E-2: Proposal lifecycle `Proposed → Accepted | Declined | Expired |
  Withdrawn`. Expiry **7 days** without response. Withdrawal allowed any time
  before acceptance by either side. Accepted ⇒ Exchange `Scheduled`.
- FR-E-3: **Unlimited concurrent proposals** per listing; listing stays `Active`
  while proposals pend. No auto-pause. Owner resolves conflicts manually.
  *Verify: 50 open proposals on one listing coexist; acceptance of one does not
  hide the listing.*
- FR-E-4: Exchange lifecycle `Scheduled → Completed | Cancelled | Disputed`.
  Cancellation requires reason (no-show, conflict, item unavailable, safety
  concern, other + optional text).
- FR-E-5: Schedule requires date/time (interpreted `Africa/Cairo`, labeled) +
  meeting-place text. UI shows public on-campus recommendation; private
  residences accepted with safety reminder.
  *Verify: schedule without place rejected; private-residence text accepted only
  after reminder shown.*
- FR-E-6: Completion is two-step: A marks Done → B Confirms or Disputes within
  **7 days**; silence ⇒ auto-complete with notification log. Completion without
  a schedule requires explicit override + reason.
- FR-E-7: Participant-only text thread per exchange (plain text, no files in
  MVP), retained per retention policy, visible to moderators only on opened
  case. *Verify: non-participant cannot read; post-retention text anonymized.*

## 5. Reviews / Reputation

- FR-R-1: After `Completed`, each participant may leave exactly one review:
  1–5 score + optional text (≤1000 chars). *Verify: second review rejected.*
- FR-R-2: **Blind bilateral:** hidden until both submit or **14 days**, then
  both publish. 48h edit window, then immutable except by moderation.
- FR-R-3: Aggregate = **average + count + distribution + full history**.
  *Verify: average/count/distribution consistent with underlying reviews.*
- FR-R-4: No self-review; no reviews on Cancelled/Disputed (dispute may leave a
  moderator system note, not stars). *Verify: review entry absent there.*
- FR-R-5: Reviewed party may post **one response** (≤1000 chars) per review;
  48h edit window. *Verify: second response rejected.*

## 6. Reporting & Moderation

- FR-M-1: Any member may report any listing or user.
- FR-M-2: Report requires target + reason code (`haram content`,
  `medical/legal advice`, `money request`, `stolen goods`, `spam/commercial`,
  `harassment`, `unsafe behavior`, `policy/academic`, `other`) + description
  (≥20 chars if `other`) + optional images (≤3).
- FR-M-3: Reporter status `Received → Under review → Resolved` via in-app
  notification. Reported party notified only on action.
- FR-M-4: Moderator powers: hide listing, warn/suspend/ban user, void reviews
  from abusive exchanges. Every action logged with actor + reason + timestamp.
- FR-M-5: Stolen-item path: hide-first → review → **law-enforcement handover
  only with owner (human developer) approval**; evidence (report, messages,
  identities) preserved in handover log. *Verify: handover without approval
  impossible; post-escalation deletion blocked.*
- FR-M-6: Members may block/mute another user (stops proposals/messages from
  that user). *Verify: blocked party's proposal/message to blocker rejected.*

## 7. In-App Notifications (only channel in MVP)

- FR-N-1: Events (exactly one unread item each): proposal received/accepted/
  declined/expired, schedule set/changed, completion requested/confirmed,
  cancellation, review available/published/response, report status change,
  lend reminders (T-3d, T+0, T+3d vs return date), overdue notice, block/
  moderation action affecting the user. *Verify: no email sent for any event.*

## 8. Business Rules

- BR-1: **No money.** Requesting/offering money, payment links, or paid
  off-platform services is removable; repeat ⇒ suspend. *Verify: seeded
  money-request fixture removable via report.*
- BR-2: **Reciprocity:** every exchange defines give-and-take on both sides
  before acceptance; one-sided proposals rejected (FR-E-1).
- BR-3: **One account per person;** campus/age misrepresentation is a violation.
- BR-4: **In-person, on/near campus by default;** remote only if explicitly
  tagged; physical meeting place required for completion.
- BR-5: **Prohibited content (working definition, owner: human developer;
  consult KFS student affairs pre-launch):** (a) haram content — e.g.
  alcohol/drugs facilitation, gambling, sexual services, other content
  violating public morals as enumerated in Terms; (b) medical advice/services/
  diagnosis/treatment; (c) legal advice/representation; (d) weapons, stolen
  goods, commercial ads. Moderators enforce the enumerated list, not personal
  judgment. *Verify: each enumerated class maps to a report reason.*
- BR-6: **Academic boundary:** tutoring, collaboration, feedback, and project
  help allowed. Prohibited: submitting assessed work under another's name,
  exam impersonation, contract cheating. Borderline cases escalated to
  moderation lead; Terms carry final wording (owner: human developer).
- BR-7: **Item loans:** lender sets return term; platform has **zero liability**
  for damage/loss/theft; borrower owes return in stated condition; remedy is
  moderation + reviews only. Disclaimers required on listing create (lend),
  proposal accept, schedule confirm.
- BR-8: **Fairness (soft):** durations shown side-by-side pre-accept; no
  system block on imbalance; reviews discipline fairness.
- BR-9: **18+ only;** self-confirmation + Terms prohibition; discovered
  under-age use ⇒ suspension.

## 9. Domain Glossary (product meaning)

| Term | Meaning |
|---|---|
| Offer / Request | `I give` / `I need`. Subtype `skill` or `item`. |
| Listing | Published Offer/Request; states `Draft/Active/Paused/Archived`. |
| Proposal | Invitation linking ≥1 listing per side + terms; `Proposed/Accepted/Declined/Expired/Withdrawn`. |
| Exchange | Accepted proposal; `Scheduled/Completed/Cancelled/Disputed`. |
| LoanTerm | Lender-defined return date/duration on `lend` (required). |
| Schedule | Cairo-time date/time + place text. |
| Completion | Done-mark + Confirm (or 7-day auto-complete). |
| Review (blind bilateral) | 1–5 + text, one per participant, revealed jointly. |
| ReviewResponse | One reply text by reviewee. |
| Reputation | Average + count + distribution + history. |
| Report | Flag with reason + evidence; `Received/Under review/Resolved`. |
| Disclaimer | Inline short notice + full-terms link (5 required flows). |
| InAppNotification | Only notification channel in MVP. |
| Campus (self-declared) | Signup text field, default KFS; not verified. |

Relations: `User 1—* Listing; Proposal *—* Listing (≥1/side);
Proposal 1—0..1 Exchange; Exchange 1—0..2 Review; Review 1—0..1 Response;
Report *—1 User|Listing`.

## 10. Edge Cases (required handling)

1. No-show ⇒ cancellable (`no-show`); no review; pattern flaggable.
2. Partial completion ⇒ no partial state in MVP; mark `Disputed` with note.
3. Overdue lend ⇒ reminders + `item not returned` report; no auto-penalty.
4. Double-commit (accepted twice for one item) ⇒ allowed by system; owner
   cancels one with reason; repeat ⇒ sanctionable.
5. Value dispute ⇒ pre-accept durations only; post-hoc remedy is review.
6. Graduation/email loss ⇒ existing exchanges completable; new publishing
   requires active login only (no enrollment recheck in MVP).
7. Spam/duplicates ⇒ 20-listing cap + report; moderator hide.
8. Post-accept edits ⇒ terms frozen; changes need new proposal or mutual
   re-confirm in thread.
9. Account deletion with pending items ⇒ deactivate (hide listings, freeze
   exchanges visible to counterparty/moderators) until retention	positions
   allow anonymization.
10. Offensive review/message content ⇒ reportable; moderator redact/void.

## 11. Abuse / Misuse (signal → mitigation)

| Abuse | Signal | Mitigation |
|---|---|---|
| Money request | keywords, links, reports | remove + strike; repeat suspend |
| Contract cheating | `write my exam/thesis`, impersonation | prohibited class + report + lead review |
| Scam / bait-and-switch | stock photos, refusal to meet publicly | photo-encouraged, public-place nudge, reputation, suspend on pattern |
| Harassment/stalking | repeat proposals after decline/block | block/mute, throttling via moderation, ban on pattern |
| Fake/multi accounts | duplicates | one-account rule, suspend duplicates |
| Review extortion | threats in thread | blind reviews + `extortion` under harassment reason |
| Reputation farming | rapid mutual completions | flag + void + suspend |
| Commercial spam | bulk listings, external links | cap + remove + suspend |
| Dangerous meetings | private-place pressure, isolated night meets | safety copy, block/report, ban on pattern |
| Stolen goods | `no questions`, serial-less electronics | hide-first + approved handover path (FR-M-5) |
| Under-age use | self-report, conflicting info | suspend per BR-9 |
