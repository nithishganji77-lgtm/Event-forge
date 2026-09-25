import { useQuery } from '@tanstack/react-query';
import { fetchDashboardSummary } from '../../../services/analytics.service.js';
import { QUERY_KEYS } from '../../../utils/constants.js';

function getBrowserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined; // the server falls back to its default zone
  }
}

// Lives under the ORG_ANALYTICS key prefix so anything that invalidates org analytics (event
// mutations, registrations) refreshes the dashboard too. Shared by the KPI row and the quick
// actions, which is why it is a hook and not a prop: one request, deduplicated by the cache.
export function useDashboardSummary(orgId) {
  const timeZone = getBrowserTimeZone();
  return useQuery({
    queryKey: [...QUERY_KEYS.ORG_ANALYTICS(orgId), 'dashboard', timeZone ?? null],
    queryFn: () => fetchDashboardSummary(orgId, timeZone),
    enabled: Boolean(orgId),
  });
}
