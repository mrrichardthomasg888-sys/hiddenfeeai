import type { Job, JobStatus, JobStore, Env } from "../types.js";

/**
 * Production Job Store backed by Cloudflare KV.
 * 
 * Unlike the in-memory Map (which loses data on cold starts),
 * KV provides durable persistence across Worker instances.
 * 
 * Why KV (not Durable Objects):
 * - Simpler API, no class-based Actor model needed
 * - Eventually consistent reads (fine for job status polling)
 * - Lower cost for low-throughput workloads
 * - Built-in TTL/expiration
 * 
 * Durable Objects would be appropriate if we needed:
 * - Strong consistency for payment state machines
 * - WebSocket connections for real-time status
 * - Transactional updates across multiple keys
 */

const JOB_TTL_SECONDS = 3600; // 1 hour — auto-expire old jobs
const JOB_PREFIX = "job:";

// ── In-memory cache: eliminates KV eventual-consistency gap ──
// When updateJob writes new data, it stores the full Job object here.
// Subsequent getJob calls return the cached copy INSTEAD of reading
// potentially-stale KV data. This is safe because:
//   1. KV is the source of truth for durability across Workers
//   2. The cache is just a speed-of-light optimization for reads
//   3. Jobs are single-writer (one auditId = one update chain)
const jobCache = new Map<string, { job: Job; cachedAt: number }>();
const CACHE_TTL_MS = 120_000; // 2 minutes — long enough for any polling cycle

export class KvJobStore implements JobStore {
  constructor(private env: Env) {}

  private key(auditId: string): string {
    return `${JOB_PREFIX}${auditId}`;
  }

  async createJob(auditId: string, fileName: string): Promise<Job> {
    const job: Job = {
      auditId,
      status: "uploading",
      fileName,
      paid: false,
      createdAt: Date.now(),
    };

    // ── Cache immediately so subsequent getJob calls in the same request
    //     (and future requests to this same isolate) bypass KV propagation delay
    jobCache.set(auditId, { job, cachedAt: Date.now() });

    // Store in KV with TTL
    try {
      await this.env.ANALYSIS_KV?.put(
        this.key(auditId),
        JSON.stringify(job),
        { expirationTtl: JOB_TTL_SECONDS }
      );
      console.log(`[JobLifecycle] JOB_CREATED auditId=${auditId} fileName="${fileName}" stored=kv`);
    } catch (err) {
      console.error(`[KVJobStore] Failed to create job ${auditId}:`, err);
      // Job is in cache only — next request by another Worker isolate will miss
    }

    return job;
  }

  async getJob(auditId: string): Promise<Job | undefined> {
    // 1. Check in-memory cache first (bypasses KV eventual-consistency gap)
    const cached = jobCache.get(auditId);
    if (cached && (Date.now() - cached.cachedAt) < CACHE_TTL_MS) {
      return cached.job;
    }

    // 2. Fall back to KV
    try {
      const raw = await this.env.ANALYSIS_KV?.get(this.key(auditId));
      if (!raw) {
        // Clean up stale cache entry
        jobCache.delete(auditId);
        return undefined;
      }
      
      const job = JSON.parse(raw) as Job;
      
      // Check expiration
      if (Date.now() - job.createdAt > JOB_TTL_SECONDS * 1000) {
        jobCache.delete(auditId);
        await this.deleteJob(auditId);
        return undefined;
      }
      
      // Populate cache for next read
      jobCache.set(auditId, { job, cachedAt: Date.now() });
      return job;
    } catch (err) {
      console.error(`[KVJobStore] Failed to get job ${auditId}:`, err);
      return undefined;
    }
  }

  async updateJob(auditId: string, patch: Partial<Job>): Promise<Job | undefined> {
    try {
      const existing = await this.getJob(auditId);
      if (!existing) return undefined;

      const updated: Job = { ...existing, ...patch };

      // Write full job to KV — extractedText and extractedDocument are required
      // for the /start endpoint to trigger analysis on cross-isolate requests.
      // The user explicitly uploaded this data for paid analysis.
      // All jobs auto-expire after JOB_TTL_SECONDS (1 hour).
      await this.env.ANALYSIS_KV?.put(
        this.key(auditId),
        JSON.stringify(updated),
        { expirationTtl: JOB_TTL_SECONDS }
      );

      // ── Cache the full job (including report) so subsequent getJob calls
      //     return it instantly without waiting for KV eventual consistency
      jobCache.set(auditId, { job: updated, cachedAt: Date.now() });

      // Log when report is first persisted to KV (critical for debugging the completion flow)
      if (updated.status === "complete" && updated.report) {
        console.log(`[JobLifecycle] REPORT_WRITTEN_TO_KV auditId=${auditId} status=complete hasReport=true findings=${updated.report.findings?.length ?? "unknown"}`);
      }

      return updated;
    } catch (err) {
      console.error(`[KVJobStore] Failed to update job ${auditId}:`, err);
      return undefined;
    }
  }

  async deleteJob(auditId: string): Promise<void> {
    try {
      await this.env.ANALYSIS_KV?.delete(this.key(auditId));
    } catch (err) {
      console.error(`[KVJobStore] Failed to delete job ${auditId}:`, err);
    }
  }
}

/**
 * Hybrid job store: uses KV when available, falls back to in-memory Map.
 * This ensures local development works without KV binding configured.
 */
export function createJobStore(env: Env): JobStore {
  if (env.ANALYSIS_KV) {
    console.log('[JobStore] Using KV-backed production store');
    return new KvJobStore(env);
  }

  // ── PRODUCTION SAFETY CHECK ──
  // In production, KV is mandatory. Workers are stateless — without KV,
  // every request creates a fresh memory store and jobs are lost between requests.
  // This is the root cause of the "stuck on processing" production bug.
  if (env.ENVIRONMENT === "production") {
    const msg = "FATAL: Production storage unavailable. ANALYSIS_KV binding is missing from wrangler.toml. Jobs will be lost between requests. Deploy aborted.";
    console.error(`[JobStore] ${msg}`);
    throw new Error(msg);
  }

  console.log('[JobStore] KV not available — using in-memory store (dev mode)');
  
  // In-memory fallback (from existing jobStore.ts)
  const JOB_TTL_MS = 60 * 60 * 1000;
  const jobs = new Map<string, Job>();

  return {
    createJob(auditId, fileName) {
      const job: Job = {
        auditId,
        status: "uploading",
        fileName,
        paid: false,
        createdAt: Date.now(),
      };
      jobs.set(auditId, job);
      return job;
    },
    getJob(auditId) {
      const job = jobs.get(auditId);
      if (job && Date.now() - job.createdAt > JOB_TTL_MS) {
        jobs.delete(auditId);
        return undefined;
      }
      return job;
    },
    updateJob(auditId, patch) {
      const existing = jobs.get(auditId);
      if (!existing) return undefined;
      const updated = { ...existing, ...patch };
      jobs.set(auditId, updated);
      return updated;
    },
    deleteJob(auditId) {
      jobs.delete(auditId);
    },
  };
}