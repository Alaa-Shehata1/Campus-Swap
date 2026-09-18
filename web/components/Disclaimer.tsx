import Link from 'next/link';
import { disclaimerFor, type DisclaimerFlow } from '../../src/policy/disclaimers.js';
import { Panel } from './ui/Panel';

/** Short disclaimer + full-terms link (NFR-L-1). */
export function Disclaimer({ flow }: { flow: DisclaimerFlow }) {
  return (
    <Panel tone="sunken" className="text-sm">
      {disclaimerFor(flow)}{' '}
      <Link href="/terms" className="font-medium underline">
        Full Terms
      </Link>
    </Panel>
  );
}
