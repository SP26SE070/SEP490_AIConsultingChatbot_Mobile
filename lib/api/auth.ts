import { AUTH_BASE } from './config';

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  id: string;
  email: string;
  tenantId: string;
  roles: string[];
  permissions?: string[];
  mustChangePassword?: boolean;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
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
