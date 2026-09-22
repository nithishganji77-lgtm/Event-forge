// Icon is decorative (empty alt) — every usage renders it directly beside the "EVENTFORGE" text,
// so the accessible name already comes from that text; a non-empty alt would double-announce it.
export function Logo({ className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <img src="/logo-mark.png" alt="" className="size-4 shrink-0" />
      <span className="text-meta">EVENTFORGE</span>
    </span>
  );
}
