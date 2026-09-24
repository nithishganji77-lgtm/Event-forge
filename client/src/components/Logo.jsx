// Decorative icon (empty alt) when it sits beside the "EVENTFORGE" wordmark — the accessible name
// already comes from that text, and a non-empty alt would double-announce it. `iconOnly` (the
// collapsed sidebar) drops the wordmark, so the image itself has to carry the name.
export function Logo({ className = '', iconOnly = false }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <img
        src="/logo-mark.png"
        alt={iconOnly ? 'EventForge' : ''}
        className={iconOnly ? 'size-5 shrink-0' : 'size-4 shrink-0'}
        style={{ filter: 'var(--logo-filter)' }}
      />
      {!iconOnly && <span className="text-meta">EVENTFORGE</span>}
    </span>
  );
}
