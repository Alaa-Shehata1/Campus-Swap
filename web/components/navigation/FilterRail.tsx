'use client';

import { useState } from 'react';

export function FilterRail({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <aside aria-label="Listing filters" className={open ? 'hidden lg:block lg:col-span-3' : 'hidden'}>
      <div className="sticky top-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Filter listings</h2>
          <button
            type="button"
            aria-expanded={open}
            aria-controls="desktop-filter-content"
            onClick={() => setOpen(false)}
            className="rounded-md px-2 py-1 text-xs font-medium underline"
          >
            Collapse
          </button>
        </div>
        <div id="desktop-filter-content">{children}</div>
      </div>
    </aside>
  );
}
