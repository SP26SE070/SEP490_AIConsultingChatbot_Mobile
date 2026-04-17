import { KNOWLEDGE_BASE } from './config';
import { getAccessToken } from '../auth-store';

export async function getDocuments() {
  const token = await getAccessToken();
  const res = await fetch(`${KNOWLEDGE_BASE}/documents?page=0&size=20`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load documents');
  return data;
}

export async function getDocumentUrl(documentId: string): Promise<string> {
  const token = await getAccessToken();
  const res = await fetch(`${KNOWLEDGE_BASE}/documents/${documentId}/url`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error('Failed to get document URL');
  return data.url;
}
