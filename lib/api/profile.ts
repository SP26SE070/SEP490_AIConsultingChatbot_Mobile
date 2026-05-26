import { API_BASE_URL } from './config';
import { fetchJsonWithAuth } from './fetchWithAuth';

export async function getProfile() {
  return await fetchJsonWithAuth(`${API_BASE_URL}/api/v1/profile/me`);
}

export async function updateProfile(phoneNumber: string, address: string, dateOfBirth?: string) {
  const body: any = { phoneNumber, address };
  if (dateOfBirth) {
    body.dateOfBirth = dateOfBirth;
  }
  return await fetchJsonWithAuth(`${API_BASE_URL}/api/v1/profile/update`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function sendOtpForContactEmail(email: string) {
  return await fetchJsonWithAuth(`${API_BASE_URL}/api/v1/profile/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
}

export async function updateContactEmail(email: string, otp: string) {
  return await fetchJsonWithAuth(`${API_BASE_URL}/api/v1/profile/update-contact-email`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp }),
  });
}

export async function changePassword(currentPassword: string, newPassword: string) {
  return await fetchJsonWithAuth(`${API_BASE_URL}/api/v1/profile/change-password`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}
