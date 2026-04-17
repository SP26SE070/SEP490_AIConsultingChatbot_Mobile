import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'auth_access_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';
const USER_KEY = 'auth_user';

export async function setAuth(data: any): Promise<void> {
  if (!data.accessToken || !data.refreshToken) return;
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, data.accessToken);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, data.refreshToken);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify({
    id: data.id,
    email: data.email,
    tenantId: data.tenantId,
    roles: data.roles,
    permissions: data.permissions ?? [],
  }));
}

export async function getAccessToken(): Promise<string | null> {
  return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function getUser(): Promise<any | null> {
  const raw = await SecureStore.getItemAsync(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function clearAuth(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
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
