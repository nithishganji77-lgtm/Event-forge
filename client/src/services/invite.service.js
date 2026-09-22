import { api } from '../lib/axios.js';

export async function createInviteRequest(orgId, { email, role }) {
  const { data } = await api.post(`/organizations/${orgId}/invites`, { email, role });
  return data.data;
}

export async function fetchInvites(orgId, { page = 1, limit = 20, status } = {}) {
  const { data } = await api.get(`/organizations/${orgId}/invites`, { params: { page, limit, status } });
  return data;
}

export async function resendInviteRequest(orgId, inviteId) {
  const { data } = await api.post(`/organizations/${orgId}/invites/${inviteId}/resend`);
  return data.data;
}

export async function revokeInviteRequest(orgId, inviteId) {
  const { data } = await api.delete(`/organizations/${orgId}/invites/${inviteId}`);
  return data.data;
}

export async function previewInviteRequest(token) {
  const { data } = await api.get(`/invites/${token}`);
  return data.data;
}

export async function acceptInviteRequest(token) {
  const { data } = await api.post(`/invites/${token}/accept`);
  return data.data;
}
