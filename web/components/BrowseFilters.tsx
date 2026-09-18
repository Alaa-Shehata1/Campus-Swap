'use client';

import { useState } from 'react';
import { FilterDrawer } from './navigation/FilterDrawer';
import { FilterRail } from './navigation/FilterRail';
import { SearchForm } from './SearchForm';

export function BrowseFilters() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [railOpen, setRailOpen] = useState(true);
  return (
    <>
      <div className="mb-4 flex justify-end lg:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm font-medium"
        >
          Open filters
        </button>
      </div>
      <FilterRail open={railOpen} onToggle={() => setRailOpen((open) => !open)}>
        <SearchForm />
      </FilterRail>
      <FilterDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <SearchForm />
      </FilterDrawer>
    </>
  );
}
