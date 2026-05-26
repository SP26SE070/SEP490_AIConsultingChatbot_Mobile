import { API_BASE_URL } from './config';
import { fetchJsonWithAuth } from './fetchWithAuth';

const STAFF_BASE = `${API_BASE_URL}/api/v1/staff`;

export async function getTenants(status?: string) {
  const url = status
    ? `${STAFF_BASE}/tenants?status=${status}`
    : `${STAFF_BASE}/tenants`;
  return await fetchJsonWithAuth(url);
}

export async function approveTenant(tenantId: string) {
  return await fetchJsonWithAuth(`${STAFF_BASE}/tenants/${tenantId}/approve`, {
    method: 'PUT',
  });
}

export async function rejectTenant(tenantId: string, reason: string) {
  return await fetchJsonWithAuth(`${STAFF_BASE}/tenants/${tenantId}/reject`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
}
