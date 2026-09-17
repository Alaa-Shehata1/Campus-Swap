import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createIdentityService } from '../src/identity/service.js';
import { createListingsService } from '../src/listings/service.js';
import { createExchangesService } from '../src/exchanges/service.js';
import { createReputationService } from '../src/reputation/service.js';
import { createModerationService } from '../src/moderation/service.js';
import { createNotificationsService } from '../src/notifications/service.js';

function setup() {
  const notify = createNotificationsService();
  const identity = createIdentityService();
  const listings = createListingsService();
  const a = identity.register({
    email: 'alice@gmail.com', password: 'password1', displayName: 'Alice',
    campus: 'KFS University', ageConfirmed18: true, rulesAccepted: true,
  });
  const b = identity.register({
    email: 'bob@gmail.com', password: 'password1', displayName: 'Bob',
    campus: 'KFS University', ageConfirmed18: true, rulesAccepted: true,
  });
  assert.equal(a.ok && b.ok, true);
  if (!a.ok || !b.ok) throw new Error('setup failed');
  const offer = listings.publish(a.value.id, {
    side: 'offer', kind: 'skill', title: 'Python tutoring',
    description: 'I teach Python basics.', category: 'tutoring',
    zone: 'North campus', images: [],
  });
  const request = listings.publish(b.value.id, {
    side: 'request', kind: 'skill', title: 'Need Python help',
    description: 'Looking for help.', category: 'tutoring',
    zone: 'North campus', images: [],
  });
  assert.equal(offer.ok && request.ok, true);
  if (!offer.ok || !request.ok) throw new Error('setup failed');
  const exchanges = createExchangesService({ listings, identity, notify });
  const reputation = createReputationService({ exchanges, notify });
  const moderation = createModerationService({ listings, identity, reputation, notify });
  return { notify, identity, listings, exchanges, reputation, moderation, aid: a.value.id, bid: b.value.id, offer: offer.value, request: request.value };
}

describe('notification wiring', () => {
  it('proposal lifecycle notifies the counterparty side', () => {
    const { notify, exchanges, aid, bid, offer, request } = setup();
    const p = exchanges.propose(aid, {
      sideAListingIds: [offer.id], sideBListingIds: [request.id], terms: 'Deal.',
    });
    assert.equal(p.ok, true);
    if (!p.ok) return;
    assert.ok(notify.inbox(bid).some((i) => i.type === 'proposal-received'));
    assert.equal(notify.inbox(aid).length, 0);
    assert.equal(exchanges.respond(bid, p.value.id, 'accept').ok, true);
    assert.ok(notify.inbox(aid).some((i) => i.type === 'proposal-accepted'));
  });

  it('completion loop notifies; reveal notifies without pre-reveal leak', () => {
    const { notify, exchanges, reputation, aid, bid, offer, request } = setup();
    const p = exchanges.propose(aid, {
      sideAListingIds: [offer.id], sideBListingIds: [request.id], terms: 'Deal.',
    });
    assert.equal(p.ok, true);
    if (!p.ok) return;
    const acc = exchanges.respond(bid, p.value.id, 'accept');
    assert.equal(acc.ok && 'exchange' in acc.value, true);
    if (!acc.ok || !('exchange' in acc.value)) return;
    const eid = acc.value.exchange.id;
    assert.equal(
      exchanges.schedule(aid, eid, { at: new Date(Date.now() + 86400000).toISOString(), place: 'Library' }).ok,
      true,
    );
    assert.ok(notify.inbox(bid).some((i) => i.type === 'schedule-set'));
    assert.equal(exchanges.markDone(aid, eid).ok, true);
    assert.ok(notify.inbox(bid).some((i) => i.type === 'completion-requested'));
    assert.equal(exchanges.confirm(bid, eid).ok, true);
    assert.ok(notify.inbox(aid).some((i) => i.type === 'completion-confirmed'));

    // blind: submit alone notifies nobody; reveal notifies the reviewee
    assert.equal(reputation.submitReview(aid, eid, { score: 5 }).ok, true);
    assert.ok(!notify.inbox(bid).some((i) => i.type === 'review-published'));
    assert.equal(reputation.submitReview(bid, eid, { score: 4 }).ok, true);
    assert.ok(notify.inbox(bid).some((i) => i.type === 'review-published'));
    const target = reputation.aggregate(bid).history[0]!;
    assert.equal(reputation.respondToReview(bid, target.id, { text: 'Thanks!' }).ok, true);
    assert.ok(notify.inbox(aid).some((i) => i.type === 'review-response'));
  });

  it('report lifecycle notifies reporter; sanction notifies target only on action', () => {
    const { notify, moderation, aid, bid, request } = setup();
    const r = moderation.report(aid, {
      targetType: 'listing', targetId: request.id,
      reasonCode: 'spam-commercial', description: 'Commercial storefront link in description.',
      images: [],
    });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    // mere report: reporter updated, reported party silent
    assert.ok(notify.inbox(aid).some((i) => i.type === 'report-status'));
    assert.equal(notify.inbox(bid).length, 0);
  });
});
