import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteOrganizationRequest } from '../../../services/organization.service.js';
import { QUERY_KEYS } from '../../../utils/constants.js';

export function useDeleteOrganization(orgId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => deleteOrganizationRequest(orgId),
    // Returned so the caller's own onSuccess (which navigates away) waits for the memberships
    // cache to drop the deleted org first — see useCreateOrganization for the same reasoning.
    onSuccess: () => {
      return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CURRENT_USER });
    },
  });
}
