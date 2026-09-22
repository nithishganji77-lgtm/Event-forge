export function StatTile({ label, value, hint }) {
  return (
    <div className="border border-(--color-border) p-5">
      <p className="text-meta text-(--color-text)/50 mb-2">{label}</p>
      <p className="text-3xl font-semibold leading-none">{value}</p>
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
