'use client';

import { useEffect } from 'react';
import { InlineAlert } from '../components/ui/InlineAlert';

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {}, []);
  return (
    <InlineAlert tone="danger" title="This page could not load.">
      <button type="button" onClick={() => reset()} className="mt-2 rounded-md border border-border px-3 py-2 font-medium">
        Try again
      </button>
    </InlineAlert>
  );
}
