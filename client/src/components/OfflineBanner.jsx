import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus.js';

// Without this, losing the connection looked like a blank page: nothing loaded and nothing said why.
export function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <div
      role="status"
      className="mb-6 flex items-start gap-3 rounded-(--ef-radius) border border-(--color-border) bg-(--color-bg-secondary) px-4 py-3 text-sm"
    >
      <WifiOff className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p>
        <span className="font-medium">You&apos;re offline.</span> Check your internet connection. Pages that
        couldn&apos;t load will offer to try again, and nothing you change will be saved until you&apos;re back.
      </p>
    </div>
  );
}
