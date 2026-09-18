import mysql, { type Pool, type RowDataPacket } from 'mysql2/promise';
import { randomUUID } from 'node:crypto';
import { hashPassword, newSalt, verifyPasswordHash } from '../../../src/identity/crypto.js';
import type { Restriction, Role } from '../../../src/identity/types.js';
import type { StoredUser } from '../../../src/identity/store.js';
import type { Listing } from '../../../src/listings/types.js';
import type {
  Exchange,
  ExchangeStatus,
  Message,
  Proposal,
  ProposalStatus,
} from '../../../src/exchanges/types.js';
import type { ExchangesExport } from '../../../src/exchanges/store.js';

export function createMysqlPool(url: string): Pool {
  return mysql.createPool(url);
}

function num(v: unknown): number {
  return typeof v === 'string' ? Number(v) : (v as number);
}

function bool(v: unknown): boolean {
  return v === 1 || v === true;
}

function json<T>(v: unknown, fallback: T): T {
  if (v === null || v === undefined) return fallback;
  if (typeof v === 'string') {
    try {
      return JSON.parse(v) as T;
    } catch {
      return fallback;
    }
  }
  return v as T;
}

function mapUser(row: RowDataPacket): StoredUser {
  return {
    id: row['id'] as string,
    email: row['email'] as string,
    passwordHash: row['password_hash'] as string,
    passwordSalt: row['password_salt'] as string,
    displayName: row['display_name'] as string,
    campus: row['campus'] as string,
    campusVerified: false,
    joinDate: row['join_date'] as string,
    completedExchangeCount: num(row['completed_exchange_count']),
    bio: (row['bio'] as string | null) ?? undefined,
    skillTags: json<string[] | undefined>(row['skill_tags'], undefined),
    availabilityNotes: (row['availability_notes'] as string | null) ?? undefined,
    role: row['role'] as Role,
    restriction: row['restriction'] as Restriction,
    deactivated: bool(row['deactivated']),
  };
}

function mapListing(row: RowDataPacket): Listing {
  return {
    id: row['id'] as string,
    ownerId: row['owner_id'] as string,
    side: row['side'] as Listing['side'],
    kind: row['kind'] as Listing['kind'],
    title: row['title'] as string,
    description: row['description'] as string,
    category: row['category'] as Listing['category'],
    zone: row['zone'] as string,
    availability: (row['availability'] as string | null) ?? undefined,
    images: json<string[]>(row['images'], []),
    status: row['status'] as Listing['status'],
    modality: (row['modality'] as Listing['modality']) ?? undefined,
    returnTerm: (row['return_term'] as string | null) ?? undefined,
    counterpartDescription: (row['counterpart_description'] as string | null) ?? undefined,
    createdAt: row['created_at'] as string,
  };
}

/** MySQL-backed identity store. Same API as the in-memory IdentityStore. */
export class MySqlIdentityStore {
  constructor(private pool: Pool) {}

  async create(data: {
    email: string;
    password: string;
    displayName: string;
    campus: string;
    role?: Role;
  }): Promise<StoredUser> {
    const salt = newSalt();
    const user: StoredUser = {
      id: randomUUID(),
      email: data.email.toLowerCase(),
      passwordHash: hashPassword(data.password, salt),
      passwordSalt: salt,
      displayName: data.displayName,
      campus: data.campus,
      campusVerified: false,
      joinDate: new Date().toISOString(),
      completedExchangeCount: 0,
      role: data.role ?? 'member',
      restriction: 'none' as Restriction,
      deactivated: false,
    };
    await this.pool.execute(
      `INSERT INTO users (id, email, password_hash, password_salt, display_name, campus,
        campus_verified, join_date, completed_exchange_count, bio, skill_tags,
        availability_notes, role, restriction, deactivated)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, 0, NULL, NULL, NULL, ?, 'none', 0)`,
      [user.id, user.email, user.passwordHash, user.passwordSalt, user.displayName, user.campus, user.joinDate, user.role],
    );
    return { ...user };
  }

