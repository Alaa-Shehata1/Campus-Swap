import Link from 'next/link';
import { PageHeader } from '../components/ui/PageHeader';
import { BrowseFilters } from '../components/BrowseFilters';
import { ListingGrid } from '../components/ListingGrid';
import { searchListings } from '../../src/listings/search.js';
import { services } from '../lib/services.js';
import { sessionUser } from '../lib/auth.js';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const q = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const { listings } = services();
  const res = await searchListings(
    listings.store,
    {
      text: one(q['text']),
      side: one(q['side']) as 'offer' | 'request' | undefined,
      kind: one(q['kind']) as 'skill' | 'item' | undefined,
      category: one(q['category']),
      zone: one(q['zone']),
      availability: one(q['availability']),
    },
    { anonymous: true },
  );
  const user = await sessionUser();
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Campus marketplace"
        title="Find a useful exchange"
        description="Browse skills and items offered or requested by students. No money involved."
        actions={!user ? (
          <Link
            href="/login?returnTo=/publish"
            className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-brand-contrast"
          >
            Log in to publish
          </Link>
        ) : undefined}
      />
      <div className="grid min-w-0 gap-6 lg:grid-cols-12">
        <BrowseFilters />
        <section className="min-w-0 lg:col-span-9 xl:col-span-10" aria-label="Search results">
      {res.total === 0 ? (
        <p className="rounded-md bg-surface-elevated p-6 text-text-muted">
          No listings match. Try widening the search — or be the first to publish the complementary
          listing.
        </p>
      ) : (
        <>
          <p aria-live="polite" className="text-sm text-text-muted">
            {res.total} active listing{res.total === 1 ? '' : 's'}
          </p>
          <ListingGrid listings={res.items} />
        </>
      )}
        </section>
      </div>
    </div>
  );
}
