import { api } from '../lib/axios.js';

export async function fetchEvents(orgId, filters = {}) {
  const { data } = await api.get(`/organizations/${orgId}/events`, { params: filters });
  return data;
}

export async function fetchEvent(eventId) {
  const { data } = await api.get(`/events/${eventId}`);
  return data.data.event;
}

export async function createEventRequest(orgId, payload) {
  const { data } = await api.post(`/organizations/${orgId}/events`, payload);
  return data.data.event;
}

export async function updateEventRequest(eventId, payload) {
  const { data } = await api.patch(`/events/${eventId}`, payload);
  return data.data.event;
}

export async function deleteEventRequest(eventId) {
  await api.delete(`/events/${eventId}`);
}

export async function publishEventRequest(eventId) {
  const { data } = await api.post(`/events/${eventId}/publish`);
  return data.data.event;
}

export async function cancelEventRequest(eventId) {
  const { data } = await api.post(`/events/${eventId}/cancel`);
  return data.data.event;
}

export async function duplicateEventRequest(eventId, overrides = {}) {
  const { data } = await api.post(`/events/${eventId}/duplicate`, overrides);
  return data.data.event;
}

export async function uploadCoverImageRequest(eventId, file) {
  const formData = new FormData();
  formData.append('coverImage', file);
  const { data } = await api.post(`/events/${eventId}/cover-image`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data.event;
}
