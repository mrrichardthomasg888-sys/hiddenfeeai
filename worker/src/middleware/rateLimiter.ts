import type { Context, Next } from "hono";
import type { Env } from "../types.js";

/**
 * Simple token-bucket rate limiter.
 * 
 * Tracks requests per IP using a sliding window approach.
 * In production, replace with Cloudflare's Rate Limiting product
 * or a Durable Object-backed counter for persistence across Workers.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const DEFAULT_MAX_REQUESTS = 10;  // per minute per IP
const DEFAULT_WINDOW_MS = 60_000; // 1 minute
const UPLOAD_MAX = 5;              // upload limit (stricter)
const ANALYZE_MAX = 3;             // analysis limit

// In-memory store (per Worker instance — resets on cold start)
const buckets = new Map<string, RateLimitEntry>();

// Cleanup is done inline in getBucket (Workers disallow setInterval in global scope)
function getBucket(key: string, maxRequests: number, windowMs: number): RateLimitEntry {
  const now = Date.now();
  
  // Clean up expired entries inline (no setInterval allowed in Worker global scope)
  for (const [k, e] of buckets) {
    if (now > e.resetAt) buckets.delete(k);
  }
  
  let entry = buckets.get(key);

  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs };
    buckets.set(key, entry);
  }

  return entry;
}

/**
 * Rate limiting middleware for general API routes.
 */
export async function rateLimiter(c: Context<{ Bindings: Env }>, next: Next) {
  const ip = c.req.header("CF-Connecting-IP") || 
             c.req.header("X-Forwarded-For") || 
             c.req.header("X-Real-IP") || 
             "unknown";
  
  const bucket = getBucket(ip, DEFAULT_MAX_REQUESTS, DEFAULT_WINDOW_MS);
  bucket.count++;

  if (bucket.count > DEFAULT_MAX_REQUESTS) {
    return c.json({
      error: "Rate limit exceeded. Please wait before making another request.",
      retryAfter: Math.ceil((bucket.resetAt - Date.now()) / 1000),
    }, 429);
  }

  await next();
}

/**
 * Stricter rate limiting for upload endpoint.
 */
export async function uploadRateLimiter(c: Context<{ Bindings: Env }>, next: Next) {
  const ip = c.req.header("CF-Connecting-IP") || "unknown";
  const bucket = getBucket(`upload:${ip}`, UPLOAD_MAX, DEFAULT_WINDOW_MS);
  bucket.count++;

  if (bucket.count > UPLOAD_MAX) {
    return c.json({
      error: "Too many uploads. Please wait before uploading another document.",
      retryAfter: Math.ceil((bucket.resetAt - Date.now()) / 1000),
    }, 429);
  }

  await next();
}

/**
 * Stricter rate limiting for analysis endpoint.
 */
export async function analyzeRateLimiter(c: Context<{ Bindings: Env }>, next: Next) {
  const ip = c.req.header("CF-Connecting-IP") || "unknown";
  const bucket = getBucket(`analyze:${ip}`, ANALYZE_MAX, DEFAULT_WINDOW_MS);
  bucket.count++;

  if (bucket.count > ANALYZE_MAX) {
    return c.json({
      error: "Analysis queue full. Please wait for your current analysis to complete.",
      retryAfter: Math.ceil((bucket.resetAt - Date.now()) / 1000),
    }, 429);
  }

  await next();
}