import { api } from '../lib/axios.js';

export async function fetchOrgAnalytics(orgId) {
  const { data } = await api.get(`/organizations/${orgId}/analytics`);
  return data.data.analytics;
}

// `timeZone` is the browser's IANA zone so "this month" means the viewer's own calendar month.
export async function fetchDashboardSummary(orgId, timeZone) {
  const { data } = await api.get(`/organizations/${orgId}/analytics/dashboard`, {
    params: timeZone ? { tz: timeZone } : undefined,
  });
  return data.data.summary;
}

export async function fetchEventAnalytics(eventId) {
  const { data } = await api.get(`/events/${eventId}/analytics`);
  return data.data.analytics;
}

export async function fetchRecentActivity(orgId, limit = 10) {
  const { data } = await api.get(`/organizations/${orgId}/audit-logs/recent`, { params: { limit } });
  return data.data.logs;
}
