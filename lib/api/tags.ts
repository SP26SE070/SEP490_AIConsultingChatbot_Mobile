import { TAGS_BASE } from './config';
import { getAccessToken } from '../auth-store';

export interface DocumentTagResponse {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  usageCount: number;
}

export interface CreateTagRequest {
  name: string;
  code: string;
  description?: string | null;
}

export interface UpdateTagRequest {
  name: string;
  code: string;
  description?: string | null;
  isActive: boolean;
}

// Get all tags for management
export async function listTagsManage(): Promise<DocumentTagResponse[]> {
  const token = await getAccessToken();
  const res = await fetch(`${TAGS_BASE}/manage`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch tags');
  return res.json();
}

// Create tag
export async function createTag(body: CreateTagRequest): Promise<DocumentTagResponse> {
  const token = await getAccessToken();
  const res = await fetch(`${TAGS_BASE}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to create tag');
  return data;
}

// Update tag
export async function updateTag(id: string, body: UpdateTagRequest): Promise<DocumentTagResponse> {
  const token = await getAccessToken();
  const res = await fetch(`${TAGS_BASE}/${id}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update tag');
  return data;
}

// Deactivate tag
export async function deactivateTag(id: string): Promise<void> {
  const token = await getAccessToken();
  const res = await fetch(`${TAGS_BASE}/${id}/deactivate`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to deactivate tag');
}

// Activate tag
export async function activateTag(id: string): Promise<void> {
  const token = await getAccessToken();
  const res = await fetch(`${TAGS_BASE}/${id}/activate`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to activate tag');
}

// Delete tag permanently
export async function deleteTag(id: string): Promise<void> {
  const token = await getAccessToken();
  const res = await fetch(`${TAGS_BASE}/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to delete tag');
}
