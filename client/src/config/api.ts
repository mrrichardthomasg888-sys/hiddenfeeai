/**
 * Environment-aware API URL configuration.
 *
 * Development:       Uses the Vite proxy (/api → http://localhost:8787)
 * Production:        Uses VITE_API_URL env var (Cloudflare Worker URL)
 *                     or falls back to same-origin /api for Pages Functions
 */

export const API_URL: string =
  import.meta.env.VITE_API_URL || "";

export function apiUrl(path: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_URL}/api${cleanPath}`;
}

export function apiActionUrl(path: string): string {
  return apiUrl(path);
}