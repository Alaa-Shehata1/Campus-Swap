'use client';

import Link from 'next/link';
import { useState } from 'react';

export function MobileNav({
  user,
}: {
  user?: { displayName: string };
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="lg:hidden">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-lg font-bold text-brand-ink">
          CampusSwap
        </Link>
        <button
          type="button"
          aria-expanded={open}
          aria-controls="mobile-navigation"
          onClick={() => setOpen((value) => !value)}
          className="rounded-md border border-border px-3 py-2 text-sm font-medium"
        >
          {open ? 'Close menu' : 'Open menu'}
        </button>
      </div>
      {open && (
        <nav id="mobile-navigation" aria-label="Mobile primary" className="mt-3 grid gap-2 border-t border-border pt-3">
          {user ? (
            <>
              <Link href="/proposals" onClick={() => setOpen(false)} className="py-2 underline">
                Proposals
              </Link>
              <Link href="/publish" onClick={() => setOpen(false)} className="rounded-md bg-brand px-3 py-2 font-medium text-brand-contrast">
                Publish
              </Link>
              <Link href="/me" onClick={() => setOpen(false)} className="py-2 underline">
                {user.displayName}
              </Link>
              <Link href="/logout" onClick={() => setOpen(false)} className="py-2 underline">
                Log out
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" onClick={() => setOpen(false)} className="py-2 underline">
                Log in
              </Link>
              <Link href="/signup" onClick={() => setOpen(false)} className="rounded-md bg-brand px-3 py-2 font-medium text-brand-contrast">
                Sign up
              </Link>
            </>
          )}
        </nav>
      )}
    </div>
  );
}
