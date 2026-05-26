import { Platform } from "react-native";

// Android emulator: 10.0.2.2 = host machine localhost
export const API_BASE_URL =
  Platform.OS === "android" ? "http://10.0.2.2:8080" : "http://localhost:8080";
export const AUTH_BASE = `${API_BASE_URL}/api/v1/auth`;
export const CHATBOT_BASE = `${API_BASE_URL}/api/v1/chatbot`;
export const KNOWLEDGE_BASE = `${API_BASE_URL}/api/v1/knowledge`;
export const TENANT_ADMIN_BASE = `${API_BASE_URL}/api/v1/tenant-admin`;
