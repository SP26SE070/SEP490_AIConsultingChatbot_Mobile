import { TENANT_ADMIN_BASE } from './config';
import { getAccessToken } from '../auth-store';
import { fetchJsonWithAuth } from './fetchWithAuth';

export type ChatbotMode = 'BALANCED' | 'STRICT' | 'FLEXIBLE';
export type EmbeddingProvider = 'GEMINI' | 'LOCAL';

export interface ChatbotConfigResponse {
  mode: ChatbotMode;
  embeddingProvider: EmbeddingProvider;
  logoUrl?: string;
}

export async function getChatbotConfig(): Promise<ChatbotConfigResponse> {
  return await fetchJsonWithAuth(`${TENANT_ADMIN_BASE}/chatbot/config`);
}

export async function updateChatbotConfig(
  payload: { mode: ChatbotMode; embeddingProvider: EmbeddingProvider }
): Promise<ChatbotConfigResponse> {
  const token = await getAccessToken();
  const res = await fetch(`${TENANT_ADMIN_BASE}/chatbot/config`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || 'Failed to update chatbot config');
  }
  return res.json();
}