  async findByEmail(email: string): Promise<StoredUser | undefined> {
    const [rows] = await this.pool.execute<RowDataPacket[]>(
      'SELECT * FROM users WHERE email = ? LIMIT 1',
      [email.toLowerCase()],
    );
    return rows[0] ? mapUser(rows[0]) : undefined;
  }

  async findById(id: string): Promise<StoredUser | undefined> {
    const [rows] = await this.pool.execute<RowDataPacket[]>(
      'SELECT * FROM users WHERE id = ? LIMIT 1',
      [id],
    );
    return rows[0] ? mapUser(rows[0]) : undefined;
  }

  async hasModerator(): Promise<boolean> {
    const [rows] = await this.pool.execute<RowDataPacket[]>(
      "SELECT 1 FROM users WHERE role = 'moderator' LIMIT 1",
    );
    return rows.length > 0;
  }

  async stats(): Promise<{
    total: number;
    active: number;
    deactivated: number;
    suspended: number;
    banned: number;
    moderators: number;
  }> {
    const [rows] = await this.pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS total,
        SUM(deactivated) AS deactivated,
        SUM(restriction = 'suspended' AND NOT deactivated) AS suspended,
        SUM(restriction = 'banned' AND NOT deactivated) AS banned,
        SUM(role = 'moderator') AS moderators
       FROM users`,
    );
    const r = rows[0]!;
    const total = num(r['total']);
    const deactivated = num(r['deactivated']);
    const suspended = num(r['suspended']);
    const banned = num(r['banned']);
    return {
      total,
      active: total - deactivated - suspended - banned,
      deactivated,
      suspended,
      banned,
      moderators: num(r['moderators']),
    };
  }

  verifyPassword(user: StoredUser, password: string): boolean {
    return verifyPasswordHash(password, user.passwordSalt, user.passwordHash);
  }

  async save(user: StoredUser): Promise<void> {
    await this.pool.execute(
      `UPDATE users SET email = ?, password_hash = ?, password_salt = ?, display_name = ?,
        campus = ?, bio = ?, skill_tags = ?, availability_notes = ?, role = ?,
        restriction = ?, deactivated = ?, completed_exchange_count = ? WHERE id = ?`,
      [
        user.email, user.passwordHash, user.passwordSalt, user.displayName, user.campus,
        user.bio ?? null, user.skillTags ? JSON.stringify(user.skillTags) : null,
        user.availabilityNotes ?? null, user.role, user.restriction,
        user.deactivated ? 1 : 0, user.completedExchangeCount, user.id,
      ],
    );
  }

  async exportState(): Promise<{ users: StoredUser[]; blocked: string[]; muted: string[] }> {
    const [urows] = await this.pool.execute<RowDataPacket[]>('SELECT * FROM users');
    const [brows] = await this.pool.execute<RowDataPacket[]>('SELECT owner_id, other_id, kind FROM blocks');
    const blocked: string[] = [];
    const muted: string[] = [];
    for (const b of brows) {
      const key = `${b['owner_id'] as string}:${b['other_id'] as string}`;
      if (b['kind'] === 'block') blocked.push(key);
      else muted.push(key);
    }
    return { users: urows.map(mapUser), blocked, muted };
  }

  async importState(state: { users: StoredUser[]; blocked: string[]; muted: string[] }): Promise<void> {
    if (!state || !Array.isArray(state.users)) throw new Error('Invalid identity snapshot.');
    const conn = await this.pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute('DELETE FROM blocks');
      await conn.execute('DELETE FROM sessions');
      await conn.execute('DELETE FROM users');
      for (const u of state.users) {
        await conn.execute(
          `INSERT INTO users (id, email, password_hash, password_salt, display_name, campus,
            campus_verified, join_date, completed_exchange_count, bio, skill_tags,
            availability_notes, role, restriction, deactivated)
           VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [u.id, u.email, u.passwordHash, u.passwordSalt, u.displayName, u.campus, u.joinDate,
            u.completedExchangeCount, u.bio ?? null,
            u.skillTags ? JSON.stringify(u.skillTags) : null, u.availabilityNotes ?? null,
            u.role, u.restriction, u.deactivated ? 1 : 0],
        );
      }
      for (const key of state.blocked ?? []) {
        const [a, b] = key.split(':');
        await conn.execute("INSERT INTO blocks (owner_id, other_id, kind) VALUES (?, ?, 'block')", [a, b]);
      }
      for (const key of state.muted ?? []) {
        const [a, b] = key.split(':');
        await conn.execute("INSERT INTO blocks (owner_id, other_id, kind) VALUES (?, ?, 'mute')", [a, b]);
      }
      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }

  async addBlock(a: string, b: string): Promise<void> {
    await this.pool.execute(
      "INSERT IGNORE INTO blocks (owner_id, other_id, kind) VALUES (?, ?, 'block')",
      [a, b],
    );
  }

  async removeBlock(a: string, b: string): Promise<void> {
    await this.pool.execute(
      "DELETE FROM blocks WHERE owner_id = ? AND other_id = ? AND kind = 'block'",
      [a, b],
    );
  }

  async addMute(a: string, b: string): Promise<void> {
    await this.pool.execute(
      "INSERT IGNORE INTO blocks (owner_id, other_id, kind) VALUES (?, ?, 'mute')",
      [a, b],
    );
  }

  async removeMute(a: string, b: string): Promise<void> {
    await this.pool.execute(
      "DELETE FROM blocks WHERE owner_id = ? AND other_id = ? AND kind = 'mute'",
      [a, b],
    );
  }

  async isBlockedOrMuted(a: string, b: string): Promise<boolean> {
    const [rows] = await this.pool.execute<RowDataPacket[]>(
      'SELECT 1 FROM blocks WHERE (owner_id = ? AND other_id = ?) OR (owner_id = ? AND other_id = ?) LIMIT 1',
      [a, b, b, a],
    );
    return rows.length > 0;
  }

  async saveSession(token: string, userId: string): Promise<void> {
    await this.pool.execute(
      'INSERT INTO sessions (token, user_id, created_at_ms) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE user_id = VALUES(user_id)',
      [token, userId, Date.now()],
    );
  }

  async findSession(token: string): Promise<string | undefined> {
    const [rows] = await this.pool.execute<RowDataPacket[]>(
      'SELECT user_id FROM sessions WHERE token = ? LIMIT 1',
      [token],
    );
    return rows[0] ? (rows[0]['user_id'] as string) : undefined;
  }

  async deleteSession(token: string): Promise<void> {
    await this.pool.execute('DELETE FROM sessions WHERE token = ?', [token]);
  }

  async deleteSessionsByUser(userId: string): Promise<void> {
    await this.pool.execute('DELETE FROM sessions WHERE user_id = ?', [userId]);
  }
}

