import Link from 'next/link';
import { formatCairoTime } from '../../src/common/cairoTime.js';
import type { Listing } from '../../src/listings/types.js';
import { Badge } from './ui/Badge';
import { Panel } from './ui/Panel';

export function ListingCard({ listing }: { listing: Listing }) {
  return (
    <article aria-label={`${listing.side}: ${listing.title}`} className="min-w-0">
      <Panel tone="bordered" className="h-full">
      <div className="flex gap-2 text-xs font-semibold uppercase tracking-wide">
        <Badge tone={listing.side === 'offer' ? 'offer' : 'request'}>{listing.side}</Badge>
        <Badge>{listing.kind}</Badge>
        <Badge>{listing.category}</Badge>
      </div>
      <h3 className="mt-2 text-lg font-bold">
        <Link href={`/listings/${listing.id}`} className="underline decoration-emerald-700 underline-offset-2">
          {listing.title}
        </Link>
      </h3>
      <p className="mt-1 line-clamp-2 text-sm text-text-muted">{listing.description}</p>
      <p className="mt-2 text-sm text-text-muted">
        {listing.zone} · {listing.availability ? `${listing.availability} · ` : ''}<time>{formatCairoTime(listing.createdAt)}</time>
      </p>
      </Panel>
    </article>
  );
}
