import { fail, ok, type Result } from '../common/errors.js';
import { ExchangesStore } from './store.js';
import type {
  IdentityPort,
  ListingsPort,
  LockStatus,
  Proposal,
  ProposeInput,
} from './types.js';

export const MAX_OPEN_PROPOSALS = 5;
export const PROPOSAL_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
export const COMPLETION_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
export const MAX_MESSAGE_LENGTH = 2000;

export interface ExchangesDeps {
  listings: ListingsPort;
  identity: IdentityPort;
}

export function createExchangesService(
  deps: ExchangesDeps,
  opts: { now?: () => number; store?: ExchangesStore } = {},
) {
  const store = opts.store ?? new ExchangesStore();
  const now = opts.now ?? Date.now;

  function isParticipant(p: Proposal, userId: string): boolean {
    return p.proposerId === userId || p.counterpartyId === userId;
  }

  /** Max open (Proposed) proposals per listing — the ProposalCap (D7 rev.1). */
  function openCount(listingId: string): number {
    return store.openProposalsForListing(listingId).length;
  }

  function lockStatus(listingId: string): LockStatus {
    const count = openCount(listingId);
    return { openCount: count, locked: count >= MAX_OPEN_PROPOSALS };
  }

  function propose(proposerId: string, input: ProposeInput): Result<Proposal> {
    const sideA = [...new Set(input.sideAListingIds)];
    const sideB = [...new Set(input.sideBListingIds)];

    // Reciprocity: every exchange defines give-and-take on both sides (BR-2, FR-E-1).
    if (sideA.length === 0 || sideB.length === 0) {
      return fail([
        {
          code: 'one-sided',
          message: 'A proposal must reference at least one listing from each side.',
        },
      ]);
    }
    if (!input.terms?.trim()) {
      return fail([{ code: 'required', field: 'terms', message: 'Free-text terms are required.' }]);
    }
    if (!deps.identity.getProfile(proposerId)) {
      return fail([{ code: 'not-found', message: 'Proposer not found.' }]);
    }

    const listingsA = [];
    for (const id of sideA) {
      const l = deps.listings.get(id);
      if (!l) return fail([{ code: 'not-found', message: `Listing not found: ${id}.` }]);
      if (l.status !== 'Active') {
        return fail([
          { code: 'listing-not-active', message: `Listing is not Active: ${l.title}.` },
        ]);
      }
      if (l.ownerId !== proposerId) {
        return fail([
          { code: 'ownership', message: 'Your side must only reference your own listings.' },
        ]);
      }
      listingsA.push(l);
    }
    void listingsA;

    let counterparty: string | undefined;
    for (const id of sideB) {
      const l = deps.listings.get(id);
      if (!l) return fail([{ code: 'not-found', message: `Listing not found: ${id}.` }]);
      if (l.status !== 'Active') {
        return fail([
          { code: 'listing-not-active', message: `Listing is not Active: ${l.title}.` },
        ]);
      }
      if (l.ownerId === proposerId) {
        return fail([
          { code: 'ownership', message: 'The other side must belong to someone else.' },
        ]);
      }
      if (counterparty === undefined) counterparty = l.ownerId;
      else if (counterparty !== l.ownerId) {
        return fail([
          {
            code: 'ownership',
            message: 'The other side must reference listings of a single counterparty.',
          },
        ]);
      }
    }
    const counterpartyId = counterparty!;

    if (deps.identity.isBlockedOrMuted(proposerId, counterpartyId)) {
      return fail([
        { code: 'blocked', message: 'You cannot propose to this user (block/mute in effect).' },
      ]);
    }

    for (const id of [...sideA, ...sideB]) {
      if (openCount(id) >= MAX_OPEN_PROPOSALS) {
        return fail([
          {
            code: 'proposal-cap-reached',
            message:
              'This listing already has 5 open proposals and is not accepting new ones ' +
              '(proposal-cap-reached). Try another listing or check back later.',
          },
        ]);
      }
    }

    return ok(
      store.insertProposal({
        proposerId,
        counterpartyId,
        sideAListingIds: sideA,
        sideBListingIds: sideB,
        terms: input.terms.trim(),
        status: 'Proposed',
        createdAtMs: now(),
      }),
    );
  }

  function getProposal(id: string): Proposal | undefined {
    return store.getProposal(id);
  }

  /** Counterparty declines. Accept arrives in the accept task (auto-pause + holds). */
  function respond(userId: string, id: string, decision: 'decline'): Result<Proposal> {
    const p = store.getProposal(id);
    if (!p) return fail([{ code: 'not-found', message: 'Proposal not found.' }]);
    if (p.status !== 'Proposed') {
      return fail([
        { code: 'invalid-transition', message: `Proposal is already ${p.status}.` },
      ]);
    }
    if (userId !== p.counterpartyId) {
      return fail([
        { code: 'not-permitted', message: 'Only the counterparty can respond to this proposal.' },
      ]);
    }
    p.status = 'Declined';
    p.decidedAtMs = now();
    store.saveProposal(p);
    return ok(p);
  }

  /** Withdrawal allowed any time before acceptance, by either side (FR-E-2). */
  function withdraw(userId: string, id: string): Result<Proposal> {
    const p = store.getProposal(id);
    if (!p) return fail([{ code: 'not-found', message: 'Proposal not found.' }]);
    if (p.status !== 'Proposed') {
      return fail([
        { code: 'invalid-transition', message: `Proposal is already ${p.status}.` },
      ]);
    }
    if (!isParticipant(p, userId)) {
      return fail([
        { code: 'not-permitted', message: 'Only a participant can withdraw this proposal.' },
      ]);
    }
    p.status = 'Withdrawn';
    p.decidedAtMs = now();
    store.saveProposal(p);
    return ok(p);
  }

  /** 7-day expiry job (FR-E-2). Returns expired proposals for the notification sink. */
  function runExpiry(nowMs: number): Proposal[] {
    const expired = store.proposedOlderThan(nowMs, PROPOSAL_WINDOW_MS);
    for (const p of expired) {
      p.status = 'Expired';
      p.decidedAtMs = nowMs;
      store.saveProposal(p);
    }
    return expired;
  }

  return { propose, getProposal, respond, withdraw, runExpiry, lockStatus, openCount, store };
}

export type ExchangesService = ReturnType<typeof createExchangesService>;
