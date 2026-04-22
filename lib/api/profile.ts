import { API_BASE_URL } from './config';
import { fetchWithAuth } from './fetchWithAuth';

export async function getProfile() {
  const res = await fetchWithAuth(
    `${API_BASE_URL}/api/v1/profile/me`
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load profile');
  return data;
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const res = await fetchWithAuth(
    `${API_BASE_URL}/api/v1/profile/change-password`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to change password');
  return data;
}
