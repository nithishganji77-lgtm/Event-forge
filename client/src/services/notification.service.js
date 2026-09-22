import { api } from '../lib/axios.js';

export async function fetchMyNotifications(filters = {}) {
  const { data } = await api.get('/me/notifications', { params: filters });
  return data;
}

export async function markNotificationReadRequest(notificationId) {
  const { data } = await api.patch(`/me/notifications/${notificationId}/read`);
  return data.data.notification;
}

export async function markAllNotificationsReadRequest() {
  await api.patch('/me/notifications/read-all');
}
