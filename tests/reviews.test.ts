import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createReputationService } from '../src/reputation/service.js';
import { setupCompletedExchange, setupScheduledExchange, DAY_MS } from './helpers.js';

describe('reviews', () => {
  it('requires a Completed exchange; validates score and text', () => {
    const ctx = setupScheduledExchange();
    const rep = createReputationService({ exchanges: ctx.exchanges }, { now: ctx.now });
    const early = rep.submitReview(ctx.aid, ctx.exchangeId, { score: 5, text: 'Great!' });
    assert.equal(early.ok, false);
    if (!early.ok) assert.ok(early.errors.some((e) => e.code === 'exchange-not-completed'));

    const done = setupCompletedExchange();
    const rep2 = createReputationService({ exchanges: done.exchanges }, { now: done.now });
    const badScore = rep2.submitReview(done.aid, done.exchangeId, { score: 6 });
    assert.equal(badScore.ok, false);
    if (!badScore.ok) assert.ok(badScore.errors.some((e) => e.field === 'score'));
    const longText = rep2.submitReview(done.aid, done.exchangeId, { score: 5, text: 'x'.repeat(1001) });
    assert.equal(longText.ok, false);
    if (!longText.ok) assert.ok(longText.errors.some((e) => e.field === 'text'));
  });

  it('one review per participant; second rejected', () => {
    const ctx = setupCompletedExchange();
    const rep = createReputationService({ exchanges: ctx.exchanges }, { now: ctx.now });
    assert.equal(rep.submitReview(ctx.aid, ctx.exchangeId, { score: 5 }).ok, true);
    const dup = rep.submitReview(ctx.aid, ctx.exchangeId, { score: 4 });
    assert.equal(dup.ok, false);
    if (!dup.ok) assert.ok(dup.errors.some((e) => e.code === 'duplicate-review'));
  });

  it('blind: counterparty cannot see my review pre-reveal; I can', () => {
    const ctx = setupCompletedExchange();
    const rep = createReputationService({ exchanges: ctx.exchanges }, { now: ctx.now });
    const r = rep.submitReview(ctx.aid, ctx.exchangeId, { score: 5, text: 'Reliable partner.' });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(rep.getReview(ctx.bid, r.value.id), undefined);
    assert.ok(rep.getReview(ctx.aid, r.value.id));
  });

  it('reveals when both submit', () => {
    const ctx = setupCompletedExchange();
    const rep = createReputationService({ exchanges: ctx.exchanges }, { now: ctx.now });
    const a = rep.submitReview(ctx.aid, ctx.exchangeId, { score: 5 });
    const b = rep.submitReview(ctx.bid, ctx.exchangeId, { score: 4 });
    assert.equal(a.ok && b.ok, true);
    if (!a.ok || !b.ok) return;
    const visible = rep.getReview(ctx.bid, a.value.id);
    assert.ok(visible && visible.status === 'Published');
  });

  it('reveals after 14 days via revealDue even if one side silent', () => {
    const ctx = setupCompletedExchange();
    const rep = createReputationService({ exchanges: ctx.exchanges }, { now: ctx.now });
    const r = rep.submitReview(ctx.aid, ctx.exchangeId, { score: 5 });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    ctx.setNow(ctx.now() + 15 * DAY_MS);
    const revealed = rep.revealDue(ctx.now());
    assert.equal(revealed.length, 1);
    assert.ok(rep.getReview(ctx.bid, r.value.id));
  });

  it('48h edit window, then immutable', () => {
    const ctx = setupCompletedExchange();
    const rep = createReputationService({ exchanges: ctx.exchanges }, { now: ctx.now });
    const r = rep.submitReview(ctx.aid, ctx.exchangeId, { score: 3 });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(rep.editReview(ctx.aid, r.value.id, { score: 5 }).ok, true);
    ctx.setNow(ctx.now() + 3 * DAY_MS);
    assert.equal(rep.editReview(ctx.aid, r.value.id, { score: 1 }).ok, false);
  });
});
