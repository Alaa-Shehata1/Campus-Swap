import Link from 'next/link';
import type { Listing } from '../../src/listings/types.js';
import { Panel } from './ui/Panel';

export function ListingActionPanel({ listing, loginCTA }: { listing: Listing; loginCTA: boolean }) {
  return (
    <Panel tone="bordered">
      <h2 className="text-lg font-semibold">Next step</h2>
      {loginCTA ? (
        <Link
          href={`/login?returnTo=/listings/${encodeURIComponent(listing.id)}`}
          className="mt-3 inline-block rounded-md bg-brand px-4 py-2 font-medium text-brand-contrast"
        >
          Log in to propose
        </Link>
      ) : (
        <p className="mt-2 text-sm text-text-muted">Proposals open in U2 — browse and publish for now.</p>
      )}
    </Panel>
  );
}
