import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const OLD_KEY = 'chat_session_state';

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key);
  }
  return await SecureStore.getItemAsync(key);
}

async function deleteItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.removeItem(key);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
}

export async function migrateOldChatSessionIfExists(): Promise<void> {
  try {
    const raw = await getItem(OLD_KEY);
    if (!raw) return;
    await deleteItem(OLD_KEY);
    console.log('Migrated old chat session data to new user-specific format');
  } catch (e) {
    console.warn('Failed to migrate old chat session:', e);
  }
}
