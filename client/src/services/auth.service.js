import { api } from '../lib/axios.js';

export async function registerRequest({ name, email, password }) {
  const { data } = await api.post('/auth/register', { name, email, password });
  return data.data;
}

export async function loginRequest({ email, password }) {
  const { data } = await api.post('/auth/login', { email, password });
  return data.data;
}

export async function logoutRequest() {
  const { data } = await api.post('/auth/logout');
  return data.data;
}

export async function fetchCurrentUser() {
  const { data } = await api.get('/auth/me');
  return data.data;
}

export async function forgotPasswordRequest({ email }) {
  const { data } = await api.post('/auth/forgot-password', { email });
  return data.data;
}

export async function resetPasswordRequest({ token, password }) {
  const { data } = await api.post('/auth/reset-password', { token, password });
  return data.data;
}

export async function googleAuthRequest({ credential }) {
  const { data } = await api.post('/auth/google', { credential });
  return data.data;
}
