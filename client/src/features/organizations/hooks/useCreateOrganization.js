import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createOrganizationRequest } from '../../../services/organization.service.js';
import { QUERY_KEYS } from '../../../utils/constants.js';

export function useCreateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createOrganizationRequest,
    // Returning the promise matters: TanStack Query awaits a hook-level onSuccess before running
    // the mutate()-call-level onSuccess. CreateOrganizationForm navigates to the new org's
    // dashboard from that second callback — without awaiting here, it would navigate before the
    // memberships cache (read by OrgLayoutRoute) actually contains the new org, bouncing the user
    // straight back to onboarding.
    onSuccess: () => {
      return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CURRENT_USER });
    },
  });
}
