import { useState } from 'react';
import { useEventRegistrations } from '../hooks/useEventRegistrations.js';
import { useMarkAttendance } from '../hooks/useMarkAttendance.js';
import { Badge } from '../../../components/ui/Badge.jsx';
import { Select } from '../../../components/ui/Select.jsx';
import { Pagination } from '../../../components/ui/Pagination.jsx';
import { EmptyState } from '../../../components/ui/EmptyState.jsx';
import { Spinner } from '../../../components/ui/Spinner.jsx';

const ATTENDANCE_LABELS = { PENDING: 'Pending', ATTENDED: 'Attended', NO_SHOW: 'No-show' };

export function AttendeesList({ eventId, canManage = false }) {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useEventRegistrations(eventId, { page, limit: 20, status: status || undefined });
  const markAttendance = useMarkAttendance(eventId);

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-4">
      <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="max-w-[10rem]">
        <option value="">All</option>
        <option value="REGISTERED">Registered</option>
        <option value="WAITLISTED">Waitlisted</option>
        <option value="CANCELLED">Cancelled</option>
      </Select>

      {data && data.data.length === 0 && <EmptyState title="No attendees yet" />}

      {data && data.data.length > 0 && (
        <div className="border border-(--color-border) overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-meta text-(--color-text)/50 border-b border-(--color-border)">
                <th className="text-left px-4 py-3 font-medium">Name</th>
                <th className="hidden md:table-cell text-left px-4 py-3 font-medium">Email</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="hidden lg:table-cell text-left px-4 py-3 font-medium">Registered</th>
                <th className="text-left px-4 py-3 font-medium">Attendance</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((r) => (
                <tr key={r._id} className="border-b border-(--color-border) last:border-0">
                  <td className="px-4 py-3">{r.user?.name}</td>
                  <td className="hidden md:table-cell px-4 py-3 text-(--color-text)/70">{r.user?.email}</td>
                  <td className="px-4 py-3">
                    <Badge tone={r.status === 'CANCELLED' ? 'accent' : 'neutral'}>{r.status}</Badge>
                  </td>
                  <td className="hidden lg:table-cell px-4 py-3 text-(--color-text)/70">
                    {new Date(r.registeredAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {r.status !== 'REGISTERED' ? (
                      <span className="text-(--color-text)/30">—</span>
                    ) : canManage ? (
                      <Select
                        value={r.attendanceStatus}
                        onChange={(e) =>
                          markAttendance.mutate({ registrationId: r._id, attendanceStatus: e.target.value })
                        }
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
              ))}
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
