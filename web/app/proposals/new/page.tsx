import Link from 'next/link';
import { redirect } from 'next/navigation';
import { services, sweepExchanges } from '../../../lib/services';
import { sessionUserId } from '../../../lib/auth';
import { ProposeForm } from '../../../components/ProposeForm';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Panel } from '../../../components/ui/Panel';

export default async function NewProposal({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const q = await searchParams;
  const targetId = Array.isArray(q['listing']) ? q['listing'][0] : q['listing'];
  if (!targetId) redirect('/');
  const viewerId = await sessionUserId();
  if (!viewerId) redirect(`/login?returnTo=/proposals/new?listing=${encodeURIComponent(targetId)}`);
  const svc = services();
  await sweepExchanges(svc);
  const target = await svc.listings.get(targetId);
  if (!target || target.status !== 'Active') {
    return (
      <div className="space-y-4">
        <PageHeader title="Propose an exchange" />
        <p className="rounded-md border border-border bg-surface-elevated p-6 text-text-muted">
          This listing is no longer available for proposals.{' '}
          <Link href="/" className="underline">
            Back to listings
          </Link>
        </p>
      </div>
    );
  }
  if (target.ownerId === viewerId) {
    return (
      <div className="space-y-4">
        <PageHeader title="Propose an exchange" />
        <p className="rounded-md border border-border bg-surface-elevated p-6 text-text-muted">
          You cannot propose on your own listing.{' '}
          <Link href={`/listings/${target.id}`} className="underline">
            Back to listing
          </Link>
        </p>
      </div>
    );
  }
  const lock = await svc.exchanges.lockStatus(target.id);
  const all = await svc.listings.store.all();
  const own = all.filter((l) => l.ownerId === viewerId && l.status === 'Active' && l.id !== target.id);
  return (
    <div className="space-y-4">
      <Link href={`/listings/${target.id}`} className="text-sm underline">
        ← Back to listing
      </Link>
      <PageHeader title="Propose an exchange" description="Choose one or more of your active listings and state the terms." />
      <p className="rounded-md border border-border bg-surface-elevated p-4 text-sm">
        Their listing: <span className="font-medium">{target.title}</span> ({target.side} · {target.kind})
      </p>
      {lock.locked && (
        <p role="alert" className="rounded-md border border-border bg-status-warning-bg p-3 text-sm text-text-primary">
          Not accepting new proposals — {lock.openCount} pending. You can still try; the proposal will
          be rejected with reason <code>proposal-cap-reached</code>.
        </p>
      )}
      {own.length === 0 ? (
        <p className="rounded-md border border-border bg-surface-elevated p-6 text-text-muted">
          You need at least one Active listing of your own to propose (every proposal is give-and-take
          on both sides).{' '}
          <Link href="/publish" className="underline">
            Publish one first
          </Link>
        </p>
      ) : (
        <ProposeForm target={target} own={own} />
      )}
    </div>
  );
}
