import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateOrganizationRequest } from '../../../services/organization.service.js';
import { QUERY_KEYS } from '../../../utils/constants.js';

export function useUpdateOrganization(orgId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates) => updateOrganizationRequest(orgId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ORGANIZATION(orgId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CURRENT_USER });
    },
  });
}
