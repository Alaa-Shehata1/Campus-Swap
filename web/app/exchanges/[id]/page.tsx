import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { formatCairoTime } from '../../../../src/common/cairoTime.js';
import { services, sweepExchanges } from '../../../lib/services';
import { sessionUserId } from '../../../lib/auth';
import { ScheduleForm, DoneForm, ConfirmDispute, CancelForm } from '../../../components/ExchangeForms';
import { ThreadForm } from '../../../components/ThreadForm';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Panel } from '../../../components/ui/Panel';
import { Badge } from '../../../components/ui/Badge';

export default async function ExchangeDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewerId = await sessionUserId();
  if (!viewerId) redirect(`/login?returnTo=/exchanges/${encodeURIComponent(id)}`);
  const svc = services();
  await sweepExchanges(svc);
  const e = await svc.exchanges.getExchange(viewerId, id);
  if (!e) notFound();
  const otherId = e.participantA === viewerId ? e.participantB : e.participantA;
  const other = await svc.identity.getProfile(otherId);
  const listings = await Promise.all(e.listingIds.map((lid) => svc.listings.get(lid)));
  const thread = await svc.exchanges.getMessages(viewerId, id);
  const messages = thread.ok ? thread.value : [];
  const awaitingMe =
    e.status === 'Scheduled' && e.doneMarkedBy !== undefined && e.doneMarkedBy !== viewerId;
  const editable = e.status === 'Scheduled' && e.doneMarkedBy === undefined;
  return (
    <div className="space-y-6">
      <Link href="/proposals" className="text-sm underline">
        ← Back to proposals
      </Link>
      <Panel tone="bordered">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide">
          <Badge>{e.status}</Badge>
          <span className="font-normal normal-case tracking-normal text-text-muted">
            with {other?.displayName ?? 'A member'}
          </span>
        </div>
        <PageHeader title="Exchange" description={`With ${other?.displayName ?? 'a member'}`} />
        <p className="mt-2 text-sm">
          <span className="font-medium">Agreed terms (frozen at accept):</span>{' '}
          <span className="whitespace-pre-wrap">{e.terms}</span>
        </p>
        <ul className="mt-2 space-y-1">
          {listings.map((l) =>
            l ? (
              <li key={l.id} className="text-sm">
                <Link href={`/listings/${l.id}`} className="underline">
                  {l.title}
                </Link>{' '}
                <span className="text-text-muted">
                  ({l.side} · {l.kind} · {l.status})
                </span>
              </li>
            ) : null,
          )}
        </ul>
        {e.schedule ? (
          <p className="mt-3 rounded-md border border-border bg-surface-sunken p-3 text-sm">
            <span className="font-medium">Meet:</span> <time>{e.schedule.at}</time> · {e.schedule.place}
          </p>
        ) : (
          <p className="mt-3 rounded-md border border-border bg-surface-sunken p-3 text-sm text-text-muted">
            No schedule set yet.
          </p>
        )}
        {e.status === 'Cancelled' && (
          <p className="mt-3 text-sm">
            <span className="font-medium">Cancelled:</span> {e.cancelReason}
            {e.cancelDetail ? ` — ${e.cancelDetail}` : ''}
          </p>
        )}
        {e.status === 'Scheduled' && e.doneMarkedBy !== undefined && !awaitingMe && (
          <p className="mt-3 rounded-md border border-border bg-status-info-bg p-3 text-sm">
            You marked Done — waiting for the other side to confirm or dispute (7-day window).
          </p>
        )}
        {awaitingMe && (
          <p className="mt-3 rounded-md border border-border bg-status-warning-bg p-3 text-sm">
            The other side marked Done — confirm completion or dispute (7-day window).
          </p>
        )}
        <details className="mt-3 text-sm text-text-muted">
          <summary className="cursor-pointer underline">Activity log</summary>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {e.log.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </details>
      </Panel>

      {editable && (
        <section aria-label="Schedule" className="rounded-md border border-border bg-surface-elevated p-6">
          <h2 className="mb-3 text-lg font-bold">{e.schedule ? 'Change schedule' : 'Set schedule'}</h2>
          <ScheduleForm exchangeId={e.id} />
        </section>
      )}

      {editable && (
        <section aria-label="Completion" className="rounded-md border border-border bg-surface-elevated p-6">
          <h2 className="mb-3 text-lg font-bold">Mark Done</h2>
          <DoneForm exchangeId={e.id} scheduled={e.schedule !== undefined} />
        </section>
      )}

      {awaitingMe && (
        <section aria-label="Confirm or dispute" className="rounded-md border border-border bg-surface-elevated p-6">
          <h2 className="mb-3 text-lg font-bold">Confirm or dispute</h2>
          <ConfirmDispute exchangeId={e.id} />
        </section>
      )}

      {editable && (
        <section aria-label="Cancel" className="rounded-md border border-border bg-surface-elevated p-6">
          <h2 className="mb-3 text-lg font-bold">Cancel exchange</h2>
          <CancelForm exchangeId={e.id} />
        </section>
      )}

      <section aria-label="Messages" className="rounded-md border border-border bg-surface-elevated p-6">
        <h2 className="mb-3 text-lg font-bold">Messages (participants only)</h2>
        {messages.length === 0 ? (
          <p className="text-sm text-text-muted">No messages yet.</p>
        ) : (
          <ul className="space-y-2">
            {messages.map((m) => (
              <li
                key={m.id}
                className={` rounded-md p-3 text-sm ${
                  m.senderId === viewerId ? 'ml-auto bg-offer-bg' : 'bg-surface-sunken'
                }`}
              >
                <p className="whitespace-pre-wrap">{m.text}</p>
                <p className="mt-1 text-xs text-text-muted">
                  {m.senderId === viewerId ? 'You' : (other?.displayName ?? 'Them')} ·{' '}
                  <time>{formatCairoTime(new Date(m.createdAtMs).toISOString())}</time>
                </p>
              </li>
            ))}
          </ul>
        )}
        {e.status === 'Scheduled' && <ThreadForm exchangeId={e.id} />}
      </section>
    </div>
  );
}
