import { useMutation, useQueryClient } from '@tanstack/react-query';
import { markAllNotificationsReadRequest } from '../../../services/notification.service.js';

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { errorToast: 'Could not update your notifications' },
    mutationFn: markAllNotificationsReadRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me', 'notifications'] }),
  });
}