/** MySQL-backed listings store. Same API as the in-memory ListingsStore. */
export class MySqlListingsStore {
  constructor(private pool: Pool) {}

  async insert(listing: Omit<Listing, 'id' | 'createdAt'>): Promise<Listing> {
    const full: Listing = { ...listing, id: randomUUID(), createdAt: new Date().toISOString() };
    await this.pool.execute(
      `INSERT INTO listings (id, owner_id, side, kind, title, description, category, zone,
        availability, images, status, modality, return_term, counterpart_description,
        created_at_ms, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [full.id, full.ownerId, full.side, full.kind, full.title, full.description, full.category,
        full.zone, full.availability ?? null, JSON.stringify(full.images), full.status,
        full.modality ?? null, full.returnTerm ?? null, full.counterpartDescription ?? null,
        Date.parse(full.createdAt), full.createdAt],
    );
    return { ...full, images: [...full.images] };
  }

  async get(id: string): Promise<Listing | undefined> {
    const [rows] = await this.pool.execute<RowDataPacket[]>(
      'SELECT * FROM listings WHERE id = ? LIMIT 1',
      [id],
    );
    return rows[0] ? mapListing(rows[0]) : undefined;
  }

  async save(listing: Listing): Promise<void> {
    await this.pool.execute(
      `UPDATE listings SET owner_id = ?, side = ?, kind = ?, title = ?, description = ?,
        category = ?, zone = ?, availability = ?, images = ?, status = ?, modality = ?,
        return_term = ?, counterpart_description = ? WHERE id = ?`,
      [listing.ownerId, listing.side, listing.kind, listing.title, listing.description,
        listing.category, listing.zone, listing.availability ?? null, JSON.stringify(listing.images),
        listing.status, listing.modality ?? null, listing.returnTerm ?? null,
        listing.counterpartDescription ?? null, listing.id],
    );
  }

  async all(): Promise<Listing[]> {
    const [rows] = await this.pool.execute<RowDataPacket[]>('SELECT * FROM listings');
    return rows.map(mapListing);
  }

  async countActiveByOwner(ownerId: string): Promise<number> {
    const [rows] = await this.pool.execute<RowDataPacket[]>(
      "SELECT COUNT(*) AS n FROM listings WHERE owner_id = ? AND status = 'Active'",
      [ownerId],
    );
    return num(rows[0]!['n']);
  }

  async countByStatus(): Promise<Record<Listing['status'], number>> {
    const counts: Record<Listing['status'], number> = {
      Draft: 0, Active: 0, Paused: 0, Archived: 0, Hidden: 0,
    };
    const [rows] = await this.pool.execute<RowDataPacket[]>(
      'SELECT status, COUNT(*) AS n FROM listings GROUP BY status',
    );
    for (const r of rows) {
      const status = r['status'] as Listing['status'];
      counts[status] = (counts[status] ?? 0) + num(r['n']);
    }
    return counts;
  }

  async exportState(): Promise<{ items: Listing[]; order: string[] }> {    const [rows] = await this.pool.execute<RowDataPacket[]>(
      'SELECT * FROM listings ORDER BY created_at_ms',
    );
    const items = rows.map(mapListing);
    return { items, order: items.map((l) => l.id) };
  }

  async importState(state: { items: Listing[]; order: string[] }): Promise<void> {
    if (!state || !Array.isArray(state.items) || !Array.isArray(state.order)) {
      throw new Error('Invalid listings snapshot.');
    }
    const conn = await this.pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute('DELETE FROM listings');
      for (const l of state.items) {
        await conn.execute(
          `INSERT INTO listings (id, owner_id, side, kind, title, description, category, zone,
            availability, images, status, modality, return_term, counterpart_description,
            created_at_ms, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [l.id, l.ownerId, l.side, l.kind, l.title, l.description, l.category, l.zone,
            l.availability ?? null, JSON.stringify(l.images), l.status, l.modality ?? null,
            l.returnTerm ?? null, l.counterpartDescription ?? null, Date.parse(l.createdAt), l.createdAt],
        );
      }
      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }

