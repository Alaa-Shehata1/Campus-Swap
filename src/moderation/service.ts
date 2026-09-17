import { fail, ok, type Result } from '../common/errors.js';
import { ModerationStore } from './store.js';
import type {
  AuditEntry,
  ReasonCode,
  Report,
  ReportStatus,
  Sanction,
  SanctionAction,
} from './types.js';
import type { Listing } from '../listings/types.js';
import type { Restriction, UserPublic } from '../identity/types.js';
import type { Review } from '../reputation/types.js';

export const MAX_REPORT_IMAGES = 3;
export const MIN_OTHER_DESCRIPTION = 20;

const REASON_CODES: ReasonCode[] = [
  'haram-content',
  'medical-legal',
  'money-request',
  'stolen-goods',
  'spam-commercial',
  'harassment',
  'unsafe-behavior',
  'policy-academic',
  'other',
];

const SANCTION_ACTIONS: SanctionAction[] = ['hide', 'unhide', 'warn', 'suspend', 'ban'];

export interface ModerationDeps {
  listings: {
    get(id: string): Listing | undefined;
    systemHide(id: string): Result<Listing>;
    systemUnhide(id: string): Result<Listing>;
  };
  identity: {
    getProfile(id: string): UserPublic | undefined;
    restrict(userId: string, restriction: Restriction): void;
  };
  reputation: {
    voidReview(by: string, id: string, reason: string): Result<Review>;
  };
}

export function createModerationService(
  deps: ModerationDeps,
  opts: { now?: () => number; store?: ModerationStore } = {},
) {
  const store = opts.store ?? new ModerationStore();
  const now = opts.now ?? Date.now;

  function report(
    reporterId: string,
    input: {
      targetType: 'listing' | 'user';
      targetId: string;
      reasonCode: ReasonCode;
      description: string;
      images: string[];
    },
  ): Result<Report> {
    if (!deps.identity.getProfile(reporterId)) {
      return fail([{ code: 'not-found', message: 'Reporter not found.' }]);
    }
    const targetExists =
      input.targetType === 'listing'
        ? deps.listings.get(input.targetId) !== undefined
        : deps.identity.getProfile(input.targetId) !== undefined;
    if (!targetExists) {
      return fail([{ code: 'not-found', message: 'Report target not found.' }]);
    }
    if (!REASON_CODES.includes(input.reasonCode)) {
      return fail([
        { code: 'invalid', field: 'reasonCode', message: 'Unknown report reason code.' },
      ]);
    }
    const description = input.description?.trim() ?? '';
    if (!description) {
      return fail([{ code: 'required', field: 'description', message: 'A description is required.' }]);
    }
    if (input.reasonCode === 'other' && description.length < MIN_OTHER_DESCRIPTION) {
      return fail([
        {
          code: 'too-short',
          field: 'description',
          message: `Describe "other" reports in at least ${MIN_OTHER_DESCRIPTION} characters.`,
        },
      ]);
    }
    if (!Array.isArray(input.images) || input.images.length > MAX_REPORT_IMAGES) {
      return fail([
        {
          code: 'too-many',
          field: 'images',
          message: `Reports allow at most ${MAX_REPORT_IMAGES} images.`,
        },
      ]);
    }
    const atMs = now();
    return ok(
      store.insertReport({
        reporterId,
        targetType: input.targetType,
        targetId: input.targetId,
        reasonCode: input.reasonCode,
        description,
        images: [...input.images],
        status: 'Received',
        createdAtMs: atMs,
        history: [{ status: 'Received', atMs }],
        escalated: false,
      }),
    );
  }

  function getReport(id: string): Report | undefined {
    return store.getReport(id);
  }

  /** Triage: Received → Under review → Resolved (FR-M-3). Opens/closes the case. */
  function triage(
    id: string,
    moderatorId: string,
    decision: 'acknowledge' | 'resolve',
  ): Result<Report> {
    const r = store.getReport(id);
    if (!r) return fail([{ code: 'not-found', message: 'Report not found.' }]);
    const next: ReportStatus | undefined =
      decision === 'acknowledge'
        ? r.status === 'Received'
          ? 'Under review'
          : undefined
        : r.status === 'Under review'
          ? 'Resolved'
          : undefined;
    if (!next) {
      return fail([
        { code: 'invalid-transition', message: `Cannot ${decision} a ${r.status} report.` },
      ]);
    }
    r.status = next;
    r.history.push({ status: next, atMs: now(), by: moderatorId });
    if (next === 'Under review') store.openCase(id);
    else store.closeCase(id);
    store.saveReport(r);
    return ok(r);
  }

  /** Sanctions (FR-M-4). Every action audit-logged with actor + reason + timestamp (S-5). */
  function sanction(
    actor: string,
    input: { action: SanctionAction; targetType: 'listing' | 'user'; targetId: string; reason: string },
  ): Result<Sanction> {
    if (!SANCTION_ACTIONS.includes(input.action) || input.action === 'unhide') {
      return fail([{ code: 'invalid', field: 'action', message: 'Unknown sanction action.' }]);
    }
    if (!input.reason?.trim()) {
      return fail([{ code: 'required', field: 'reason', message: 'A sanction reason is required.' }]);
    }
    if (input.action === 'hide') {
      if (input.targetType !== 'listing') {
        return fail([{ code: 'invalid', field: 'targetType', message: 'Hide applies to listings.' }]);
      }
      const hidden = deps.listings.systemHide(input.targetId);
      if (!hidden.ok) return hidden as Result<Sanction>;
    } else {
      if (input.targetType !== 'user' || !deps.identity.getProfile(input.targetId)) {
        return fail([{ code: 'not-found', message: 'Sanction target user not found.' }]);
      }
      if (input.action === 'suspend') deps.identity.restrict(input.targetId, 'suspended');
      if (input.action === 'ban') deps.identity.restrict(input.targetId, 'banned');
    }
    return ok(
      store.addSanction({
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        reason: input.reason.trim(),
        actor,
        atMs: now(),
      }),
    );
  }

  /** Reverse a hide (appeal upheld). Parks the listing as Paused; audit-logged. */
  function unhide(actor: string, listingId: string, reason: string): Result<Sanction> {
    if (!reason?.trim()) {
      return fail([{ code: 'required', field: 'reason', message: 'An unhide reason is required.' }]);
    }
    const restored = deps.listings.systemUnhide(listingId);
    if (!restored.ok) return restored as Result<Sanction>;
    return ok(
      store.addSanction({
        action: 'unhide',
        targetType: 'listing',
        targetId: listingId,
        reason: reason.trim(),
        actor,
        atMs: now(),
      }),
    );
  }

  /** Void an abusive review (FR-M-4). Delegates to reputation; void is logged. */
  function voidReview(actor: string, reviewId: string, reason: string): Result<Review> {
    const voided = deps.reputation.voidReview(actor, reviewId, reason);
    if (!voided.ok) return voided;
    store.addVoid({ reviewId, by: actor, reason: reason.trim(), atMs: now() });
    return voided;
  }

  function auditLog(): AuditEntry[] {
    const entries: AuditEntry[] = [
      ...store.getSanctions().map((s) => ({ kind: 'sanction' as const, ...s })),
      ...store.getVoids().map((v) => ({ kind: 'void' as const, ...v })),
      ...store.getHandovers().map((h) => ({ kind: 'handover' as const, ...h })),
    ];
    return entries.sort((a, b) => a.atMs - b.atMs);
  }

  return { report, getReport, triage, sanction, unhide, voidReview, auditLog, store };
}

export type ModerationService = ReturnType<typeof createModerationService>;
