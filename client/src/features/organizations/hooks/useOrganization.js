import { useQuery } from '@tanstack/react-query';
import { fetchOrganization } from '../../../services/organization.service.js';
import { QUERY_KEYS } from '../../../utils/constants.js';

export function useOrganization(orgId) {
  return useQuery({
    queryKey: QUERY_KEYS.ORGANIZATION(orgId),
    queryFn: () => fetchOrganization(orgId),
    enabled: Boolean(orgId),
  });
}
