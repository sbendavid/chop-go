/**
 * apiClient.ts
 * Central HTTP client that replaces @/integrations/supabase/client
 *
 * Usage:
 *   import { api } from '@/lib/apiClient';
 *   const data = await api.get('/dishes');
 *   const data = await api.post('/auth/signin', { email, password });
 */

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api/v1";

// Token helpers

export const tokenStorage = {
  get: () => localStorage.getItem("access_token"),
  set: (token: string) => localStorage.setItem("access_token", token),
  clear: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  },
  getRefresh: () => localStorage.getItem("refresh_token"),
  setRefresh: (token: string) => localStorage.setItem("refresh_token", token),
};

export const refreshTokenStorage = {
  get: () => localStorage.getItem("refresh_token"),
  set: (token: string) => localStorage.setItem("refresh_token", token),
  clear: () => localStorage.removeItem("refresh_token"),
};
// Core fetch wrapper

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options: RequestInit = {},
): Promise<T> {
  const token = tokenStorage.get();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> | undefined),
  };

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...options,
  });

  // Auto-refresh on 401
  if (res.status === 401) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      // Retry the original request once with the new token
      return request<T>(method, path, body, options);
    }
    // Refresh failed — clear tokens and redirect to auth
    tokenStorage.clear();
    window.location.href = "/auth";
    throw new Error("Session expired");
  }

  if (!res.ok) {
    const errorBody = await res
      .json()
      .catch(() => ({ message: res.statusText }));
    throw new Error(errorBody?.message ?? `Request failed: ${res.status}`);
  }

  // 204 No Content
  if (res.status === 204) return undefined as unknown as T;

  return res.json() as Promise<T>;
}

async function tryRefreshToken(): Promise<boolean> {
  const refreshToken = tokenStorage.getRefresh();
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return false;

    const { access_token, refresh_token } = await res.json();
    tokenStorage.set(access_token);
    if (refresh_token) tokenStorage.setRefresh(refresh_token);
    return true;
  } catch {
    return false;
  }
}

// Public API object

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),

  /** Multipart file upload — skips JSON content-type so fetch sets boundary */
  upload: <T>(path: string, formData: FormData) =>
    request<T>("POST", path, undefined, {
      body: formData as unknown as BodyInit,
      headers: {} as Record<string, string>, // let fetch set Content-Type with boundary
    }),
};

export default api;