  /** Deactivation cascade is service-level (deactivateOwner); this store only persists. */
}

/** Wipe all U1+U2 tables (FK-safe order). Test/dev only. */
export async function truncateWorld(pool: Pool): Promise<void> {
  await pool.execute('DELETE FROM messages');
  await pool.execute('DELETE FROM holds');
  await pool.execute('DELETE FROM exchanges');
  await pool.execute('DELETE FROM proposals');
  await pool.execute('DELETE FROM blocks');
  await pool.execute('DELETE FROM sessions');
  await pool.execute('DELETE FROM listings');
  await pool.execute('DELETE FROM users');
}

function mapProposal(row: RowDataPacket): Proposal {
  return {
    id: row['id'] as string,
    proposerId: row['proposer_id'] as string,
    counterpartyId: row['counterparty_id'] as string,
    sideAListingIds: json<string[]>(row['side_a'], []),
    sideBListingIds: json<string[]>(row['side_b'], []),
    terms: row['terms'] as string,
    status: row['status'] as Proposal['status'],
    createdAtMs: num(row['created_at_ms']),
    decidedAtMs: row['decided_at_ms'] == null ? undefined : num(row['decided_at_ms']),
    exchangeId: (row['exchange_id'] as string | null) ?? undefined,
  };
}

function mapExchange(row: RowDataPacket): Exchange {
  const at = row['schedule_at'] as string | null;
  const place = row['schedule_place'] as string | null;
  return {
    id: row['id'] as string,
    proposalId: row['proposal_id'] as string,
    participantA: row['participant_a'] as string,
    participantB: row['participant_b'] as string,
    listingIds: json<string[]>(row['listing_ids'], []),
    terms: row['terms'] as string,
    status: row['status'] as Exchange['status'],
    schedule: at && place ? { at, place } : undefined,
    doneMarkedBy: (row['done_marked_by'] as string | null) ?? undefined,
    doneMarkedAtMs: row['done_marked_at_ms'] == null ? undefined : num(row['done_marked_at_ms']),
    cancelReason: (row['cancel_reason'] as Exchange['cancelReason']) ?? undefined,
    cancelDetail: (row['cancel_detail'] as string | null) ?? undefined,
    log: json<string[]>(row['log'], []),
    createdAtMs: num(row['created_at_ms']),
  };
}

