import { useMutation, useQueryClient } from '@tanstack/react-query';
import { registerRequest } from '../../../services/auth.service.js';
import { QUERY_KEYS } from '../../../utils/constants.js';

export function useRegister() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: registerRequest,
    onSuccess: (data) => {
      queryClient.setQueryData(QUERY_KEYS.CURRENT_USER, data);
    },
  });
}
