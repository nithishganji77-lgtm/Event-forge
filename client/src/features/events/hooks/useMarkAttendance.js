import { useMutation, useQueryClient } from '@tanstack/react-query';
import { markAttendanceRequest } from '../../../services/registration.service.js';
import { QUERY_KEYS } from '../../../utils/constants.js';

export function useMarkAttendance(eventId) {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { errorToast: 'Could not save attendance' },
    mutationFn: ({ registrationId, attendanceStatus }) =>
      markAttendanceRequest(eventId, registrationId, attendanceStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', eventId, 'registrations'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EVENT_ANALYTICS(eventId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EVENT(eventId) });
    },
  });
}