/** MySQL-backed exchanges store. Same API as the in-memory ExchangesStore. */
export class MySqlExchangesStore {
  constructor(private pool: Pool) {}

  async insertProposal(p: Omit<Proposal, 'id'>): Promise<Proposal> {
    const full: Proposal = { ...p, id: randomUUID() };
    await this.pool.execute(
      `INSERT INTO proposals (id, proposer_id, counterparty_id, side_a, side_b, terms,
        status, created_at_ms, decided_at_ms, exchange_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [full.id, full.proposerId, full.counterpartyId,
        JSON.stringify(full.sideAListingIds), JSON.stringify(full.sideBListingIds),
        full.terms, full.status, full.createdAtMs, full.decidedAtMs ?? null,
        full.exchangeId ?? null],
    );
    return { ...full, sideAListingIds: [...full.sideAListingIds], sideBListingIds: [...full.sideBListingIds] };
  }

  async getProposal(id: string): Promise<Proposal | undefined> {
    const [rows] = await this.pool.execute<RowDataPacket[]>(
      'SELECT * FROM proposals WHERE id = ? LIMIT 1', [id],
    );
    return rows[0] ? mapProposal(rows[0]) : undefined;
  }

  async saveProposal(p: Proposal): Promise<void> {
    await this.pool.execute(
      `UPDATE proposals SET proposer_id = ?, counterparty_id = ?, side_a = ?, side_b = ?,
        terms = ?, status = ?, created_at_ms = ?, decided_at_ms = ?, exchange_id = ? WHERE id = ?`,
      [p.proposerId, p.counterpartyId, JSON.stringify(p.sideAListingIds),
        JSON.stringify(p.sideBListingIds), p.terms, p.status, p.createdAtMs,
        p.decidedAtMs ?? null, p.exchangeId ?? null, p.id],
    );
  }

  async openProposalsForListing(listingId: string): Promise<Proposal[]> {
    const [rows] = await this.pool.execute<RowDataPacket[]>(
      `SELECT * FROM proposals WHERE status = 'Proposed' AND
        (JSON_CONTAINS(side_a, JSON_QUOTE(?)) OR JSON_CONTAINS(side_b, JSON_QUOTE(?)))`,
      [listingId, listingId],
    );
    return rows.map(mapProposal);
  }

  async proposedOlderThan(nowMs: number, windowMs: number): Promise<Proposal[]> {
    const [rows] = await this.pool.execute<RowDataPacket[]>(
      "SELECT * FROM proposals WHERE status = 'Proposed' AND created_at_ms < ?",
      [nowMs - windowMs],
    );
    return rows.map(mapProposal);
  }

  async doneMarkedOlderThan(nowMs: number, windowMs: number): Promise<Exchange[]> {
    const [rows] = await this.pool.execute<RowDataPacket[]>(
      `SELECT * FROM exchanges WHERE status = 'Scheduled' AND done_marked_by IS NOT NULL
        AND done_marked_at_ms < ?`,
      [nowMs - windowMs],
    );
    return rows.map(mapExchange);
  }

  async insertExchange(e: Omit<Exchange, 'id'>): Promise<Exchange> {
    const full: Exchange = { ...e, id: randomUUID() };
    await this.pool.execute(
      `INSERT INTO exchanges (id, proposal_id, participant_a, participant_b, listing_ids,
        terms, status, schedule_at, schedule_place, done_marked_by, done_marked_at_ms,
        cancel_reason, cancel_detail, log, created_at_ms)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [full.id, full.proposalId, full.participantA, full.participantB,
        JSON.stringify(full.listingIds), full.terms, full.status,
        full.schedule?.at ?? null, full.schedule?.place ?? null,
        full.doneMarkedBy ?? null, full.doneMarkedAtMs ?? null,
        full.cancelReason ?? null, full.cancelDetail ?? null,
        JSON.stringify(full.log), full.createdAtMs],
    );
    return {
      ...full,
      listingIds: [...full.listingIds],
      schedule: full.schedule ? { ...full.schedule } : undefined,
      log: [...full.log],
    };
  }

