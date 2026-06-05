import { API_BASE_URL, TENANT_ADMIN_BASE } from './config';
import { fetchJsonWithAuth } from './fetchWithAuth';
import { getAccessToken } from '../auth-store';

export interface TenantInfoResponse {
  id: string;
  name: string;
  address?: string | null;
  website?: string | null;
  companySize?: string | null;
  logoUrl?: string | null;
  additionalLogoUrl?: string | null;
  additionalLogoType?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateTenantProfileRequest {
  address?: string;
  website?: string;
  companySize?: string;
}

export async function getTenantInfo(): Promise<TenantInfoResponse> {
  const token = await getAccessToken();
  if (!token) throw new Error('No authentication token found');

  const res = await fetch(`${TENANT_ADMIN_BASE}/dashboard/tenant`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const err = await res.text().catch(() => 'Failed to fetch tenant info');
    throw new Error(err);
  }

  return res.json();
}

export async function updateTenantProfile(data: UpdateTenantProfileRequest): Promise<TenantInfoResponse> {
  return await fetchJsonWithAuth(`${TENANT_ADMIN_BASE}/tenant/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function uploadTenantLogo(uri: string, name: string, type: string): Promise<{
  additionalLogoUrl: string;
  additionalLogoType: string;
}> {
  const token = await getAccessToken();
  if (!token) throw new Error('No authentication token found');

  const formData = new FormData();
  formData.append('file', {
    uri,
    name,
    type,
  } as any);

  const res = await fetch(`${TENANT_ADMIN_BASE}/tenant/logo`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text().catch(() => 'Failed to upload logo');
    throw new Error(err);
  }

  return res.json();
}

export async function deleteTenantLogo(): Promise<void> {
  const token = await getAccessToken();
  if (!token) throw new Error('No authentication token found');

  const res = await fetch(`${TENANT_ADMIN_BASE}/tenant/logo`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const err = await res.text().catch(() => 'Failed to delete logo');
    throw new Error(err);
  }
}
