import type { Listing } from '../../src/listings/types.js';
import { ListingCard } from './ListingCard';

export function ListingGrid({
  listings,
  ariaLabel = 'Listings',
}: {
  listings: Listing[];
  ariaLabel?: string;
}) {
  return (
    <div aria-label={ariaLabel} className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {listings.map((listing) => <ListingCard key={listing.id} listing={listing} />)}
    </div>
  );
}
