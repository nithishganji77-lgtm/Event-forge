import { cn } from '../../lib/cn.js';

// A thin determinate bar with real progressbar semantics. `label` is its accessible name and
// `valueText` what a screen reader says instead of a bare number.
export function ProgressBar({ value, max, label, valueText, className }) {
  const percent = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.min(value, max)}
      aria-valuetext={valueText}
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-(--color-border)', className)}
    >
      <div
        className="h-full rounded-full bg-(--color-accent) transition-[width] duration-300"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
