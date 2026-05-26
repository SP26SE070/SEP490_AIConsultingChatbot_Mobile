import { API_BASE_URL, KNOWLEDGE_BASE } from './config';
import { getAccessToken } from '../auth-store';
import { fetchJsonWithAuth } from './fetchWithAuth';

export async function getDocuments() {
  return await fetchJsonWithAuth(`${KNOWLEDGE_BASE}/documents?page=0&size=20`);
}

export async function getDocumentUrl(documentId: string): Promise<string> {
  const token = await getAccessToken();
  return `${API_BASE_URL}/api/v1/knowledge/documents/${documentId}/download-proxy?token=${token}`;
}

export async function uploadDocument(file: {
  uri: string;
  name: string;
  mimeType?: string;
}, title: string, minimumRoleLevel: number = 4): Promise<any> {
  const token = await getAccessToken();
  const formData = new FormData();
  formData.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.mimeType || 'application/octet-stream',
  } as any);
  formData.append('documentTitle', title);
  formData.append('minimumRoleLevel', String(minimumRoleLevel));

  const res = await fetch(`${KNOWLEDGE_BASE}/documents/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Upload failed');
  return data;
}
