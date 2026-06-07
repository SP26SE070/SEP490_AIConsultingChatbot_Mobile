import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ACCESS_TOKEN_KEY = 'auth_access_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';
const USER_KEY = 'auth_user';
const MUST_CHANGE_PASSWORD_KEY = 'auth_must_change_password';

// Platform-aware storage wrapper
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
  await storage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
  await storage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
  await storage.setItem(USER_KEY, JSON.stringify({
    id: data.id,
    email: data.email,
    tenantId: data.tenantId,
    roles: data.roles,
    permissions: data.permissions ?? [],
  }));
  // Save mustChangePassword flag
  if (data.mustChangePassword !== undefined) {
    await storage.setItem(MUST_CHANGE_PASSWORD_KEY, String(data.mustChangePassword));
  }
}

export async function getAccessToken(): Promise<string | null> {
  return await storage.getItem(ACCESS_TOKEN_KEY);
}

export async function getUser(): Promise<any | null> {
  const raw = await storage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function clearAuth(): Promise<void> {
  await storage.deleteItem(ACCESS_TOKEN_KEY);
  await storage.deleteItem(REFRESH_TOKEN_KEY);
  await storage.deleteItem(USER_KEY);
  await storage.deleteItem(MUST_CHANGE_PASSWORD_KEY);
}

export async function getUserRoles(): Promise<string[]> {
  const user = await getUser();
  return user?.roles ?? [];
}

export async function hasPermission(permission: string): Promise<boolean> {
  const user = await getUser();
  const permissions: string[] = user?.permissions ?? [];
  const roles: string[] = user?.roles ?? [];
  // Check both permissions array and roles
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
