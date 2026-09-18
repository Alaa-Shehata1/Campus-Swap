import { createIdentityService } from '../../src/identity/service.js';
import { createListingsService } from '../../src/listings/service.js';
import { createExchangesService } from '../../src/exchanges/service.js';
import { MySqlExchangesStore, MySqlIdentityStore, MySqlListingsStore } from './db/repositories';
import { db } from './db';

/**
 * Per-request domain services backed by MySQL (ADR-0002).
 * Pool is a singleton; stores are cheap wrappers created per request.
 * No notification sink: the inbox UI lands in U3, so the domain `notify?`
 * stays unset and events are simply not persisted.
 */
export function services() {
  const pool = db();
  const identity = createIdentityService(new MySqlIdentityStore(pool));
  const listings = createListingsService(new MySqlListingsStore(pool));
  const listingsStore = new MySqlListingsStore(pool);
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
    },
    { store: new MySqlExchangesStore(pool) },
  );
  return { identity, listings, exchanges };
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
