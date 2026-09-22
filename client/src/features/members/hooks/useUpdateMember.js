import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateMemberRequest, updateMemberStatusRequest, removeMemberRequest } from '../../../services/member.service.js';

function useInvalidateMembers(orgId) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['organizations', orgId, 'members'] });
}

export function useUpdateMemberRole(orgId) {
  const invalidate = useInvalidateMembers(orgId);
  return useMutation({
    mutationFn: ({ memberId, role }) => updateMemberRequest(orgId, memberId, { role }),
    onSuccess: invalidate,
  });
}

export function useUpdateMemberStatus(orgId) {
  const invalidate = useInvalidateMembers(orgId);
  return useMutation({
    mutationFn: ({ memberId, status }) => updateMemberStatusRequest(orgId, memberId, status),
    onSuccess: invalidate,
  });
}

export function useRemoveMember(orgId) {
  const invalidate = useInvalidateMembers(orgId);
  return useMutation({
    mutationFn: (memberId) => removeMemberRequest(orgId, memberId),
    onSuccess: invalidate,
  });
}
