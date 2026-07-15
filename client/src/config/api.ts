/**
 * Environment-aware API URL configuration.
 *
 * Development:       Uses the Vite proxy (/api → http://localhost:8787)
 * Production:        Uses VITE_API_URL env var (Cloudflare Worker URL)
 *                     or falls back to same-origin /api for Pages Functions
 */

export const API_URL: string =
  import.meta.env.VITE_API_URL || "/api";

/**
 * Helper to build a full API URL for fetch requests.
 * Works in both dev (proxied) and production (direct Worker URL).
 */
export function apiUrl(path: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_URL}${cleanPath}`;
}

/**
 * Helper to build a URL for browser navigation (e.g., PDF download).
 * In dev mode, uses the relative proxy path.
 * In production, navigates directly to the Worker URL.
 */
export function apiActionUrl(path: string): string {
  return apiUrl(path);
}