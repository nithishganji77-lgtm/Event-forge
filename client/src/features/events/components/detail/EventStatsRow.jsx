import { MapPin, Timer, Users } from 'lucide-react';
import { StatTile } from '../../../../components/ui/StatTile.jsx';
import { ProgressBar } from '../../../../components/ui/ProgressBar.jsx';
import { formatDuration, formatPercent } from '../../utils/eventDetails.js';
import { formatEventDates } from '../../utils/eventTime.js';

// Three numbers worth having above the fold. Registration gets a bar as well as the figure, since
// "1 / 200" alone doesn't say how full the room is.
export function EventStatsRow({ event }) {
  const { registeredCount, capacity, waitlistedCount } = event;
  const venue = event.venue ?? {};

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <StatTile
        compact
        className="col-span-2 sm:col-span-1"
        icon={Users}
        label="Registered"
        value={`${registeredCount} / ${capacity}`}
        hint={`${formatPercent(registeredCount, capacity)} of capacity${waitlistedCount > 0 ? ` · ${waitlistedCount} waitlisted` : ''}`}
      >
        <ProgressBar
          value={registeredCount}
          max={capacity}
          label="Registration"
          valueText={`${registeredCount} of ${capacity} registered`}
          className="mt-3"
        />
      </StatTile>
      <StatTile compact icon={Timer} label="Duration" value={formatDuration(event)} hint={formatEventDates(event, { year: true })} />
      <StatTile
        compact
        icon={MapPin}
        label="Venue"
        value={venue.name || 'Not set'}
        valueClassName="truncate text-xl leading-tight"
        hint={venue.address || venue.room || undefined}
      />
    </div>
  );
}
