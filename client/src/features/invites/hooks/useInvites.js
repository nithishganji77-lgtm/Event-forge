import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  fetchInvites,
  createInviteRequest,
  resendInviteRequest,
  revokeInviteRequest,
} from '../../../services/invite.service.js';
import { QUERY_KEYS } from '../../../utils/constants.js';

export function useInvites(orgId, filters) {
  return useQuery({
    queryKey: QUERY_KEYS.INVITES(orgId, filters),
    queryFn: () => fetchInvites(orgId, filters),
    enabled: Boolean(orgId),
    placeholderData: keepPreviousData,
  });
}

function useInvalidateInvites(orgId) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['organizations', orgId, 'invites'] });
}

export function useCreateInvite(orgId) {
  const invalidate = useInvalidateInvites(orgId);
  return useMutation({
    mutationFn: ({ email, role }) => createInviteRequest(orgId, { email, role }),
    onSuccess: invalidate,
  });
}

export function useResendInvite(orgId) {
  const invalidate = useInvalidateInvites(orgId);
  return useMutation({
    meta: { errorToast: 'Could not resend the invite' },
    mutationFn: (inviteId) => resendInviteRequest(orgId, inviteId),
    onSuccess: invalidate,
  });
}

export function useRevokeInvite(orgId) {
  const invalidate = useInvalidateInvites(orgId);
  return useMutation({
    meta: { errorToast: 'Could not cancel the invite' },
    mutationFn: (inviteId) => revokeInviteRequest(orgId, inviteId),
    onSuccess: invalidate,
  });
}
