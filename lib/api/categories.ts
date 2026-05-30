import { CATEGORIES_BASE } from './config';
import { getAccessToken } from '../auth-store';

export interface DocumentCategoryResponse {
  id: string;
  tenantId: string;
  parentId: string | null;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  children?: DocumentCategoryResponse[];
}

export interface CreateCategoryRequest {
  name: string;
  code: string;
  description?: string | null;
  parentId?: string | null;
}

export interface UpdateCategoryRequest {
  name: string;
  code: string;
  description?: string | null;
  parentId?: string | null;
  isActive: boolean;
}

// Get flat list for management
export async function listCategoriesManage(): Promise<DocumentCategoryResponse[]> {
  const token = await getAccessToken();
  const res = await fetch(`${CATEGORIES_BASE}/manage`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch categories');
  return res.json();
}

// Get tree view
export async function listCategoriesTree(): Promise<DocumentCategoryResponse[]> {
  const token = await getAccessToken();
  const res = await fetch(`${CATEGORIES_BASE}/tree`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch category tree');
  return res.json();
}

// Create category
export async function createCategory(body: CreateCategoryRequest): Promise<DocumentCategoryResponse> {
  const token = await getAccessToken();
  const res = await fetch(`${CATEGORIES_BASE}/create`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to create category');
  return data;
}

// Update category
export async function updateCategory(id: string, body: UpdateCategoryRequest): Promise<DocumentCategoryResponse> {
  const token = await getAccessToken();
  const res = await fetch(`${CATEGORIES_BASE}/update/${id}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update category');
  return data;
}

// Deactivate category
export async function deactivateCategory(id: string): Promise<void> {
  const token = await getAccessToken();
  const res = await fetch(`${CATEGORIES_BASE}/${id}/deactivate`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to deactivate category');
}

// Activate category
export async function activateCategory(id: string): Promise<void> {
  const token = await getAccessToken();
  const res = await fetch(`${CATEGORIES_BASE}/${id}/activate`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to activate category');
}

// Delete category permanently
export async function deleteCategory(id: string): Promise<void> {
  const token = await getAccessToken();
  const res = await fetch(`${CATEGORIES_BASE}/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to delete category');
}
