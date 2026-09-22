import { api } from '../lib/axios.js';

export async function fetchMembers(orgId, { page = 1, limit = 20, search, role, status } = {}) {
  const { data } = await api.get(`/organizations/${orgId}/members`, {
    params: { page, limit, search, role, status },
  });
  return data;
}

export async function updateMemberRequest(orgId, memberId, updates) {
  const { data } = await api.patch(`/organizations/${orgId}/members/${memberId}`, updates);
  return data.data;
}

export async function updateMemberStatusRequest(orgId, memberId, status) {
  const { data } = await api.patch(`/organizations/${orgId}/members/${memberId}/status`, { status });
  return data.data;
}

export async function removeMemberRequest(orgId, memberId) {
  const { data } = await api.delete(`/organizations/${orgId}/members/${memberId}`);
  return data.data;
}
