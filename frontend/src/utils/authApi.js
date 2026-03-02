import api from '../../utils/api';

export async function getAuthConfig() {
  const { data } = await api.get('/api/auth/config');
  return data;
}

export async function login(email, password) {
  const { data } = await api.post('/api/auth/login', { email, password });
  return data;
}

export async function register(email, password, username) {
  const { data } = await api.post('/api/auth/register', { email, password, username });
  return data;
}

export async function verifyEmail(token) {
  const { data } = await api.post('/api/auth/verify-email', { token });
  return data;
}

export async function resendVerification(email) {
  const { data } = await api.post('/api/auth/resend-verification', { email });
  return data;
}

export async function loginWithGoogle(idToken) {
  const { data } = await api.post('/api/auth/google', { idToken });
  return data;
}

export async function getMe() {
  const { data } = await api.get('/api/auth/me');
  return data;
}

export async function updateProfile(payload) {
  const { data } = await api.patch('/api/auth/me', payload);
  return data;
}

export async function deleteAccount() {
  const { data } = await api.delete('/api/auth/me');
  return data;
}
