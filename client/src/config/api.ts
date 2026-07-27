/**
 * Environment-aware API URL configuration.
 *
 * Development:       Uses relative paths (/api/...) that go through Vite proxy → localhost:8787
 * Production:        Uses VITE_API_URL env var (Cloudflare Worker URL)
 *                     or falls back to same-origin /api for Pages Functions
 */

function isProd(): boolean {
  // import.meta.env.DEV is true during `vite dev`, false during `vite build`
  // For Android/Capacitor builds this will always be production
  try {
    return import.meta.env.PROD;
  } catch {
    return true;
  }
}

export function apiUrl(path: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  // In dev mode, use relative URLs to hit the Vite proxy (localhost:5173 → localhost:8787)
  if (!isProd()) {
    return `/api${cleanPath}`;
  }
  // In production, use the full Worker URL
  const baseUrl = import.meta.env.VITE_API_URL || "https://hiddenfeeai-worker.mr-richardthomasg888.workers.dev";
  return `${baseUrl}/api${cleanPath}`;
}

export function apiActionUrl(path: string): string {
  return apiUrl(path);
}