import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { disclaimerAudit, cairoLabelAudit } from '../src/launch/audits.js';
import { healthCheck } from '../src/launch/health.js';
import { evaluateLaunchGate } from '../src/launch/gate.js';
import { createIdentityService } from '../src/identity/service.js';
import { createListingsService } from '../src/listings/service.js';
import { createExchangesService } from '../src/exchanges/service.js';
import { createReputationService } from '../src/reputation/service.js';
import { createModerationService } from '../src/moderation/service.js';
import { createNotificationsService } from '../src/notifications/service.js';
import { computePilotMetrics } from '../src/metrics/service.js';

describe('launch audits', () => {
  it('disclaimers present on all 5 flows with terms link and plain language', () => {
    const findings = disclaimerAudit();
    assert.equal(findings.length, 5);
    for (const f of findings) {
      assert.equal(f.ok, true, `${f.flow}: ${f.issues.join('; ')}`);
    }
  });

  it('Cairo labels hold in winter and summer', () => {
    const audit = cairoLabelAudit();
    assert.equal(audit.ok, true, audit.issues.join('; '));
  });

  it('health check passes on live stores, degrades on failure', () => {
    const identity = createIdentityService();
    const listings = createListingsService();
    const exchanges = createExchangesService({ listings, identity });
    const reputation = createReputationService({ exchanges });
    const moderation = createModerationService({ listings, identity, reputation });
    const notifications = createNotificationsService();
    const healthy = healthCheck({ identity, listings, exchanges, reputation, moderation, notifications });
    assert.equal(healthy.status, 'ok');
    const broken = healthCheck({
      identity: { store: { stats: () => { throw new Error('db down'); } } },
      listings, exchanges, reputation, moderation, notifications,
    });
    assert.equal(broken.status, 'degraded');
    assert.equal(broken.checks['identity'], 'fail');
  });
});

describe('launch gate', () => {
  function world() {
    const identity = createIdentityService();
    const listings = createListingsService();
    const exchanges = createExchangesService({ listings, identity });
    const reputation = createReputationService({ exchanges });
    const moderation = createModerationService({ listings, identity, reputation });
    return { identity, listings, exchanges, reputation, moderation };
  }

  const attestations = {
    termsSignedOff: true,
    consultRecorded: true,
    backupDemonstrated: true,
    securityDrill: true,
    keyboardPass: true,
    disclaimerManualPass: true,
  };

  it('fails with everything unattested and names each gap', () => {
    const w = world();
    const metrics = computePilotMetrics(w);
    const gate = evaluateLaunchGate({
      metrics,
      moderatorCount: 0,
      attestations: {
        termsSignedOff: false,
        consultRecorded: false,
        backupDemonstrated: false,
        securityDrill: false,
        keyboardPass: false,
        disclaimerManualPass: false,
      },
    });
    assert.equal(gate.pass, false);
    assert.ok(gate.failures.some((f) => /terms/i.test(f)));
    assert.ok(gate.failures.some((f) => /moderator/i.test(f)));
    assert.ok(gate.failures.some((f) => /keyboard/i.test(f)));
  });

  it('passes when automated checks hold and humans attest', () => {
    const w = world();
    const metrics = computePilotMetrics(w);
    const gate = evaluateLaunchGate({ metrics, moderatorCount: 2, attestations });
    assert.equal(gate.pass, true, gate.failures.join('; '));
  });

  it('requires 2 moderators even when everything else passes', () => {
    const w = world();
    const metrics = computePilotMetrics(w);
    const gate = evaluateLaunchGate({ metrics, moderatorCount: 1, attestations });
    assert.equal(gate.pass, false);
  });
});
