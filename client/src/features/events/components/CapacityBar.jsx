import { cn } from '../../../lib/cn.js';

// Registered vs capacity, as a bar plus text ("1 / 200") so the number never depends on the bar.
export function CapacityBar({ registered, capacity, waitlisted = 0, className }) {
  const percent = capacity > 0 ? Math.min(100, Math.round((registered / capacity) * 100)) : 0;
  const full = capacity > 0 && registered >= capacity;

  return (
    <div className={className}>
      <div className="mb-1.5 flex items-baseline justify-between gap-2 text-xs text-(--color-text)/60">
        <span>
          {full ? 'Full' : 'Registered'}
          {waitlisted > 0 && ` · ${waitlisted} waitlisted`}
        </span>
        <span className="font-medium tabular-nums text-(--color-text)/80">
          {registered} / {capacity}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Registrations"
        aria-valuemin={0}
        aria-valuemax={capacity}
        aria-valuenow={Math.min(registered, capacity)}
        aria-valuetext={`${registered} of ${capacity} registered`}
        className="h-1.5 w-full overflow-hidden rounded-full bg-(--color-border)"
      >
        <div
          className={cn('h-full rounded-full bg-(--color-accent) transition-[width] duration-300')}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
