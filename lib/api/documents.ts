import { API_BASE_URL, KNOWLEDGE_BASE } from './config';
import { getAccessToken } from '../auth-store';
import { fetchWithAuth } from './fetchWithAuth';

export async function getDocuments() {
  const res = await fetchWithAuth(`${KNOWLEDGE_BASE}/documents?page=0&size=20`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load documents');
  return data;
}

export async function getDocumentUrl(documentId: string): Promise<string> {
  const token = await getAccessToken();
  return `${API_BASE_URL}/api/v1/knowledge/documents/${documentId}/download-proxy?token=${token}`;
}