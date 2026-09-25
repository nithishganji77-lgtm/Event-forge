import { useState } from 'react';
import { Check, Clock, X } from 'lucide-react';
import { useEventRegistrations } from '../hooks/useEventRegistrations.js';
import { useMarkAttendance } from '../hooks/useMarkAttendance.js';
import { Avatar } from '../../../components/ui/Avatar.jsx';
import { Badge } from '../../../components/ui/Badge.jsx';
import { Select } from '../../../components/ui/Select.jsx';
import { SearchInput } from '../../../components/ui/SearchInput.jsx';
import { Pagination } from '../../../components/ui/Pagination.jsx';
import { EmptyState } from '../../../components/ui/EmptyState.jsx';
import { ProgressBar } from '../../../components/ui/ProgressBar.jsx';
import { Spinner } from '../../../components/ui/Spinner.jsx';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue.js';
import { formatPercent } from '../utils/eventDetails.js';

const ATTENDANCE_LABELS = { PENDING: 'Pending', ATTENDED: 'Attended', NO_SHOW: 'No-show' };

// Status is always an icon plus a word, never colour alone. Confirmed is the calm default, so only
// a cancelled registration gets the accent.
const STATUS = {
  REGISTERED: { label: 'Confirmed', icon: Check, tone: 'neutral' },
  WAITLISTED: { label: 'Waitlisted', icon: Clock, tone: 'neutral' },
  CANCELLED: { label: 'Cancelled', icon: X, tone: 'accent' },
};

const shortDate = (value) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

// The attendee workspace: how full the event is, then a searchable, filterable table. There is
// deliberately no Export or "Add attendee": nothing behind either exists yet.
export function AttendeesList({ event, canManage = false }) {
  const eventId = event._id;
  const [searchInput, setSearchInput] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const search = useDebouncedValue(searchInput);

  const { data, isLoading, isPlaceholderData } = useEventRegistrations(eventId, {
    page,
    limit: 20,
    status: status || undefined,
    search: search || undefined,
  });
  const markAttendance = useMarkAttendance(eventId);

  const { registeredCount, capacity, waitlistedCount } = event;
  const filtering = Boolean(search || status);

  return (
    <div className="space-y-5">
      <div className="rounded-(--ef-radius) border border-(--color-border) bg-(--color-surface) p-5">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-meta text-(--color-text)/50">
            <span className="text-base font-semibold tracking-normal text-(--color-text)">
              {registeredCount} / {capacity}
            </span>{' '}
            registered
          </p>
          <p className="text-sm text-(--color-text)/50">
            {formatPercent(registeredCount, capacity)} of capacity
            {waitlistedCount > 0 && ` · ${waitlistedCount} waitlisted`}
          </p>
        </div>
        <ProgressBar
          value={registeredCount}
          max={capacity}
          label="Registration"
          valueText={`${registeredCount} of ${capacity} registered`}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <SearchInput
          value={searchInput}
          onChange={(value) => { setSearchInput(value); setPage(1); }}
          placeholder="Search attendees…"
          className="w-full sm:w-auto sm:min-w-64"
        />
        <Select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          aria-label="Filter by status"
          className="w-full sm:w-auto sm:max-w-[11rem]"
        >
          <option value="">All statuses</option>
          <option value="REGISTERED">Confirmed</option>
          <option value="WAITLISTED">Waitlisted</option>
          <option value="CANCELLED">Cancelled</option>
        </Select>
      </div>

      {isLoading && <Spinner />}

      {data && data.data.length === 0 && (
        <EmptyState
          title={filtering ? 'No attendees match' : 'No attendees yet'}
          description={filtering ? 'Try a different name, email or status.' : 'People who register for this event will appear here.'}
        />
      )}

      {data && data.data.length > 0 && (
        <div
          aria-busy={isPlaceholderData}
          className={`overflow-x-auto rounded-(--ef-radius) border border-(--color-border) bg-(--color-surface) transition-opacity ${isPlaceholderData ? 'opacity-60' : ''}`}
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="text-meta border-b border-(--color-border) text-(--color-text)/50">
                <th className="px-4 py-3 text-left font-medium">Person</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="hidden px-4 py-3 text-left font-medium md:table-cell">Registered</th>
                <th className="px-4 py-3 text-left font-medium">Attendance</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((r) => {
                const state = STATUS[r.status] ?? { label: r.status, icon: Clock, tone: 'neutral' };
                const StateIcon = state.icon;
                return (
                  <tr key={r._id} className="border-b border-(--color-border) last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar size="sm" name={r.user?.name} src={r.user?.avatar} />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{r.user?.name}</p>
                          <p className="truncate text-xs text-(--color-text)/50">{r.user?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={state.tone}>
                        <StateIcon className="size-3" aria-hidden="true" />
                        {state.label}
                      </Badge>
                    </td>
                    <td className="hidden px-4 py-3 text-(--color-text)/70 md:table-cell">{shortDate(r.registeredAt)}</td>
                    <td className="px-4 py-3">
                      {r.status !== 'REGISTERED' ? (
                        <span className="text-(--color-text)/30">—</span>
                      ) : canManage ? (
                        <Select
                          value={r.attendanceStatus}
                          aria-label={`Attendance for ${r.user?.name}`}
                          onChange={(e) => markAttendance.mutate({ registrationId: r._id, attendanceStatus: e.target.value })}
                          className="max-w-[9rem] py-1.5"
                        >
                          {Object.entries(ATTENDANCE_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </Select>
                      ) : (
                        ATTENDANCE_LABELS[r.attendanceStatus]
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {data && (
        <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onPageChange={setPage} />
      )}
    </div>
  );
}