  async getExchange(id: string): Promise<Exchange | undefined> {
    const [rows] = await this.pool.execute<RowDataPacket[]>(
      'SELECT * FROM exchanges WHERE id = ? LIMIT 1', [id],
    );
    return rows[0] ? mapExchange(rows[0]) : undefined;
  }

  async saveExchange(e: Exchange): Promise<void> {
    await this.pool.execute(
      `UPDATE exchanges SET proposal_id = ?, participant_a = ?, participant_b = ?,
        listing_ids = ?, terms = ?, status = ?, schedule_at = ?, schedule_place = ?,
        done_marked_by = ?, done_marked_at_ms = ?, cancel_reason = ?, cancel_detail = ?,
        log = ?, created_at_ms = ? WHERE id = ?`,
      [e.proposalId, e.participantA, e.participantB, JSON.stringify(e.listingIds),
        e.terms, e.status, e.schedule?.at ?? null, e.schedule?.place ?? null,
        e.doneMarkedBy ?? null, e.doneMarkedAtMs ?? null, e.cancelReason ?? null,
        e.cancelDetail ?? null, JSON.stringify(e.log), e.createdAtMs, e.id],
    );
  }

  async hold(listingId: string, exchangeId: string): Promise<void> {
    await this.pool.execute(
      'INSERT INTO holds (listing_id, exchange_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE exchange_id = VALUES(exchange_id)',
      [listingId, exchangeId],
    );
  }

  async heldBy(listingId: string): Promise<string | undefined> {
    const [rows] = await this.pool.execute<RowDataPacket[]>(
      'SELECT exchange_id FROM holds WHERE listing_id = ? LIMIT 1', [listingId],
    );
    return rows[0] ? (rows[0]['exchange_id'] as string) : undefined;
  }

  async release(listingId: string): Promise<void> {
    await this.pool.execute('DELETE FROM holds WHERE listing_id = ?', [listingId]);
  }

  async insertMessage(m: Omit<Message, 'id'>): Promise<Message> {
    const full: Message = { ...m, id: randomUUID() };
    await this.pool.execute(
      'INSERT INTO messages (id, exchange_id, sender_id, text, created_at_ms) VALUES (?, ?, ?, ?, ?)',
      [full.id, full.exchangeId, full.senderId, full.text, full.createdAtMs],
    );
    return { ...full };
  }

  async messagesFor(exchangeId: string): Promise<Message[]> {
    const [rows] = await this.pool.execute<RowDataPacket[]>(
      'SELECT * FROM messages WHERE exchange_id = ? ORDER BY created_at_ms',
      [exchangeId],
    );
    return rows.map((r) => ({
      id: r['id'] as string,
      exchangeId: r['exchange_id'] as string,
      senderId: r['sender_id'] as string,
      text: r['text'] as string,
      createdAtMs: num(r['created_at_ms']),
    }));
  }

