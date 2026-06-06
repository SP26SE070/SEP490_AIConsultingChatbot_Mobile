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

export async function fetchJsonWithAuth<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetchWithAuth(url, options);
  
  const text = await res.text();
  
  // Check if response is HTML (not authenticated or error page)
  if (text.trim().startsWith('<')) {
    if (text.includes('login') || text.includes('Login')) {
      throw { status: 401, message: 'Vui lòng đăng nhập lại' };
    }
    throw { status: res.status, message: 'Lỗi server' };
  }
  
  try {
    const data = JSON.parse(text);
    if (!res.ok) throw { status: res.status, message: data.message || 'Lỗi API' };
    return data;
  } catch (e) {
    if (e.status) throw e;
    throw { status: 500, message: 'Không thể đọc phản hồi' };
  }
}
