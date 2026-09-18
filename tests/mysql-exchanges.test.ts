import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { createIdentityService } from '../src/identity/service.js';
import { createListingsService } from '../src/listings/service.js';
import { createExchangesService } from '../src/exchanges/service.js';
import {
  createMysqlPool,
  MySqlIdentityStore,
  MySqlListingsStore,
  MySqlExchangesStore,
  truncateWorld,
} from '../web/lib/db/repositories.js';

const MYSQL_URL =
  process.env['MYSQL_URL'] ?? 'mysql://campuswap:campuswap@127.0.0.1:3306/campuswap';

describe('mysql exchanges (U2 seam)', () => {
  before(async () => {
    const pool = createMysqlPool(MYSQL_URL);
    try {
      await truncateWorld(pool);
    } finally {
      await pool.end();
    }
  });

  async function world() {
    const pool = createMysqlPool(MYSQL_URL);
    const users = createIdentityService(new MySqlIdentityStore(pool));
    const listingsStore = new MySqlListingsStore(pool);
    const items = createListingsService(listingsStore);
    const exchanges = createExchangesService(
      {
        listings: {
          get: (id) => listingsStore.get(id),
          systemPause: (id) => items.systemPause(id),
        },
        identity: {
          getProfile: (id) => users.getProfile(id),
          isBlockedOrMuted: (a, b) => users.isBlockedOrMuted(a, b),
        },
      },
      { store: new MySqlExchangesStore(pool) },
    );
    return { pool, users, items, exchanges };
  }

  it('proposes, accepts (auto-pause), schedules, completes, and threads through MySQL', async () => {
    const { pool, users, items, exchanges } = await world();
    try {
      const a = await users.register({
        email: 'u2-ana@gmail.com', password: 'password1', displayName: 'Ana',
        campus: 'KFS University', ageConfirmed18: true, rulesAccepted: true,
      });
      const b = await users.register({
        email: 'u2-bo@gmail.com', password: 'password1', displayName: 'Bo',
        campus: 'KFS University', ageConfirmed18: true, rulesAccepted: true,
      });
      assert.equal(a.ok && b.ok, true);
      if (!a.ok || !b.ok) return;

      const offer = await items.publish(a.value.id, {
        side: 'offer', kind: 'skill', title: 'U2 guitar lessons',
        description: 'I teach beginner guitar on campus twice a week.',
        category: 'music', zone: 'North campus', images: [],
      });
      const request = await items.publish(b.value.id, {
        side: 'request', kind: 'skill', title: 'Need guitar lessons',
        description: 'Looking for beginner guitar help before the concert.',
        category: 'music', zone: 'North campus', images: [],
      });
      assert.equal(offer.ok && request.ok, true);
      if (!offer.ok || !request.ok) return;

      const prop = await exchanges.propose(a.value.id, {
        sideAListingIds: [offer.value.id],
        sideBListingIds: [request.value.id],
        terms: 'Two sessions per week, my guitar provided.',
      });
      assert.equal(prop.ok, true);
      if (!prop.ok) return;

      const accepted = await exchanges.respond(b.value.id, prop.value.id, 'accept');
      assert.equal(accepted.ok, true);
      if (!accepted.ok) return;
      assert.equal(accepted.value.exchange.status, 'Scheduled');

      // Accept auto-pauses both listings.
      assert.equal((await items.get(offer.value.id))?.status, 'Paused');
      assert.equal((await items.get(request.value.id))?.status, 'Paused');

      const scheduled = await exchanges.schedule(a.value.id, accepted.value.exchange.id, {
        at: new Date(Date.now() + 86400000).toISOString(),
        place: 'Library hall, North campus',
      });
      assert.equal(scheduled.ok, true);

      const done = await exchanges.markDone(a.value.id, accepted.value.exchange.id);
      assert.equal(done.ok, true);
      const confirmed = await exchanges.confirm(b.value.id, accepted.value.exchange.id);
      assert.equal(confirmed.ok, true);
      if (!confirmed.ok) return;
      assert.equal(confirmed.value.status, 'Completed');

      const msg = await exchanges.postMessage(a.value.id, accepted.value.exchange.id, 'See you there!');
      assert.equal(msg.ok, true);
      const thread = await exchanges.getMessages(b.value.id, accepted.value.exchange.id);
      assert.equal(thread.ok && thread.value.length === 1, true);
    } finally {
      await pool.end();
    }
  });

  it('enforces the 5-open cap through MySQL', async () => {
    const { pool, users, items, exchanges } = await world();
    try {
      const owners: string[] = [];
      for (let i = 0; i < 6; i++) {
        const r = await users.register({
          email: `u2-cap${i}@gmail.com`, password: 'password1', displayName: `Cap${i}`,
          campus: 'KFS University', ageConfirmed18: true, rulesAccepted: true,
        });
        assert.equal(r.ok, true);
        if (r.ok) owners.push(r.value.id);
      }
      const target = await items.publish(owners[0]!, {
        side: 'request', kind: 'skill', title: 'U2 cap target',
        description: 'A popular request that draws many proposals from others.',
        category: 'music', zone: 'North campus', images: [],
      });
      assert.equal(target.ok, true);
      if (!target.ok) return;
      for (let i = 1; i <= 5; i++) {
        const mine = await items.publish(owners[i]!, {
          side: 'offer', kind: 'skill', title: `U2 cap offer ${i}`,
          description: 'An offer referencing the popular request listing.',
          category: 'music', zone: 'North campus', images: [],
        });
        assert.equal(mine.ok, true);
        if (!mine.ok) return;
        const p = await exchanges.propose(owners[i]!, {
          sideAListingIds: [mine.value.id],
          sideBListingIds: [target.value.id],
          terms: `Proposal ${i} terms text here.`,
        });
        assert.equal(p.ok, true);
      }
      const extra = await items.publish(owners[5]!, {
        side: 'offer', kind: 'skill', title: 'U2 cap offer extra',
        description: 'One more offer that should hit the proposal cap.',
        category: 'music', zone: 'North campus', images: [],
      });
      assert.equal(extra.ok, true);
      if (!extra.ok) return;
      const sixth = await exchanges.propose(owners[5]!, {
        sideAListingIds: [extra.value.id],
        sideBListingIds: [target.value.id],
        terms: 'This sixth proposal must be rejected by the cap.',
      });
      assert.equal(sixth.ok, false);
      if (sixth.ok) return;
      assert.ok(sixth.errors.some((e) => e.code === 'proposal-cap-reached'));
      assert.equal((await exchanges.lockStatus(target.value.id)).locked, true);
    } finally {
      await pool.end();
    }
  });
});
