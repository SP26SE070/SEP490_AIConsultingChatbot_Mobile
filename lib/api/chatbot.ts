import { CHATBOT_BASE } from './config';
import { fetchJsonWithAuth } from './fetchWithAuth';

export interface SendMessageOptions {
  message: string;
  conversationId?: string;
  tagIds?: string[];
}

export async function sendMessage(options: SendMessageOptions) {
  const { message, conversationId, tagIds } = options;
  return await fetchJsonWithAuth(`${CHATBOT_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, conversationId, tagIds }),
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
