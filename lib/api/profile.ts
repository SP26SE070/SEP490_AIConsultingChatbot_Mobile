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

export async function updateProfile(phoneNumber: string, address: string, dateOfBirth?: string) {
  const body: any = { phoneNumber, address };
  if (dateOfBirth) {
    body.dateOfBirth = dateOfBirth;
  }
  const res = await fetchWithAuth(
    `${API_BASE_URL}/api/v1/profile/update`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update profile');
  return data;
}

export async function sendOtpForContactEmail(email: string) {
  const res = await fetchWithAuth(
    `${API_BASE_URL}/api/v1/profile/send-otp`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to send OTP');
  return data;
}

export async function updateContactEmail(email: string, otp: string) {
  const res = await fetchWithAuth(
    `${API_BASE_URL}/api/v1/profile/update-contact-email`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update contact email');
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
