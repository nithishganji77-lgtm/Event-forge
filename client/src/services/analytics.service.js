import { api } from '../lib/axios.js';

export async function fetchOrgAnalytics(orgId) {
  const { data } = await api.get(`/organizations/${orgId}/analytics`);
  return data.data.analytics;
}

export async function fetchEventAnalytics(eventId) {
  const { data } = await api.get(`/events/${eventId}/analytics`);
  return data.data.analytics;
}

export async function fetchRecentActivity(orgId, limit = 10) {
  const { data } = await api.get(`/organizations/${orgId}/audit-logs/recent`, { params: { limit } });
  return data.data.logs;
}
