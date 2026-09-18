export function InlineAlert({
  tone = 'info',
  title,
  children,
}: {
  tone?: 'info' | 'warning' | 'danger';
  title: string;
  children?: React.ReactNode;
}) {
  const styles = {
    info: 'bg-status-info-bg text-status-info-ink',
    warning: 'bg-status-warning-bg text-status-warning-ink',
    danger: 'bg-status-danger-bg text-status-danger-ink',
  } as const;
  return (
    <div role="alert" className={`rounded-md p-3 text-sm ${styles[tone]}`}>
      <p className="font-semibold">{title}</p>
      {children && <div className="mt-1">{children}</div>}
    </div>
  );
}
