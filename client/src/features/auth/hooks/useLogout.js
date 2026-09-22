import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logoutRequest } from '../../../services/auth.service.js';

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logoutRequest,
    onSuccess: () => {
      queryClient.clear();
    },
  });
}
