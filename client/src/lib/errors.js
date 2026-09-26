// One place that turns whatever a failed request threw into something a person can act on.
//
// The server already writes readable messages (and, for validation, a `details` list with a path per
// problem). What it cannot cover is a request that never got an answer: the network is down, the
// request timed out, a proxy returned an HTML 502. Those used to fall through to a generic fallback
// such as "Could not load events", which says nothing about what to do.

const DEFAULTS_BY_STATUS = {
  400: "Something in that request isn't right. Check it and try again.",
  401: 'Your session has expired. Please sign in again.',
  403: "You don't have permission to do that. If you need access, ask an organization admin.",
  404: "We couldn't find what you were looking for.",
  408: 'That took too long. Please try again.',
  409: 'That conflicts with something that already exists.',
  413: 'That is too large to send.',
  429: 'Too many requests in a short time. Please wait a few minutes and try again.',
  500: 'Something went wrong on our side. Please try again in a moment.',
  502: 'EventForge is temporarily unavailable. Please try again in a minute.',
  503: 'EventForge is temporarily unavailable. Please try again in a minute.',
  504: 'EventForge took too long to respond. Please try again in a minute.',
};

const NETWORK_MESSAGE = "We can't reach EventForge right now. Check your internet connection and try again.";
const TIMEOUT_MESSAGE = 'That took too long. Please try again.';

function statusKind(status) {
  if (status === 401) return 'auth';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  if (status === 409) return 'conflict';
  if (status === 429) return 'rate_limit';
  if (status === 400 || status === 413 || status === 422) return 'validation';
  if (status >= 500) return 'server';
  return 'unknown';
}

// "Try again in about 4 minutes" from the standard RateLimit-Reset header (seconds), when the
// server sends it.
function waitHint(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  if (seconds < 90) return 'about a minute';
  return `about ${Math.ceil(seconds / 60)} minutes`;
}

// -> { kind, status, message, fieldErrors, retryable }
//   kind        'network' | 'timeout' | 'auth' | 'forbidden' | 'not_found' | 'conflict' |
//               'rate_limit' | 'validation' | 'server' | 'unknown'
//   fieldErrors { 'venue.mapUrl': 'Enter a link starting with https://' }: the first problem per
//               field, from the server's `details`, for putting next to the form fields
//   retryable   worth offering "Try again" (a dropped connection or a server hiccup, not a 403)
export function getErrorInfo(error) {
  const response = error?.response;

  if (!response) {
    if (error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT') {
      return { kind: 'timeout', status: null, message: TIMEOUT_MESSAGE, fieldErrors: {}, retryable: true };
    }
    if (error?.code === 'ERR_NETWORK' || error?.request) {
      return { kind: 'network', status: null, message: NETWORK_MESSAGE, fieldErrors: {}, retryable: true };
    }
    // Something thrown by our own code: its message is for developers, not for this person.
    return { kind: 'unknown', status: null, message: null, fieldErrors: {}, retryable: false };
  }

  const { status } = response;
  const body = response.data?.error;
  const details = Array.isArray(body?.details) ? body.details : [];

  const fieldErrors = {};
  for (const detail of details) {
    if (detail?.path && detail?.message && !(detail.path in fieldErrors)) fieldErrors[detail.path] = detail.message;
  }

  // A proxy's HTML error page has no `error.message`; use the status's default wording. A 5xx from
  // the API itself is already worded, but never show anything but our own sentence for a 500.
  let message = typeof body?.message === 'string' && body.message.trim() ? body.message : DEFAULTS_BY_STATUS[status] ?? null;
  if (status >= 500 && !body?.message) message = DEFAULTS_BY_STATUS[status] ?? DEFAULTS_BY_STATUS[500];

  if (status === 429) {
    const wait = waitHint(Number(response.headers?.['ratelimit-reset']));
    message = wait ? `Too many requests in a short time. Please wait ${wait} and try again.` : message;
  }

  return { kind: statusKind(status), status, message, fieldErrors, retryable: status >= 500 || status === 408 };
}

// The sentence to show. `fallback` is only for when there is nothing better to say (an error our
// own code threw), so it should read as a sentence, not a title.
export function extractErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  return getErrorInfo(error).message ?? fallback;
}
