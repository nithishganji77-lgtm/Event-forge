import { useMutation, useQueryClient } from '@tanstack/react-query';
import { markNotificationReadRequest } from '../../../services/notification.service.js';

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId) => markNotificationReadRequest(notificationId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me', 'notifications'] }),
  });
}