  async exportState(): Promise<ExchangesExport> {
    const [prows] = await this.pool.execute<RowDataPacket[]>('SELECT * FROM proposals');
    const [erows] = await this.pool.execute<RowDataPacket[]>('SELECT * FROM exchanges');
    const [mrows] = await this.pool.execute<RowDataPacket[]>(
      'SELECT * FROM messages ORDER BY created_at_ms',
    );
    const [hrows] = await this.pool.execute<RowDataPacket[]>('SELECT listing_id, exchange_id FROM holds');
    const messages: Record<string, Message[]> = {};
    for (const r of mrows) {
      const m: Message = {
        id: r['id'] as string,
        exchangeId: r['exchange_id'] as string,
        senderId: r['sender_id'] as string,
        text: r['text'] as string,
        createdAtMs: num(r['created_at_ms']),
      };
      (messages[m.exchangeId] ??= []).push(m);
    }
    return {
      proposals: prows.map(mapProposal),
      exchanges: erows.map(mapExchange),
      messages,
      holds: hrows.map((r) => [r['listing_id'], r['exchange_id']] as [string, string]),
    };
  }

  async importState(state: ExchangesExport): Promise<void> {
    if (!state || !Array.isArray(state.proposals) || !Array.isArray(state.exchanges)) {
      throw new Error('Invalid exchanges snapshot.');
    }
    const conn = await this.pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute('DELETE FROM messages');
      await conn.execute('DELETE FROM holds');
      await conn.execute('DELETE FROM exchanges');
      await conn.execute('DELETE FROM proposals');
      for (const p of state.proposals) {
        await conn.execute(
          `INSERT INTO proposals (id, proposer_id, counterparty_id, side_a, side_b, terms,
            status, created_at_ms, decided_at_ms, exchange_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [p.id, p.proposerId, p.counterpartyId, JSON.stringify(p.sideAListingIds),
            JSON.stringify(p.sideBListingIds), p.terms, p.status, p.createdAtMs,
            p.decidedAtMs ?? null, p.exchangeId ?? null],
        );
      }
      for (const e of state.exchanges) {
        await conn.execute(
          `INSERT INTO exchanges (id, proposal_id, participant_a, participant_b, listing_ids,
            terms, status, schedule_at, schedule_place, done_marked_by, done_marked_at_ms,
            cancel_reason, cancel_detail, log, created_at_ms)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [e.id, e.proposalId, e.participantA, e.participantB, JSON.stringify(e.listingIds),
            e.terms, e.status, e.schedule?.at ?? null, e.schedule?.place ?? null,
            e.doneMarkedBy ?? null, e.doneMarkedAtMs ?? null, e.cancelReason ?? null,
            e.cancelDetail ?? null, JSON.stringify(e.log), e.createdAtMs],
        );
      }
      for (const list of Object.values(state.messages ?? {})) {
        for (const m of list) {
          await conn.execute(
            'INSERT INTO messages (id, exchange_id, sender_id, text, created_at_ms) VALUES (?, ?, ?, ?, ?)',
            [m.id, m.exchangeId, m.senderId, m.text, m.createdAtMs],
          );
        }
      }
      for (const [listingId, exchangeId] of state.holds ?? []) {
        await conn.execute('INSERT INTO holds (listing_id, exchange_id) VALUES (?, ?)', [listingId, exchangeId]);
      }
      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }

  async exchangeStats(): Promise<Record<ExchangeStatus, number>> {
    const counts: Record<ExchangeStatus, number> = {
      Scheduled: 0, Completed: 0, Cancelled: 0, Disputed: 0,
    };
    const [rows] = await this.pool.execute<RowDataPacket[]>(
      'SELECT status, COUNT(*) AS n FROM exchanges GROUP BY status',
    );
    for (const r of rows) counts[r['status'] as ExchangeStatus] = num(r['n']);
    return counts;
  }

  async proposalStats(): Promise<Record<ProposalStatus, number>> {
    const counts: Record<ProposalStatus, number> = {
      Proposed: 0, Accepted: 0, Declined: 0, Expired: 0, Withdrawn: 0,
    };
    const [rows] = await this.pool.execute<RowDataPacket[]>(
      'SELECT status, COUNT(*) AS n FROM proposals GROUP BY status',
    );
    for (const r of rows) counts[r['status'] as ProposalStatus] = num(r['n']);
    return counts;
  }
}
