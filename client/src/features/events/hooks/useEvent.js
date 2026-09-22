import { useQuery } from '@tanstack/react-query';
import { fetchEvent } from '../../../services/event.service.js';
import { QUERY_KEYS } from '../../../utils/constants.js';

export function useEvent(eventId) {
  return useQuery({
    queryKey: QUERY_KEYS.EVENT(eventId),
    queryFn: () => fetchEvent(eventId),
    enabled: Boolean(eventId),
  });
}
