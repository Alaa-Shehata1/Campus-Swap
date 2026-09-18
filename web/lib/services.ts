import { createIdentityService } from '../../src/identity/service.js';
import { createListingsService } from '../../src/listings/service.js';
import { createExchangesService } from '../../src/exchanges/service.js';
import { createReputationService } from '../../src/reputation/service.js';
import { createModerationService } from '../../src/moderation/service.js';
import {
  MySqlExchangesStore,
  MySqlIdentityStore,
  MySqlListingsStore,
  MySqlModerationStore,
  MySqlNotificationSink,
  MySqlReputationStore,
} from './db/repositories';
import { db } from './db';

/**
 * Per-request domain services backed by MySQL (ADR-0002).
 * Pool is a singleton; stores are cheap wrappers created per request.
 * The notification sink is shared: every domain event (proposals, schedule,
 * completion, reviews, reports, sanctions) persists to the inbox (FR-N-1).
 */
export function services() {
  const pool = db();
  const identity = createIdentityService(new MySqlIdentityStore(pool));
  const listings = createListingsService(new MySqlListingsStore(pool));
  const listingsStore = new MySqlListingsStore(pool);
  const notify = new MySqlNotificationSink(pool);
  const exchanges = createExchangesService(
    {
      listings: {
        get: (id) => listingsStore.get(id),
        systemPause: (id) => listings.systemPause(id),
      },
      identity: {
        getProfile: (id) => identity.getProfile(id),
        isBlockedOrMuted: (a, b) => identity.isBlockedOrMuted(a, b),
      },
      notify,
    },
    { store: new MySqlExchangesStore(pool) },
  );
  const reputation = createReputationService(
    {
      exchanges: { readExchange: (id) => exchanges.readExchange(id) },
      notify,
    },
    { store: new MySqlReputationStore(pool) },
  );
  const moderation = createModerationService(
    {
      ownerId: process.env['MODERATION_OWNER_ID'],
      listings: {
        get: (id) => listingsStore.get(id),
        systemHide: (id) => listings.systemHide(id),
        systemUnhide: (id) => listings.systemUnhide(id),
      },
      identity: {
        getProfile: (id) => identity.getProfile(id),
        restrict: (id, r) => identity.restrict(id, r),
      },
      reputation: {
        voidReview: (by, id, reason) => reputation.voidReview(by, id, reason),
      },
      exchanges: {
        readExchange: (id) => exchanges.readExchange(id),
        readThread: (id) => exchanges.readThread(id),
      },
      notify,
    },
    { store: new MySqlModerationStore(pool) },
  );
  return { identity, listings, exchanges, reputation, moderation, notify };
}

export type Services = ReturnType<typeof services>;

/**
 * Lazy time-duty sweep (U2): expiry + auto-complete run in-process at the
 * start of proposal/exchange reads instead of a scheduler (plan-to-launch
 * decision 3 for U2; a real job runner is U4/post-MVP scope).
 */
export async function sweepExchanges(svc: Services): Promise<void> {
  const nowMs = Date.now();
  await svc.exchanges.runExpiry(nowMs);
  await svc.exchanges.runAutoComplete(nowMs);
}

/**
 * Lazy review reveal (U3): both-in/14-day publishing runs in-process at the
 * start of review reads instead of a scheduler (same pattern as U2 sweeps).
 */
export async function sweepReveals(svc: Services): Promise<void> {
  await svc.reputation.revealDue(Date.now());
}
