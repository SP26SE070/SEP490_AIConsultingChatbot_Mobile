import { API_BASE_URL } from './config';
import { fetchWithAuth } from './fetchWithAuth';

const STAFF_BASE = `${API_BASE_URL}/api/v1/staff`;

export async function getTenants(status?: string) {
  const url = status
    ? `${STAFF_BASE}/tenants?status=${status}`
    : `${STAFF_BASE}/tenants`;
  const res = await fetchWithAuth(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load tenants');
  return data;
}

export async function approveTenant(tenantId: string) {
  const res = await fetchWithAuth(`${STAFF_BASE}/tenants/${tenantId}/approve`, {
    method: 'PUT',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to approve tenant');
  return data;
}

export async function rejectTenant(tenantId: string, reason: string) {
  const res = await fetchWithAuth(`${STAFF_BASE}/tenants/${tenantId}/reject`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to reject tenant');
  return data;
}