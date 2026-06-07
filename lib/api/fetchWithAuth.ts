import { getAccessToken } from '../auth-store';
import { router } from 'expo-router';

const DEFAULT_TIMEOUT = 15000;

function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Request timeout')), timeoutMs);
    fetch(url, options)
      .then(res => { clearTimeout(timer); resolve(res); })
      .catch(err => { clearTimeout(timer); reject(err); });
  });
}

export async function fetchWithAuth(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT
): Promise<Response> {
  const token = await getAccessToken();

  const headers = {
    ...options.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetchWithTimeout(url, { ...options, headers }, timeoutMs);

  if (res.status === 401) {
    const cloned = res.clone();
    try {
      const data = await cloned.json();
      if (
        data?.error?.includes('Session expired') ||
        data?.message?.includes('Session expired')
      ) {
        const { clearAuth } = await import('../auth-store');
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
  options: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT
): Promise<T> {
  const res = await fetchWithAuth(url, options, timeoutMs);

  const text = await res.text();

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
    if (e && typeof e === 'object' && 'status' in e) throw e;
    throw { status: 500, message: 'Không thể đọc phản hồi' };
  }
}
