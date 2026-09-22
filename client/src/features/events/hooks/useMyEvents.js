import { useQuery } from '@tanstack/react-query';
import { fetchMyEvents } from '../../../services/registration.service.js';
import { QUERY_KEYS } from '../../../utils/constants.js';

export function useMyEvents() {
  return useQuery({
    queryKey: QUERY_KEYS.MY_EVENTS,
    queryFn: fetchMyEvents,
  });
}
