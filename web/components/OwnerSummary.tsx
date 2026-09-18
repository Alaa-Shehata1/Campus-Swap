import { Panel } from './ui/Panel';

export function OwnerSummary({
  displayName,
  campus,
  rating,
  completedExchangeCount,
}: {
  displayName: string;
  campus: string;
  rating?: { average: number; count: number };
  completedExchangeCount?: number;
}) {
  return (
    <Panel tone="bordered">
      <h2 className="text-lg font-semibold">Offered by {displayName}</h2>
      <p className="mt-1 text-sm text-text-muted">
        {campus} <span className="italic">(self-declared, not verified)</span>
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-text-muted">Rating</dt>
          <dd className="font-medium">{rating ? `${rating.average.toFixed(1)} / 5 (${rating.count})` : 'No ratings yet'}</dd>
        </div>
        <div>
          <dt className="text-text-muted">Completed exchanges</dt>
          <dd className="font-medium">{completedExchangeCount ?? 'Not available'}</dd>
        </div>
      </dl>
    </Panel>
  );
}
