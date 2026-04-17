import { CHATBOT_BASE } from './config';
import { fetchWithAuth } from './fetchWithAuth';

export async function sendMessage(message: string, conversationId?: string) {
  const res = await fetchWithAuth(`${CHATBOT_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, conversationId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Chat failed');
  return data;
}

export async function getConversations() {
  const res = await fetchWithAuth(`${CHATBOT_BASE}/history`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load conversations');
  return data;
}

export async function getConversationHistory(conversationId: string) {
  const res = await fetchWithAuth(`${CHATBOT_BASE}/history/${conversationId}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load conversation');
  return data;
}

export async function rateMessage(messageId: string, rating: 'helpful' | 'not-helpful') {
  const numericRating = rating === 'helpful' ? 5 : 1;
  await fetchWithAuth(`${CHATBOT_BASE}/messages/${messageId}/rate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rating: numericRating }),
  });
}