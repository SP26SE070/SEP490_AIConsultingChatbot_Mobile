import { CHATBOT_BASE } from './config';
import { getAccessToken } from '../auth-store';

export async function sendMessage(message: string, conversationId?: string) {
  const token = await getAccessToken();
  const res = await fetch(`${CHATBOT_BASE}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ message, conversationId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Chat failed');
  return data;
}

export async function getConversations() {
  const token = await getAccessToken();
  const res = await fetch(`${CHATBOT_BASE}/conversations`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}
