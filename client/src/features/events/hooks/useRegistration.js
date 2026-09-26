import { useMutation, useQueryClient } from '@tanstack/react-query';
import { registerForEventRequest, cancelRegistrationRequest } from '../../../services/registration.service.js';
import { QUERY_KEYS } from '../../../utils/constants.js';

function useInvalidateRegistration(eventId) {
  const queryClient = useQueryClient();
  return () => {
    // Re-render from server truth rather than trusting a possibly-stale pre-click capacity guess.
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EVENT(eventId) });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MY_EVENTS });
    // Every org's event lists (cards show registeredCount / myRegistrationStatus) and analytics
    // (the dashboard's attendee KPI) change with a registration. The hook only knows the event id,
    // not its org, so match by key shape rather than by org.
    queryClient.invalidateQueries({
      predicate: ({ queryKey }) => queryKey[0] === 'organizations' && (queryKey[2] === 'events' || queryKey[2] === 'analytics'),
    });
  };
}

export function useRegister(eventId) {
  const invalidate = useInvalidateRegistration(eventId);
  return useMutation({
    meta: { errorToast: 'Could not register you for this event' },
    mutationFn: () => registerForEventRequest(eventId),
    onSuccess: invalidate,
  });
}

export function useCancelRegistration(eventId) {
  const invalidate = useInvalidateRegistration(eventId);
  return useMutation({
    meta: { errorToast: 'Could not cancel your registration' },
    mutationFn: () => cancelRegistrationRequest(eventId),
    onSuccess: invalidate,
  });
}
