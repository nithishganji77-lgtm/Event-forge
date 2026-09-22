import { useQuery, useMutation } from '@tanstack/react-query';
import { previewInviteRequest, acceptInviteRequest } from '../../../services/invite.service.js';
import { QUERY_KEYS } from '../../../utils/constants.js';

export function useInvitePreview(token) {
  return useQuery({
    queryKey: QUERY_KEYS.INVITE_PREVIEW(token),
    queryFn: () => previewInviteRequest(token),
    enabled: Boolean(token),
    retry: false,
  });
}

export function useAcceptInvite() {
  return useMutation({
    mutationFn: (token) => acceptInviteRequest(token),
  });
}
