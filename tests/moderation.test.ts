import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createIdentityService } from '../src/identity/service.js';
import { createListingsService } from '../src/listings/service.js';
import { createExchangesService } from '../src/exchanges/service.js';
import { createReputationService } from '../src/reputation/service.js';
import { createModerationService } from '../src/moderation/service.js';

function setup() {
  const identity = createIdentityService();
  const listings = createListingsService();
  const rep = identity.register({
    email: 'reporter@gmail.com', password: 'password1', displayName: 'Reporter',
    campus: 'KFS University', ageConfirmed18: true, rulesAccepted: true,
  });
  const own = identity.register({
    email: 'owner@gmail.com', password: 'password1', displayName: 'Owner',
    campus: 'KFS University', ageConfirmed18: true, rulesAccepted: true,
  });
  assert.equal(rep.ok && own.ok, true);
  if (!rep.ok || !own.ok) throw new Error('setup failed');
  const listing = listings.publish(own.value.id, {
    side: 'offer', kind: 'item', title: 'Cheap phone, hurry',
    description: 'Selling a phone below market price.', category: 'electronics',
    zone: 'Dorms', images: [], modality: 'give',
  });
  assert.equal(listing.ok, true);
  if (!listing.ok) throw new Error('setup failed');
  const exchanges = createExchangesService({ listings, identity });
  const reputation = createReputationService({ exchanges });
  const moderation = createModerationService({ listings, identity, reputation });
  return {
    identity, listings, moderation,
    reporter: rep.value.id, owner: own.value.id, listing: listing.value,
  };
}

describe('moderation reports', () => {
  it('any member reports any listing with reason code; images capped at 3', () => {
    const { moderation, reporter, listing } = setup();
    const r = moderation.report(reporter, {
      targetType: 'listing', targetId: listing.id,
      reasonCode: 'spam-commercial', description: 'Commercial storefront link in description.',
      images: [],
    });
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value.status, 'Received');
    const tooMany = moderation.report(reporter, {
      targetType: 'listing', targetId: listing.id,
      reasonCode: 'spam-commercial', description: 'Too many images attached here.',
      images: ['a', 'b', 'c', 'd'],
    });
    assert.equal(tooMany.ok, false);
  });

  it('other requires >=20-char description', () => {
    const { moderation, reporter, listing } = setup();
    const short = moderation.report(reporter, {
      targetType: 'listing', targetId: listing.id,
      reasonCode: 'other', description: 'Short.',
      images: [],
    });
    assert.equal(short.ok, false);
    if (!short.ok) assert.ok(short.errors.some((e) => e.field === 'description'));
  });

  it('report transitions Received -> Under review -> Resolved', () => {
    const { moderation, reporter, listing } = setup();
    const r = moderation.report(reporter, {
      targetType: 'listing', targetId: listing.id,
      reasonCode: 'harassment', description: 'Threatening language in the description text here.',
      images: [],
    });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(moderation.triage(r.value.id, 'mod-1', 'acknowledge').ok, true);
    assert.equal(moderation.getReport(r.value.id)?.status, 'Under review');
    const resolved = moderation.triage(r.value.id, 'mod-1', 'resolve');
    assert.equal(resolved.ok, true);
    if (resolved.ok) assert.equal(resolved.value.status, 'Resolved');
  });
});

describe('moderation sanctions', () => {
  it('hide removes listing from discovery; unhide restores via Paused', () => {
    const { listings, moderation, reporter, listing } = setup();
    const s = moderation.sanction('mod-1', {
      action: 'hide', targetType: 'listing', targetId: listing.id, reason: 'Confirmed commercial spam.',
    });
    assert.equal(s.ok, true);
    assert.equal(listings.get(listing.id)?.status, 'Hidden');
    const audit = moderation.auditLog();
    const entry = audit.find((a) => a.kind === 'sanction' && a.action === 'hide');
    assert.ok(entry && entry.kind === 'sanction');
    if (entry && entry.kind === 'sanction') {
      assert.equal(entry.actor, 'mod-1');
      assert.ok(entry.reason && entry.atMs);
    }
    const u = moderation.unhide('mod-1', listing.id, 'Appeal upheld.');
    assert.equal(u.ok, true);
    assert.equal(listings.get(listing.id)?.status, 'Paused');
  });

  it('suspend blocks login; warn only records', () => {
    const { identity, moderation, reporter, owner } = setup();
    assert.equal(
      moderation.sanction('mod-1', {
        action: 'suspend', targetType: 'user', targetId: owner, reason: 'Harassment pattern.',
      }).ok,
      true,
    );
    const login = identity.authenticate('owner@gmail.com', 'password1');
    assert.equal(login.ok, false);
    if (!login.ok) assert.ok(login.errors.some((e) => e.code === 'account-suspended'));
    const w = moderation.sanction('mod-1', {
      action: 'warn', targetType: 'user', targetId: reporter, reason: 'Borderline report wording.',
    });
    assert.equal(w.ok, true);
    assert.equal(identity.authenticate('reporter@gmail.com', 'password1').ok, true);
  });
});

describe('moderation stolen path', () => {
  it('stolen reports hide-first and open a case immediately', () => {
    const { listings, moderation, reporter, listing } = setup();
    const r = moderation.report(reporter, {
      targetType: 'listing', targetId: listing.id,
      reasonCode: 'stolen-goods', description: 'Serial-less laptop, seller evasive about origin.',
      images: [],
    });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.escalated, true);
    assert.equal(r.value.status, 'Under review');
    assert.equal(listings.get(listing.id)?.status, 'Hidden');
  });

  it('handover impossible without owner approval; evidence preserved', () => {
    const { moderation, reporter, listing } = setup();
    const r = moderation.report(reporter, {
      targetType: 'listing', targetId: listing.id,
      reasonCode: 'stolen-goods', description: 'Serial-less laptop, seller evasive about origin.',
      images: [],
    });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    const denied = moderation.escalate(r.value.id, 'mod-1', { ownerApproved: false });
    assert.equal(denied.ok, false);
    if (!denied.ok) assert.ok(denied.errors.some((e) => e.code === 'handover-approval-required'));
    const handover = moderation.escalate(r.value.id, 'mod-1', { ownerApproved: true });
    assert.equal(handover.ok, true);
    if (!handover.ok) return;
    assert.equal(handover.value.evidence.targetId, listing.id);
    assert.equal(handover.value.evidence.reasonCode, 'stolen-goods');
    assert.equal(moderation.getReport(r.value.id)?.status, 'Resolved');
  });
});
