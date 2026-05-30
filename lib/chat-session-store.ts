import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const CHAT_SESSION_KEY = 'chat_session_state';

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

export async function saveChatSession(session: ChatSession): Promise<void> {
  try {
    const sessionWithTimestamp = {
      ...session,
      lastUpdated: Date.now(),
    };
    await storage.setItem(CHAT_SESSION_KEY, JSON.stringify(sessionWithTimestamp));
  } catch (e) {
    console.warn('Failed to save chat session:', e);
  }
}

export async function loadChatSession(): Promise<ChatSession | null> {
  try {
    const raw = await storage.getItem(CHAT_SESSION_KEY);
    if (!raw) return null;

    const session: ChatSession = JSON.parse(raw);

    // Check if session is expired
    const now = Date.now();
    if (now - session.lastUpdated > SESSION_EXPIRY_MS) {
      await clearChatSession();
      return null;
    }

    return session;
  } catch (e) {
    console.warn('Failed to load chat session:', e);
    return null;
  }
}

export async function clearChatSession(): Promise<void> {
  try {
    await storage.deleteItem(CHAT_SESSION_KEY);
  } catch (e) {
    console.warn('Failed to clear chat session:', e);
  }
}

export async function getChatSessionConversationId(): Promise<string | undefined> {
  const session = await loadChatSession();
  return session?.conversationId;
}
