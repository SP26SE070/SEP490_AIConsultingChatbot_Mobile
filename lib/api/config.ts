import { Platform } from "react-native";

// Android emulator: 10.0.2.2 = host machine localhost
export const API_BASE_URL =
  Platform.OS === "android" ? "http://10.0.2.2:8080" : "http://localhost:8080";
export const AUTH_BASE = `${API_BASE_URL}/api/v1/auth`;
export const CHATBOT_BASE = `${API_BASE_URL}/api/v1/chatbot`;
export const KNOWLEDGE_BASE = `${API_BASE_URL}/api/v1/knowledge`;
export const CATEGORIES_BASE = `${KNOWLEDGE_BASE}/categories`;
export const TAGS_BASE = `${KNOWLEDGE_BASE}/tags`;
export const DEPARTMENTS_BASE = `${API_BASE_URL}/api/v1/departments`;
export const ROLES_BASE = `${API_BASE_URL}/api/v1/roles`;
export const TENANT_ADMIN_BASE = `${API_BASE_URL}/api/v1/tenant-admin`;
