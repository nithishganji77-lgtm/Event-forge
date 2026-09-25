// A venue's map link is organizer-supplied text that ends up in an <a href>, so only a plain
// http(s) URL is ever used as one. `javascript:` and `data:` URLs pass a generic URL check and
// would run script in the viewer's session when clicked. The server rejects them on write; this is
// the same rule on read, for rows saved before that existed.
export function safeHttpUrl(value) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

// A search on Google Maps for the venue's name and address: it works for any venue without a map
// provider key. Null when there is nothing to search for.
export function directionsUrl(venue) {
  const query = [venue?.name, venue?.address].map((part) => part?.trim()).filter(Boolean).join(', ');
  return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : null;
}
