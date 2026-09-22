import { useMutation, useQueryClient } from '@tanstack/react-query';
import { registerForEventRequest, cancelRegistrationRequest } from '../../../services/registration.service.js';
import { QUERY_KEYS } from '../../../utils/constants.js';

function useInvalidateRegistration(eventId) {
  const queryClient = useQueryClient();
  return () => {
    // Re-render from server truth rather than trusting a possibly-stale pre-click capacity guess.
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EVENT(eventId) });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MY_EVENTS });
  };
}

export function useRegister(eventId) {
  const invalidate = useInvalidateRegistration(eventId);
  return useMutation({
    mutationFn: () => registerForEventRequest(eventId),
    onSuccess: invalidate,
  });
}

export function useCancelRegistration(eventId) {
  const invalidate = useInvalidateRegistration(eventId);
  return useMutation({
    mutationFn: () => cancelRegistrationRequest(eventId),
    onSuccess: invalidate,
  });
}
