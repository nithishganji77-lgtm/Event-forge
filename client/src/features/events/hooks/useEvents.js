import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { fetchEvents } from '../../../services/event.service.js';
import { QUERY_KEYS } from '../../../utils/constants.js';

export function useEvents(orgId, filters) {
  return useQuery({
    queryKey: QUERY_KEYS.EVENTS(orgId, filters),
    queryFn: () => fetchEvents(orgId, filters),
    enabled: Boolean(orgId),
    placeholderData: keepPreviousData,
  });
}
