import { useAuth } from '../../../hooks/useAuth.js';
import { useNow } from '../../../hooks/useNow.js';
import { formatGreeting } from '../../../utils/greeting.js';

// The top of every role's dashboard: a time-aware greeting, one line of context, and the page's
// primary actions on the right (they wrap under the text on a narrow screen).
export function DashboardHeader({ subtitle, actions }) {
  const { user } = useAuth();
  // useNow ticks each minute, so the greeting flips at noon without a reload.
  const now = useNow();

  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold leading-tight sm:text-3xl">
          {formatGreeting(user?.name, now)} <span aria-hidden="true">👋</span>
        </h1>
        <p className="mt-1 text-(--color-text)/60">{subtitle}</p>
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </div>
  );
}
