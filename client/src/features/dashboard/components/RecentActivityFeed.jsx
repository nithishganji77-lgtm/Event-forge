import { useRecentActivity } from '../hooks/useRecentActivity.js';
import { EmptyState } from '../../../components/ui/EmptyState.jsx';
import { Spinner } from '../../../components/ui/Spinner.jsx';
import { ACTION_LABELS } from '../../../utils/auditActionLabels.js';
import { relativeTime } from '../../../utils/relativeTime.js';

export function RecentActivityFeed({ organizationId }) {
  const { data, isLoading } = useRecentActivity(organizationId, 10);

  if (isLoading) return <Spinner />;
  if (!data || data.length === 0) {
    return <EmptyState title="No activity yet" description="Actions across your organization will show up here." />;
  }

  return (
    <ul className="border border-(--color-border) divide-y divide-(--color-border)">
      {data.map((log) => (
        <li key={log._id} className="flex items-center justify-between px-4 py-3 text-sm">
          <span>
            <span className="font-medium">{log.actor?.name || 'Someone'}</span>{' '}
            <span className="text-(--color-text)/70">{ACTION_LABELS[log.action] || log.action.toLowerCase()}</span>
          </span>
          <span className="text-meta text-(--color-text)/40">{relativeTime(log.createdAt)}</span>
        </li>
      ))}
    </ul>
  );
}
