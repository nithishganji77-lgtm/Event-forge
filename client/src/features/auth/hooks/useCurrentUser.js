import { useQuery } from '@tanstack/react-query';
import { fetchCurrentUser } from '../../../services/auth.service.js';
import { QUERY_KEYS } from '../../../utils/constants.js';

export function useCurrentUser() {
  return useQuery({
    queryKey: QUERY_KEYS.CURRENT_USER,
    queryFn: fetchCurrentUser,
    retry: false,
  });
}
