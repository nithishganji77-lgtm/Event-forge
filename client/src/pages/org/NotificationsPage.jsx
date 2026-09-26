import { useState } from 'react';
import { QueryError } from '../../components/ui/QueryError.jsx';
import { useMyNotifications } from '../../features/notifications/hooks/useMyNotifications.js';
import { useMarkNotificationRead } from '../../features/notifications/hooks/useMarkNotificationRead.js';
import { useMarkAllNotificationsRead } from '../../features/notifications/hooks/useMarkAllNotificationsRead.js';
import { NotificationItem } from '../../features/notifications/components/NotificationItem.jsx';
import { Pagination } from '../../components/ui/Pagination.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { Button } from '../../components/ui/Button.jsx';

// Deliberately not filtered to the currently-viewed org (unlike /me/events) — hiding unread items
// from a different org while viewing this one would be actively confusing. Each row renders its
// own organization label instead (see NotificationItem).
export function NotificationsPage() {
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);

  const filters = { page, limit: 20, unreadOnly };
  const { data, isLoading, isError, error, refetch, isFetching } = useMyNotifications(filters);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <Button variant="outline" size="sm" onClick={() => markAllRead.mutate()}>
          Mark all read
        </Button>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <button
          type="button"
          onClick={() => { setUnreadOnly(false); setPage(1); }}
          className={`text-meta px-3 py-1.5 border ${!unreadOnly ? 'border-(--color-text) text-(--color-text)' : 'border-(--color-border) text-(--color-text)/50'}`}
        >
          ALL
        </button>
        <button
          type="button"
          onClick={() => { setUnreadOnly(true); setPage(1); }}
          className={`text-meta px-3 py-1.5 border ${unreadOnly ? 'border-(--color-text) text-(--color-text)' : 'border-(--color-border) text-(--color-text)/50'}`}
        >
          UNREAD
        </button>
      </div>

      {isError && <QueryError error={error} title="We couldn't load your notifications" onRetry={refetch} isRetrying={isFetching} />}
      {isLoading && <Spinner />}

      {data && data.data.length === 0 && (
        <EmptyState
          title={unreadOnly ? 'No unread notifications' : 'No notifications yet'}
          description="Updates on your events will show up here."
        />
      )}

      {data && data.data.length > 0 && (
        <ul className="border border-(--color-border) divide-y divide-(--color-border)">
          {data.data.map((notification) => (
            <li key={notification._id}>
              <NotificationItem notification={notification} onRead={(id) => markRead.mutate(id)} />
            </li>
          ))}
        </ul>
      )}

      {data && (
        <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onPageChange={setPage} />
      )}
    </div>
  );
}
