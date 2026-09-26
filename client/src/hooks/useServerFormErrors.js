import { useCallback, useState } from 'react';
import { getErrorInfo } from '../lib/errors.js';

// Puts a failed submit's problems where the person can see them. The server's validation errors
// carry a path per field ("email", "venue.mapUrl"), so each one is set on its field, next to the
// input, exactly like a client-side validation error. Anything that isn't about a field this form
// has (a network failure, a 500, a conflict with no field) comes back as `alertMessage`, for the
// form's Alert. Pass `fields` so an error for a field the form doesn't show is not lost.
//
//   const { alertMessage, onError, clear } = useServerFormErrors(setError, ['email', 'name']);
//   mutation.mutate(values, { onError });
export function useServerFormErrors(setError, fields) {
  const [alertMessage, setAlertMessage] = useState(null);

  const onError = useCallback(
    (error) => {
      const info = getErrorInfo(error);
      let matched = 0;
      let unmatched = 0;
      for (const [path, message] of Object.entries(info.fieldErrors)) {
        if (fields.includes(path)) {
          setError(path, { type: 'server', message });
          matched += 1;
        } else {
          unmatched += 1;
        }
      }
      // Every problem is beside a field: no banner needed, it would only repeat them.
      setAlertMessage(matched > 0 && unmatched === 0 ? null : (info.message ?? 'Something went wrong. Please try again.'));
    },
    [setError, fields]
  );

  const clear = useCallback(() => setAlertMessage(null), []);
  return { alertMessage, onError, clear };
}
