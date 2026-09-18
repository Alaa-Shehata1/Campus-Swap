export function FormField({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">{label}</label>
      {hint && <p id={hintId} className="mt-1 text-sm text-text-muted">{hint}</p>}
      <div className="mt-1">{children}</div>
      {error && <p id={errorId} role="alert" className="mt-1 text-sm font-medium text-status-danger-ink">{error}</p>}
    </div>
  );
}
