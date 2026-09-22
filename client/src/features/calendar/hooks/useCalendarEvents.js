import { useEvents } from '../../events/hooks/useEvents.js';
import { getMonthGridRange } from '../utils/monthGrid.js';

// No new endpoint — reuses the existing dateFrom/dateTo filter on GET /organizations/:orgId/events
// for the visible grid range (including leading/trailing adjacent-month days), same QUERY_KEYS.EVENTS
// cache shape the Events list page already uses.
export function useCalendarEvents(orgId, monthDate) {
  const { gridStart, gridEnd } = getMonthGridRange(monthDate);
  return useEvents(orgId, {
    dateFrom: gridStart.toISOString(),
    dateTo: gridEnd.toISOString(),
    limit: 100,
  });
}
