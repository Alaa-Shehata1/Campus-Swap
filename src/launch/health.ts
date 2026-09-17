export interface HealthDeps {
  identity: { store: { stats(): unknown } };
  listings: { store: { countByStatus(): unknown } };
  exchanges: { store: { exchangeStats(): unknown } };
  reputation: { store: { counts(): unknown } };
  moderation: { store: { allReports(): unknown } };
  notifications: { inbox(userId: string): unknown };
}

export interface HealthReport {
  status: 'ok' | 'degraded';
  checks: Record<string, 'ok' | 'fail'>;
  atMs: number;
}

/** Liveness probe over every module seam (NFR-A-1 health check). */
export function healthCheck(deps: HealthDeps, nowMs = Date.now()): HealthReport {
  const checks: Record<string, 'ok' | 'fail'> = {};
  const probes: Record<string, () => unknown> = {
    identity: () => deps.identity.store.stats(),
    listings: () => deps.listings.store.countByStatus(),
    exchanges: () => deps.exchanges.store.exchangeStats(),
    reputation: () => deps.reputation.store.counts(),
    moderation: () => deps.moderation.store.allReports(),
    notifications: () => deps.notifications.inbox('__health__'),
  };
  for (const [name, probe] of Object.entries(probes)) {
    try {
      probe();
      checks[name] = 'ok';
    } catch {
      checks[name] = 'fail';
    }
  }
  const status = Object.values(checks).every((c) => c === 'ok') ? 'ok' : 'degraded';
  return { status, checks, atMs: nowMs };
}
