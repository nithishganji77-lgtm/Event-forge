import { cn } from '../../../lib/cn.js';

// A label, a control, and under it the field's problem (or a hint) with an optional 0/500 counter.
// The counter is decorative: the limit is also enforced by the server and named in its message.
export function AiField({ id, label, hint, error, count, max, children, className }) {
  const near = count != null && max != null && count > max * 0.9;
  return (
    <div className={className}>
      <label htmlFor={id} className="text-meta mb-2 block">
        {label}
      </label>
      {children}
      <div className="mt-1.5 flex items-start justify-between gap-3">
        {error ? (
          <p id={`${id}-error`} role="alert" className="text-sm text-(--color-accent)">
            {error}
          </p>
        ) : (
          <p id={`${id}-hint`} className="text-xs text-(--color-text)/50">
            {hint}
          </p>
        )}
        {count != null && (
          <span aria-hidden="true" className={cn('shrink-0 text-xs tabular-nums', near ? 'text-(--color-accent)' : 'text-(--color-text)/40')}>
            {count}/{max}
          </span>
        )}
      </div>
    </div>
  );
}
