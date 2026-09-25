import { useQuery } from '@tanstack/react-query';
import { fetchMyNotifications } from '../../../services/notification.service.js';
import { QUERY_KEYS } from '../../../utils/constants.js';

// Reads pagination.total off a limit:1 list query instead of a dedicated count endpoint — the list
// query already runs countDocuments regardless of limit, so this costs nothing extra server-side.
export function useUnreadCount() {
  const query = useQuery({
    queryKey: QUERY_KEYS.UNREAD_NOTIFICATIONS_COUNT,
    queryFn: () => fetchMyNotifications({ unreadOnly: true, limit: 1 }),
    refetchInterval: 30_000,
  });

  return { count: query.data?.pagination?.total ?? 0, isLoading: query.isLoading };
}
