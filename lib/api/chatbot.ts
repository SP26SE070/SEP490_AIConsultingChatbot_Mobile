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
  const res = await fetch(`${CHATBOT_BASE}/history`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load conversations');
  return data;
}

export async function rateMessage(messageId: string, rating: 'helpful' | 'not-helpful') {
  const token = await getAccessToken();
  const numericRating = rating === 'helpful' ? 5 : 1;
  await fetch(`${CHATBOT_BASE}/messages/${messageId}/rate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ rating: numericRating }),
  });
}
