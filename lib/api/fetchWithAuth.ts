import { getAccessToken, clearAuth } from '../auth-store';
import { router } from 'expo-router';

export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getAccessToken();

  const headers = {
    ...options.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(url, { ...options, headers });

  // Handle session expiry
  if (res.status === 401) {
    const cloned = res.clone();
    try {
      const data = await cloned.json();
      if (
        data?.error?.includes('Session expired') ||
        data?.message?.includes('Session expired')
      ) {
        await clearAuth();
        router.replace('/login');
        return res;
      }
    } catch {
      // not JSON, continue
    }
  }

  return res;
}