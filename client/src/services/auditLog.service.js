import { api } from '../lib/axios.js';

export async function fetchAuditLogs(orgId, filters = {}) {
  const { data } = await api.get(`/organizations/${orgId}/audit-logs`, { params: filters });
  return data;
}
