import { useQuery } from '@tanstack/react-query';
import { fetchOrgAnalytics } from '../../../services/analytics.service.js';
import { QUERY_KEYS } from '../../../utils/constants.js';

export function useOrgAnalytics(orgId) {
  return useQuery({
    queryKey: QUERY_KEYS.ORG_ANALYTICS(orgId),
    queryFn: () => fetchOrgAnalytics(orgId),
    enabled: Boolean(orgId),
  });
}
