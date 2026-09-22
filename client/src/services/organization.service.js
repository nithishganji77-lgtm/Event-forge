import { api } from '../lib/axios.js';

export async function createOrganizationRequest({ name, description }) {
  const { data } = await api.post('/organizations', { name, description });
  return data.data;
}

export async function listOrganizationsRequest() {
  const { data } = await api.get('/organizations');
  return data.data;
}

export async function fetchOrganization(orgId) {
  const { data } = await api.get(`/organizations/${orgId}`);
  return data.data;
}

export async function updateOrganizationRequest(orgId, updates) {
  const { data } = await api.patch(`/organizations/${orgId}`, updates);
  return data.data;
}

export async function deleteOrganizationRequest(orgId) {
  const { data } = await api.delete(`/organizations/${orgId}`);
  return data.data;
}
