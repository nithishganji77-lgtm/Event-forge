import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logoutRequest } from '../../../services/auth.service.js';

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { errorToast: 'Could not sign you out' },
    mutationFn: logoutRequest,
    onSuccess: () => {
      queryClient.clear();
    },
  });
}
