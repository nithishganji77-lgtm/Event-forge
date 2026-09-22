import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { fetchAuditLogs } from '../../../services/auditLog.service.js';
import { QUERY_KEYS } from '../../../utils/constants.js';

export function useAuditLogs(orgId, filters) {
  return useQuery({
    queryKey: QUERY_KEYS.AUDIT_LOGS(orgId, filters),
    queryFn: () => fetchAuditLogs(orgId, filters),
    enabled: Boolean(orgId),
    placeholderData: keepPreviousData,
  });
}
