import { API_BASE_URL, KNOWLEDGE_BASE } from './config';
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
  // Use download-proxy endpoint via backend
  const backendUrl = `${API_BASE_URL}/api/v1/knowledge/documents/${documentId}/download-proxy`;

  // Fetch through backend with auth, get blob, create object URL
  const res = await fetch(backendUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to get document');

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  return url;
}
