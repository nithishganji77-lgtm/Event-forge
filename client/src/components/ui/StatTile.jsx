import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { cn } from '../../lib/cn.js';

const TREND_ICONS = { up: ArrowUpRight, down: ArrowDownRight, flat: Minus };

// `icon` and `trend` are optional and the analytics pages don't pass them, so those tiles are
// unchanged. `trend` is { direction: 'up' | 'down' | 'flat', text } — always an arrow icon plus
// words, never colour alone. `compact` trims the padding for dense KPI rows.
export function StatTile({ label, value, hint, icon: Icon, trend, compact = false }) {
  const TrendIcon = trend ? TREND_ICONS[trend.direction] ?? Minus : null;

  return (
    <div
      className={cn(
        'border border-(--color-border) bg-(--color-surface) rounded-(--ef-radius)',
        compact ? 'p-4' : 'p-5'
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-meta text-(--color-text)/50">{label}</p>
        {Icon && <Icon className="size-4 shrink-0 text-(--color-text)/40" aria-hidden="true" />}
      </div>
      <p className="text-3xl font-semibold leading-none">{value}</p>
      {trend && (
        <p className="mt-2 flex items-center gap-1 text-sm text-(--color-text)/60">
          <TrendIcon className="size-3.5 shrink-0" aria-hidden="true" />
          {trend.text}
        </p>
      )}
      {hint && <p className="text-sm text-(--color-text)/50 mt-2">{hint}</p>}
    </div>
  );
}

// Shared formatter so every tile treats "not enough data yet" the same way instead of a
// misleading 0% — used for attendance/cancellation rates which are `null` until there's a
// meaningful denominator.
export function formatRate(rate) {
  return rate === null || rate === undefined ? '—' : `${Math.round(rate * 100)}%`;
}
