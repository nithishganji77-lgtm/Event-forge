import { api } from '../lib/axios.js';

export async function registerForEventRequest(eventId) {
  const { data } = await api.post(`/events/${eventId}/register`);
  return data.data.registration;
}

export async function cancelRegistrationRequest(eventId) {
  await api.delete(`/events/${eventId}/register`);
}

export async function fetchEventRegistrations(eventId, filters = {}) {
  const { data } = await api.get(`/events/${eventId}/registrations`, { params: filters });
  return data;
}

export async function fetchMyEvents() {
  const { data } = await api.get('/me/events');
  return data.data.registrations;
}

export async function markAttendanceRequest(eventId, registrationId, attendanceStatus) {
  const { data } = await api.patch(
    `/events/${eventId}/registrations/${registrationId}/attendance`,
    { attendanceStatus }
  );
  return data.data.registration;
}
