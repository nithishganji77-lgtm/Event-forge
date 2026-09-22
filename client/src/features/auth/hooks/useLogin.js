import { useMutation, useQueryClient } from '@tanstack/react-query';
import { loginRequest } from '../../../services/auth.service.js';
import { QUERY_KEYS } from '../../../utils/constants.js';

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: loginRequest,
    onSuccess: (data) => {
      queryClient.setQueryData(QUERY_KEYS.CURRENT_USER, data);
    },
  });
}
