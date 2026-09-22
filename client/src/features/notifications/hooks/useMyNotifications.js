import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { fetchMyNotifications } from '../../../services/notification.service.js';
import { QUERY_KEYS } from '../../../utils/constants.js';

export function useMyNotifications(filters) {
  return useQuery({
    queryKey: QUERY_KEYS.MY_NOTIFICATIONS(filters),
    queryFn: () => fetchMyNotifications(filters),
    placeholderData: keepPreviousData,
  });
}
