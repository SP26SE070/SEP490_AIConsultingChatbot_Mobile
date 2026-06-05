import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export function getChatSessionKey(userId: string): string {
  return `chat_session_${userId}`;
}

interface ChatSession {
  conversationId?: string;
  messages: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    sources?: any[];
    rating?: 'helpful' | 'not-helpful' | null;
    responseTimeMs?: number;
  }>;
  lastUpdated: number;
}

// Platform-aware storage
const storage = {
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    } else {
      return await SecureStore.getItemAsync(key);
    }
  },
  async deleteItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  },
};

// Session expiry time: 30 minutes
const SESSION_EXPIRY_MS = 30 * 60 * 1000;

export async function saveChatSession(userId: string, session: ChatSession): Promise<void> {
  try {
    const sessionWithTimestamp = {
      ...session,
      lastUpdated: Date.now(),
    };
    await storage.setItem(getChatSessionKey(userId), JSON.stringify(sessionWithTimestamp));
  } catch (e) {
    console.warn('Failed to save chat session:', e);
  }
}

export async function loadChatSession(userId: string): Promise<ChatSession | null> {
  try {
    const raw = await storage.getItem(getChatSessionKey(userId));
    if (!raw) return null;

    const session: ChatSession = JSON.parse(raw);

    // Check if session is expired
    const now = Date.now();
    if (now - session.lastUpdated > SESSION_EXPIRY_MS) {
      await clearChatSession(userId);
      return null;
    }

    return session;
  } catch (e) {
    console.warn('Failed to load chat session:', e);
    return null;
  }
}

export async function clearChatSession(userId: string): Promise<void> {
  try {
    await storage.deleteItem(getChatSessionKey(userId));
  } catch (e) {
    console.warn('Failed to clear chat session:', e);
  }
}

export async function getChatSessionConversationId(userId: string): Promise<string | undefined> {
  const session = await loadChatSession(userId);
  return session?.conversationId;
}
