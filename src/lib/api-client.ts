// Client-side API helpers
import type { SafeUser } from "./auth";

export async function api<T = any>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || `Request failed: ${res.status}`);
  }
  return data as T;
}

export async function login(email: string, password: string) {
  return api<{ user: SafeUser }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function logout() {
  return api("/api/auth/logout", { method: "POST" });
}

export async function getMe() {
  return api<{ user: SafeUser | null }>("/api/auth/me");
}
