import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { fetchJsonWithAuth } from './api/fetchWithAuth';
import { API_BASE_URL } from './api/config';

const REFRESH_TOKEN_KEY = 'auth_refresh_token';
const USER_KEY = 'auth_user';
const MUST_CHANGE_PASSWORD_KEY = 'auth_must_change_password';

// Access token stored in MEMORY only - cleared when app restarts
let _accessToken: string | null = null;

// Platform-aware storage for persistent data (refresh token, user info)
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

export async function setAuth(data: any): Promise<void> {
  if (!data.accessToken || !data.refreshToken) return;
  
  // Store access token in memory (session only)
  _accessToken = data.accessToken;
  
  // Store refresh token persistently
  await storage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
  await storage.setItem(USER_KEY, JSON.stringify({
    id: data.id,
    email: data.email,
    tenantId: data.tenantId,
    roles: data.roles,
    permissions: data.permissions ?? [],
  }));
  if (data.mustChangePassword !== undefined) {
    await storage.setItem(MUST_CHANGE_PASSWORD_KEY, String(data.mustChangePassword));
  }
}

export async function getAccessToken(): Promise<string | null> {
  return _accessToken;
}

export async function setAccessToken(token: string): Promise<void> {
  _accessToken = token;
}

export async function getUser(): Promise<any | null> {
  const raw = await storage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function clearAuth(): Promise<void> {
  _accessToken = null;
  await storage.deleteItem(REFRESH_TOKEN_KEY);
  await storage.deleteItem(USER_KEY);
  await storage.deleteItem(MUST_CHANGE_PASSWORD_KEY);
}

export async function getUserRoles(): Promise<string[]> {
  const user = await getUser();
  return user?.roles ?? [];
}

export async function getUserPermissions(): Promise<string[]> {
  const user = await getUser();
  return user?.permissions ?? [];
}

export async function hasPermission(permission: string): Promise<boolean> {
  const user = await getUser();
  const permissions: string[] = user?.permissions ?? [];
  const roles: string[] = user?.roles ?? [];
  return permissions.includes(permission) || roles.includes(permission);
}

export async function isRole(role: string): Promise<boolean> {
  const roles = await getUserRoles();
  return roles.includes(role);
}

export async function mustChangePassword(): Promise<boolean> {
  const value = await storage.getItem(MUST_CHANGE_PASSWORD_KEY);
  return value === 'true';
}

export async function clearMustChangePasswordFlag(): Promise<void> {
  await storage.deleteItem(MUST_CHANGE_PASSWORD_KEY);
}

// Refresh user data from backend (permissions may have been updated by admin)
export async function refreshUser(): Promise<void> {
  try {
    const permData = await fetchJsonWithAuth(`${API_BASE_URL}/api/v1/profile/permissions`);
    if (permData?.permissions) {
      const currentUser = await getUser();
      await storage.setItem(USER_KEY, JSON.stringify({
        ...currentUser,
        permissions: permData.permissions,
      }));
    }
  } catch (_e) {
    // Silently fail — permissions will be stale but app still works
  }
}
