import { Platform } from 'react-native';

const RAILWAY_API_BASE = 'https://sp26se070internalchatbotbe-production.up.railway.app';
const LOCAL_ANDROID_API_BASE = 'http://10.0.2.2:8080';
const LOCAL_DEFAULT_API_BASE = 'http://localhost:8080';

function resolveApiBaseUrl() {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, '');

  if (__DEV__) {
    return Platform.OS === 'android' ? LOCAL_ANDROID_API_BASE : LOCAL_DEFAULT_API_BASE;
  }

  return RAILWAY_API_BASE;
}

export const API_BASE_URL = resolveApiBaseUrl();
export const AUTH_BASE = `${API_BASE_URL}/api/v1/auth`;
export const CHATBOT_BASE = `${API_BASE_URL}/api/v1/chatbot`;
export const KNOWLEDGE_BASE = `${API_BASE_URL}/api/v1/knowledge`;
export const CATEGORIES_BASE = `${KNOWLEDGE_BASE}/categories`;
export const TAGS_BASE = `${KNOWLEDGE_BASE}/tags`;
export const DEPARTMENTS_BASE = `${API_BASE_URL}/api/v1/departments`;
export const ROLES_BASE = `${API_BASE_URL}/api/v1/roles`;
export const TENANT_ADMIN_BASE = `${API_BASE_URL}/api/v1/tenant-admin`;
export const PAYMENT_BASE = `${API_BASE_URL}/api/v1/payment`;
