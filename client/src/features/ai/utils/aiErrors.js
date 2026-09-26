import { getErrorInfo } from '../../../lib/errors.js';

// Splits a failed AI request into what belongs beside a field ("Remove personal details like emails"
// under the prompt box) and what needs a banner (off-topic, busy, offline, unavailable). A banner
// is only shown when there is something the fields can't say.
export function describeAiError(error, fields = []) {
  if (!error) return { fieldErrors: {}, banner: null };
  const info = getErrorInfo(error);
  const fieldErrors = {};
  let unmatched = 0;
  for (const [path, message] of Object.entries(info.fieldErrors)) {
    if (fields.includes(path)) fieldErrors[path] = message;
    else unmatched += 1;
  }
  const covered = Object.keys(fieldErrors).length > 0 && unmatched === 0;
  return { fieldErrors, banner: covered ? null : (info.message ?? 'Something went wrong. Please try again.'), kind: info.kind };
}
