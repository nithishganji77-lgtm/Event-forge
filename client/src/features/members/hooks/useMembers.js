import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { fetchMembers } from '../../../services/member.service.js';
import { QUERY_KEYS } from '../../../utils/constants.js';

export function useMembers(orgId, filters) {
  return useQuery({
    queryKey: QUERY_KEYS.MEMBERS(orgId, filters),
    queryFn: () => fetchMembers(orgId, filters),
    enabled: Boolean(orgId),
    placeholderData: keepPreviousData,
  });
}
