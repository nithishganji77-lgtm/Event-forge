// "Good morning" / "Good afternoon" / "Good evening" by the viewer's local hour. Nothing here knows
// about the organization's timezone: a greeting is about the person reading it.
export function getGreetingPhrase(now = Date.now()) {
  const hour = new Date(now).getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function getFirstName(fullName) {
  return (fullName ?? '').trim().split(/\s+/)[0] ?? '';
}

export function formatGreeting(fullName, now = Date.now()) {
  const phrase = getGreetingPhrase(now);
  const first = getFirstName(fullName);
  return first ? `${phrase}, ${first}` : phrase;
}
