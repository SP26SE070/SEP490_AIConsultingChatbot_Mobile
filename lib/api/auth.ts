import { AUTH_BASE } from './config';

export async function login(email: string, password: string) {
  const res = await fetch(`${AUTH_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Login failed');
  return data;
}

export async function logout(token: string) {
  await fetch(`${AUTH_BASE}/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}
