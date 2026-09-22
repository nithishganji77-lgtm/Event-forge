import { useQuery } from '@tanstack/react-query';
import { fetchRecentActivity } from '../../../services/analytics.service.js';
import { QUERY_KEYS } from '../../../utils/constants.js';

export function useRecentActivity(orgId, limit = 10) {
  return useQuery({
    queryKey: QUERY_KEYS.RECENT_ACTIVITY(orgId, limit),
    queryFn: () => fetchRecentActivity(orgId, limit),
    enabled: Boolean(orgId),
  });
}
