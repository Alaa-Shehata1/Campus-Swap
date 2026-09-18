import type { FieldError } from '../../src/common/errors.js';
import { InlineAlert } from './ui/InlineAlert';

export function FieldErrors({ errors, field }: { errors: FieldError[]; field?: string }) {
  const list = field ? errors.filter((e) => e.field === field) : errors.filter((e) => !e.field);
  if (list.length === 0) return null;
  if (!field) {
    return <InlineAlert tone="danger" title="Please fix the highlighted issues.">{list.map((e) => e.message).join(' ')}</InlineAlert>;
  }
  return (
    <ul aria-live="polite" className="mt-1 space-y-1">
      {list.map((e, i) => (
        <li key={i} role="alert" className="text-sm font-medium text-status-danger-ink">
          {e.message}
        </li>
      ))}
    </ul>
  );
}
