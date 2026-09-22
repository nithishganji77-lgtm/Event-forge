import { Link } from 'react-router-dom';
import { EVENT_STATUS_CONFIG } from '../../events/components/EventStatusBadge.jsx';
import { useActiveOrganization } from '../../../hooks/useActiveOrganization.js';
import { ROUTES } from '../../../utils/constants.js';
import { cn } from '../../../lib/cn.js';

// Status communicated via icon + tone, never color alone — same EVENT_STATUS_CONFIG the full
// EventStatusBadge uses, just rendered compactly for a grid cell. Capacity-full gets its own text
// marker rather than folding into the status color.
export function CalendarEventChip({ event }) {
  const { organizationSlug } = useActiveOrganization();
  const config = EVENT_STATUS_CONFIG[event.displayStatus] || EVENT_STATUS_CONFIG.DRAFT;
  const Icon = config.icon;
  const isFull = event.registeredCount >= event.capacity;

  return (
    <Link
      to={ROUTES.orgEventDetail(organizationSlug, event._id)}
      className={cn(
        'flex items-center gap-1 px-1.5 py-1 text-xs border truncate transition-colors',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--color-accent)',
        config.tone === 'accent'
          ? 'border-(--color-accent) text-(--color-accent) hover:bg-(--color-accent)/10'
          : 'border-(--color-border) text-(--color-text)/70 hover:bg-(--color-bg-secondary)'
      )}
      title={event.title}
    >
      <Icon className="size-3 shrink-0" aria-hidden="true" />
      <span className="truncate">{event.title}</span>
      {isFull && <span className="text-meta shrink-0">FULL</span>}
    </Link>
  );
}
