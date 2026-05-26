import { CHATBOT_BASE } from './config';
import { fetchJsonWithAuth } from './fetchWithAuth';

export async function sendMessage(message: string, conversationId?: string) {
  return await fetchJsonWithAuth(`${CHATBOT_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, conversationId }),
  });
}

export async function getConversations() {
  return await fetchJsonWithAuth(`${CHATBOT_BASE}/history`);
}

export async function getConversationHistory(conversationId: string) {
  return await fetchJsonWithAuth(`${CHATBOT_BASE}/history/${conversationId}`);
}

export async function rateMessage(messageId: string, rating: 'helpful' | 'not-helpful') {
  const numericRating = rating === 'helpful' ? 5 : 1;
  await fetchJsonWithAuth(`${CHATBOT_BASE}/messages/${messageId}/rate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rating: numericRating }),
  });
}
