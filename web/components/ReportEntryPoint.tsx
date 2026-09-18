import Link from 'next/link';
import { Panel } from './ui/Panel';

export function ReportEntryPoint({
  targetId,
  authenticated,
}: {
  targetId: string;
  authenticated: boolean;
}) {
  return (
    <Panel tone="sunken">
      <h2 className="font-semibold">Something unsafe or against the rules?</h2>
      <p className="mt-1 text-sm text-text-muted">Report a listing so the moderation team can review it.</p>
      <Link
        href={authenticated ? `/reports/new?listing=${encodeURIComponent(targetId)}` : `/login?returnTo=/listings/${encodeURIComponent(targetId)}`}
        className="mt-3 inline-block text-sm font-medium underline"
      >
        {authenticated ? 'Report this listing' : 'Log in to report'}
      </Link>
    </Panel>
  );
}
