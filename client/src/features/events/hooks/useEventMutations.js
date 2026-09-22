import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createEventRequest,
  updateEventRequest,
  deleteEventRequest,
  publishEventRequest,
  cancelEventRequest,
  duplicateEventRequest,
} from '../../../services/event.service.js';
import { QUERY_KEYS } from '../../../utils/constants.js';

function useInvalidateEvents(orgId, eventId) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['organizations', orgId, 'events'] });
    if (eventId) queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EVENT(eventId) });
  };
}

export function useCreateEvent(orgId) {
  const invalidate = useInvalidateEvents(orgId);
  return useMutation({
    mutationFn: (payload) => createEventRequest(orgId, payload),
    onSuccess: invalidate,
  });
}

export function useUpdateEvent(orgId, eventId) {
  const invalidate = useInvalidateEvents(orgId, eventId);
  return useMutation({
    mutationFn: (payload) => updateEventRequest(eventId, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteEvent(orgId, eventId) {
  const invalidate = useInvalidateEvents(orgId, eventId);
  return useMutation({
    mutationFn: () => deleteEventRequest(eventId),
    onSuccess: invalidate,
  });
}

export function usePublishEvent(orgId, eventId) {
  const invalidate = useInvalidateEvents(orgId, eventId);
  return useMutation({
    mutationFn: () => publishEventRequest(eventId),
    onSuccess: invalidate,
  });
}

export function useCancelEvent(orgId, eventId) {
  const invalidate = useInvalidateEvents(orgId, eventId);
  return useMutation({
    mutationFn: () => cancelEventRequest(eventId),
    onSuccess: invalidate,
  });
}

export function useDuplicateEvent(orgId, eventId) {
  const invalidate = useInvalidateEvents(orgId, eventId);
  return useMutation({
    mutationFn: (overrides) => duplicateEventRequest(eventId, overrides),
    onSuccess: invalidate,
  });
}
