import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDetail } from '../../../../src/listings/search.js';
import { formatCairoTime } from '../../../../src/common/cairoTime.js';
import { services } from '../../../lib/services.js';
import { sessionUserId } from '../../../lib/auth.js';
import { ListingCard } from '../../../components/ListingCard';
import { PageHeader } from '../../../components/ui/PageHeader';
import { OwnerSummary } from '../../../components/OwnerSummary';
import { ListingActionPanel } from '../../../components/ListingActionPanel';
import { ReportEntryPoint } from '../../../components/ReportEntryPoint';
import { Badge } from '../../../components/ui/Badge';
import { Panel } from '../../../components/ui/Panel';

export default async function ListingDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { listings } = services();
  const viewerId = await sessionUserId();
  const detail = await getDetail(
    listings.store,
    id,
    viewerId ? { userId: viewerId } : { anonymous: true },
  );
  if (!detail) notFound();
  const l = detail.listing;
  const owner = await services().identity.getProfile(l.ownerId);
  return (
    <div className="space-y-6">
      <Link href="/" className="text-sm underline">
        ← Back to listings
      </Link>
      <div className="grid gap-6 lg:grid-cols-12">
      <Panel tone="bordered" className="min-w-0 lg:col-span-8">
        <div className="flex gap-2 text-xs font-semibold uppercase tracking-wide">
          <Badge tone={l.side === 'offer' ? 'offer' : 'request'}>{l.side}</Badge>
          <Badge>{l.kind}</Badge>
          <Badge>{l.category}</Badge>
          <Badge tone={l.status === 'Active' ? 'active' : 'paused'}>Status: {l.status}</Badge>
        </div>
        <PageHeader title={l.title} description={l.description} />
        <dl className="mt-4 space-y-1 text-sm">
          <div className="flex gap-2">
            <dt className="font-medium">Meetup area:</dt>
            <dd>{l.zone}</dd>
          </div>
          {l.availability && (
            <div className="flex gap-2">
              <dt className="font-medium">Availability:</dt>
              <dd>{l.availability}</dd>
            </div>
          )}
          {l.modality && (
            <div className="flex gap-2">
              <dt className="font-medium">Terms:</dt>
              <dd>
                {l.modality}
                {l.modality === 'lend' && l.returnTerm ? ` — ${l.returnTerm}` : ''}
                {l.modality === 'swap' && l.counterpartDescription
                  ? ` — looking for: ${l.counterpartDescription}`
                  : ''}
              </dd>
            </div>
          )}
          <div className="flex gap-2">
            <dt className="font-medium">Published:</dt>
            <dd>
              <time>{formatCairoTime(l.createdAt)}</time>
            </dd>
          </div>
        </dl>
      </Panel>
      <aside className="space-y-4 lg:col-span-4">
        <OwnerSummary displayName={owner?.displayName ?? 'A member'} campus={owner?.campus ?? 'KFS University'} />
        <ListingActionPanel listing={l} loginCTA={detail.loginCTA} />
        <ReportEntryPoint targetId={l.id} authenticated={!detail.loginCTA} />
      </aside>
      </div>
      {detail.compatible.length > 0 && (
        <section aria-label="Compatible listings">
          <h2 className="mb-3 text-lg font-bold">Compatible listings</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {detail.compatible.map((c) => (
              <ListingCard key={c.id} listing={c} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
