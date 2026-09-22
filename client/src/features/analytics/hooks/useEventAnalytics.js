import { useQuery } from '@tanstack/react-query';
import { fetchEventAnalytics } from '../../../services/analytics.service.js';
import { QUERY_KEYS } from '../../../utils/constants.js';

export function useEventAnalytics(eventId, enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.EVENT_ANALYTICS(eventId),
    queryFn: () => fetchEventAnalytics(eventId),
    enabled: Boolean(eventId) && enabled,
  });
}
