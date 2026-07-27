import type { Job, JobStore, JobStatus } from "./types.js";
import { createJobStore } from "./services/productionJobStore.js";

// ── Active store (set during worker initialization) ────────────────────────
let activeStore: JobStore | null = null;

/**
 * Initialize the job store. Call once at worker startup.
 * Uses KV when available, falls back to in-memory for local dev.
 */
export function initJobStore(env: { ANALYSIS_KV?: KVNamespace }): JobStore {
  activeStore = createJobStore(env as any);
  return activeStore;
}

/**
 * Get the active store. Must call initJobStore() first.
 * Falls back to memoryStore if not initialized (lazy init for dev).
 */
function getStore(): JobStore {
  if (!activeStore) {
    // Lazy init: create in-memory fallback
    const JOB_TTL_MS = 60 * 60 * 1000;
    const jobs = new Map<string, Job>();
    activeStore = {
      createJob(auditId, fileName) {
        const job: Job = { auditId, status: "uploading", fileName, paid: false, createdAt: Date.now() };
        jobs.set(auditId, job);
        return job;
      },
      getJob(auditId) {
        const job = jobs.get(auditId);
        if (job && Date.now() - job.createdAt > JOB_TTL_MS) { jobs.delete(auditId); return undefined; }
        return job;
      },
      updateJob(auditId, patch) {
        const existing = jobs.get(auditId);
        if (!existing) return undefined;
        const updated = { ...existing, ...patch };
        jobs.set(auditId, updated);
        return updated;
      },
      deleteJob(auditId) { jobs.delete(auditId); },
    };
  }
  return activeStore;
}

// ── Exported functions (delegate to active store) ──────────────────────────
// All functions are async to support both sync (in-memory) and async (KV) stores.
// Awaiting a sync return value is a no-op, so this is safe for both.

export async function createJob(auditId: string, fileName: string): Promise<Job> {
  return getStore().createJob(auditId, fileName);
}

export async function getJob(auditId: string): Promise<Job | undefined> {
  return getStore().getJob(auditId);
}

export async function updateJob(auditId: string, patch: Partial<Job>): Promise<Job | undefined> {
  return getStore().updateJob(auditId, patch);
}

export async function deleteJob(auditId: string): Promise<void> {
  return getStore().deleteJob(auditId);
}

export function getJobCount(): number {
  // Not implemented for KV store — returns job count for diagnostics
  return 0;
}

// Default export
export default { createJob, getJob, updateJob, deleteJob, initJobStore, getJobCount };
