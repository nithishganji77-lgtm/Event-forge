import { useMutation, useQueryClient } from '@tanstack/react-query';
import { googleAuthRequest } from '../../../services/auth.service.js';
import { QUERY_KEYS } from '../../../utils/constants.js';

export function useGoogleAuth() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: googleAuthRequest,
    onSuccess: (data) => {
      queryClient.setQueryData(QUERY_KEYS.CURRENT_USER, data);
    },
  });
}
