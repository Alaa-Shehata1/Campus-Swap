import { fail, ok, type Result } from '../common/errors.js';
import { ReputationStore } from './store.js';
import type { ExchangesPort, Review, SubmitReviewInput } from './types.js';

export const MAX_REVIEW_TEXT = 1000;
export const REVEAL_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
export const REVIEW_EDIT_MS = 48 * 60 * 60 * 1000;

export function createReputationService(
  deps: { exchanges: ExchangesPort },
  opts: { now?: () => number; store?: ReputationStore } = {},
) {
  const store = opts.store ?? new ReputationStore();
  const now = opts.now ?? Date.now;

  function submitReview(
    reviewerId: string,
    exchangeId: string,
    input: SubmitReviewInput,
  ): Result<Review> {
    const e = deps.exchanges.readExchange(exchangeId);
    if (!e || e.status !== 'Completed') {
      return fail([
        { code: 'exchange-not-completed', message: 'Reviews are only allowed on Completed exchanges.' },
      ]);
    }
    const isA = reviewerId === e.participantA;
    const isB = reviewerId === e.participantB;
    if (!isA && !isB) {
      return fail([
        { code: 'not-participant', message: 'Only exchange participants can review.' },
      ]);
    }
    if (!Number.isInteger(input.score) || input.score < 1 || input.score > 5) {
      return fail([
        { code: 'invalid', field: 'score', message: 'Score must be an integer from 1 to 5.' },
      ]);
    }
    if (input.text !== undefined && input.text.length > MAX_REVIEW_TEXT) {
      return fail([
        {
          code: 'too-long',
          field: 'text',
          message: `Review text must be at most ${MAX_REVIEW_TEXT} characters.`,
        },
      ]);
    }
    const existing = store.forExchange(exchangeId).find((r) => r.reviewerId === reviewerId);
    if (existing) {
      return fail([
        { code: 'duplicate-review', message: 'You have already reviewed this exchange.' },
      ]);
    }
    const review = store.insert({
      exchangeId,
      reviewerId,
      revieweeId: isA ? e.participantB : e.participantA,
      score: input.score,
      text: input.text,
      status: 'Hidden',
      submittedAtMs: now(),
    });
    maybeReveal(exchangeId, now());
    return ok(review);
  }

  /** Publish when both sides submitted or 14 days passed since the earliest submit. */
  function maybeReveal(exchangeId: string, atMs: number): void {
    const reviews = store.forExchange(exchangeId).filter((r) => r.status === 'Hidden');
    if (reviews.length === 0) return;
    const submittedCount = store
      .forExchange(exchangeId)
      .filter((r) => r.status !== 'Voided').length;
    const earliest = Math.min(...reviews.map((r) => r.submittedAtMs));
    if (submittedCount >= 2 || atMs - earliest > REVEAL_WINDOW_MS) {
      for (const r of reviews) {
        r.status = 'Published';
        r.publishedAtMs = atMs;
        store.save(r);
      }
    }
  }

  /** Blind read: Hidden reviews visible to their reviewer only; Published to anyone. */
  function getReview(viewerId: string, id: string): Review | undefined {
    const r = store.get(id);
    if (!r) return undefined;
    if (r.status === 'Published') return r;
    if (r.status === 'Voided') {
      const e = deps.exchanges.readExchange(r.exchangeId);
      if (!e) return undefined;
      return viewerId === e.participantA || viewerId === e.participantB ? r : undefined;
    }
    return r.reviewerId === viewerId ? r : undefined;
  }

  function editReview(
    reviewerId: string,
    id: string,
    patch: Partial<SubmitReviewInput>,
  ): Result<Review> {
    const r = store.get(id);
    if (!r || r.reviewerId !== reviewerId) {
      return fail([{ code: 'not-found', message: 'Review not found.' }]);
    }
    if (r.status === 'Voided') {
      return fail([{ code: 'invalid-transition', message: 'Voided reviews cannot be edited.' }]);
    }
    if (now() - r.submittedAtMs > REVIEW_EDIT_MS) {
      return fail([
        { code: 'edit-window-passed', message: 'The 48-hour edit window has passed.' },
      ]);
    }
    if (patch.score !== undefined) {
      if (!Number.isInteger(patch.score) || patch.score < 1 || patch.score > 5) {
        return fail([
          { code: 'invalid', field: 'score', message: 'Score must be an integer from 1 to 5.' },
        ]);
      }
      r.score = patch.score;
    }
    if (patch.text !== undefined) {
      if (patch.text.length > MAX_REVIEW_TEXT) {
        return fail([
          {
            code: 'too-long',
            field: 'text',
            message: `Review text must be at most ${MAX_REVIEW_TEXT} characters.`,
          },
        ]);
      }
      r.text = patch.text;
    }
    r.editedAtMs = now();
    store.save(r);
    return ok(r);
  }

  /** Time-based reveal job. Returns newly published reviews for the notification sink. */
  function revealDue(nowMs: number): Review[] {
    const published: Review[] = [];
    for (const exchangeId of store.exchangeIds()) {
      const before = store.forExchange(exchangeId).filter((x) => x.status === 'Published').length;
      maybeReveal(exchangeId, nowMs);
      const after = store.forExchange(exchangeId).filter((x) => x.status === 'Published');
      if (after.length > before) published.push(...after.slice(before));
    }
    return published;
  }

  return { submitReview, getReview, editReview, revealDue, store };
}

export type ReputationService = ReturnType<typeof createReputationService>;
