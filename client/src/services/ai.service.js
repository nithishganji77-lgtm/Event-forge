import { api } from '../lib/axios.js';

const base = (orgId) => `/organizations/${orgId}/ai`;

export async function fetchAiStatus(orgId) {
  const { data } = await api.get(`${base(orgId)}/status`);
  return data.data; // { enabled }
}

// Every task answers { kind, result, cached }.
async function post(orgId, path, body) {
  const { data } = await api.post(`${base(orgId)}${path}`, body);
  return data.data;
}

export const requestDraft = (orgId, body) => post(orgId, '/draft', body);
export const requestConcepts = (orgId, body) => post(orgId, '/concepts', body);
export const requestVenues = (orgId, body) => post(orgId, '/venues', body);
export const requestEnhance = (orgId, body) => post(orgId, '/enhance', body);
