import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { fetchEventRegistrations } from '../../../services/registration.service.js';
import { QUERY_KEYS } from '../../../utils/constants.js';

export function useEventRegistrations(eventId, filters) {
  return useQuery({
    queryKey: QUERY_KEYS.EVENT_REGISTRATIONS(eventId, filters),
    queryFn: () => fetchEventRegistrations(eventId, filters),
    enabled: Boolean(eventId),
    placeholderData: keepPreviousData,
  });
}
