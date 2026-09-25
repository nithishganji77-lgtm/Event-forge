import { ProgressBar } from '../../../components/ui/ProgressBar.jsx';

// Registered vs capacity, as a bar plus text ("1 / 200") so the number never depends on the bar.
export function CapacityBar({ registered, capacity, waitlisted = 0, className }) {
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
      <ProgressBar
        value={registered}
        max={capacity}
        label="Registrations"
        valueText={`${registered} of ${capacity} registered`}
      />
    </div>
  );
}
