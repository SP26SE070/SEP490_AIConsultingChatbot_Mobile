import { API_BASE_URL, TENANT_ADMIN_BASE } from './config';
import { fetchJsonWithAuth } from './fetchWithAuth';

// ============ Types ============

export interface EmployeeUser {
  id: string;
  email: string;
  fullName?: string;
  phoneNumber?: string;
  isActive: boolean;
  roleId?: number;
  roleName?: string;
  departmentId?: string;
  departmentName?: string;
  createdAt: string;
  lastLoginAt?: string;
}

export interface CreateEmployeeRequest {
  email: string;
  fullName: string;
  phoneNumber?: string;
  departmentId?: string;
  roleId?: number;
}

export interface UpdateEmployeeRequest {
  fullName?: string;
  phoneNumber?: string;
  departmentId?: string;
  roleId?: number;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

// ============ API Functions ============

export async function getEmployees(status?: string, roleId?: number): Promise<EmployeeUser[]> {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (roleId) params.append('roleId', roleId.toString());
  const query = params.toString() ? `?${params.toString()}` : '';
  const data = await fetchJsonWithAuth(`${TENANT_ADMIN_BASE}/users${query}`);
  // Handle PageResponse or direct array
  if (data && typeof data === 'object' && 'content' in data) {
    return (data as PageResponse<EmployeeUser>).content;
  }
  if (Array.isArray(data)) return data;
  return [];
}

export async function getEmployeeById(userId: string): Promise<EmployeeUser> {
  return await fetchJsonWithAuth(`${TENANT_ADMIN_BASE}/users/${userId}`);
}

export async function createEmployee(request: CreateEmployeeRequest): Promise<EmployeeUser> {
  return await fetchJsonWithAuth(`${TENANT_ADMIN_BASE}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
}

export async function updateEmployee(userId: string, request: UpdateEmployeeRequest): Promise<EmployeeUser> {
  return await fetchJsonWithAuth(`${TENANT_ADMIN_BASE}/users/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
}

export async function activateEmployee(userId: string): Promise<EmployeeUser> {
  return await fetchJsonWithAuth(`${TENANT_ADMIN_BASE}/users/${userId}/activate`, {
    method: 'PUT',
  });
}

export async function deactivateEmployee(userId: string): Promise<EmployeeUser> {
  return await fetchJsonWithAuth(`${TENANT_ADMIN_BASE}/users/${userId}/deactivate`, {
    method: 'PUT',
  });
}

export async function deleteEmployee(userId: string): Promise<void> {
  await fetchJsonWithAuth(`${TENANT_ADMIN_BASE}/users/${userId}`, {
    method: 'DELETE',
  });
}

export async function resetEmployeePassword(userId: string): Promise<void> {
  await fetchJsonWithAuth(`${TENANT_ADMIN_BASE}/users/${userId}/reset-password`, {
    method: 'POST',
  });
}
