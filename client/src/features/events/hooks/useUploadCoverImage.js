import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadCoverImageRequest } from '../../../services/event.service.js';
import { QUERY_KEYS } from '../../../utils/constants.js';

// Isolated from useEventMutations — a different call shape (FormData, not JSON).
export function useUploadCoverImage(eventId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file) => uploadCoverImageRequest(eventId, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EVENT(eventId) }),
  });
}
