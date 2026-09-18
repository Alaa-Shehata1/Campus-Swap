import Link from 'next/link';
import { redirect } from 'next/navigation';
import { formatCairoTime } from '../../../src/common/cairoTime.js';
import { services, sweepExchanges } from '../../lib/services';
import { sessionUserId } from '../../lib/auth';
import { PageHeader } from '../../components/ui/PageHeader';
import { Panel } from '../../components/ui/Panel';
import { Badge } from '../../components/ui/Badge';

export default async function ProposalsInbox() {
  const viewerId = await sessionUserId();
  if (!viewerId) redirect('/login?returnTo=/proposals');
  const svc = services();
  await sweepExchanges(svc);
  const { proposals } = await svc.exchanges.store.exportState();
  const mine = proposals
    .filter((p) => p.proposerId === viewerId || p.counterpartyId === viewerId)
    .sort((a, b) => b.createdAtMs - a.createdAtMs);
  const names = new Map<string, string>();
  for (const p of mine) {
    const other = p.proposerId === viewerId ? p.counterpartyId : p.proposerId;
    if (!names.has(other)) {
      names.set(other, (await svc.identity.getProfile(other))?.displayName ?? 'A member');
    }
  }
  return (
    <div className="space-y-6">
      <PageHeader title="Proposals" description="Track invitations and accepted exchanges." />
      {mine.length === 0 ? (
        <p className="rounded-md border border-border bg-surface-elevated p-6 text-text-muted">
          No proposals yet. Browse{' '}
          <Link href="/" className="underline">
            listings
          </Link>{' '}
          and propose an exchange.
        </p>
      ) : (
        <ul className="space-y-3">
          {mine.map((p) => (
            <li key={p.id} className="rounded-md border border-border bg-surface-elevated p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide">
                <Badge>{p.status}</Badge>
                <span className="font-normal normal-case tracking-normal text-text-muted">
                  {p.proposerId === viewerId ? 'to' : 'from'} {names.get(p.proposerId === viewerId ? p.counterpartyId : p.proposerId)}
                </span>
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-text-primary">{p.terms}</p>
              <div className="mt-2 flex items-center justify-between text-sm">
                <time className="text-text-muted">{formatCairoTime(new Date(p.createdAtMs).toISOString())}</time>
                <Link href={`/proposals/${p.id}`} className="font-medium text-brand-ink underline">
                  {p.status === 'Accepted' && p.exchangeId ? 'View exchange →' : 'View proposal →'}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
