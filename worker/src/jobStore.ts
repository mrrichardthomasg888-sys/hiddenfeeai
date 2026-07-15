import type { Job, JobStore, JobStatus } from "./types.js";

const JOB_TTL_MS = 60 * 60 * 1000; // 1 hour
const jobs = new Map<string, Job>();

/**
 * In-memory Map-based job store (for local development).
 * Implements the JobStore interface for easy swapping with KV/Durable Objects.
 */
export const memoryStore: JobStore = {
  createJob(auditId: string, fileName: string): Job {
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

  getJob(auditId: string): Job | undefined {
    purgeExpiredJobs();
    return jobs.get(auditId);
  },

  updateJob(auditId: string, patch: Partial<Job>): Job | undefined {
    const existing = jobs.get(auditId);
    if (!existing) return undefined;
    const updated = { ...existing, ...patch };
    jobs.set(auditId, updated);
    return updated;
  },

  deleteJob(auditId: string): void {
    jobs.delete(auditId);
  },
};

function purgeExpiredJobs() {
  const now = Date.now();
  for (const [id, job] of jobs.entries()) {
    if (now - job.createdAt > JOB_TTL_MS) {
      jobs.delete(id);
    }
  }
}

// Backwards-compatible named exports (delegate to memoryStore)
export function createJob(auditId: string, fileName: string): Job {
  return memoryStore.createJob(auditId, fileName);
}

export function getJob(auditId: string): Job | undefined {
  return memoryStore.getJob(auditId);
}

export function updateJob(auditId: string, patch: Partial<Job>): Job | undefined {
  return memoryStore.updateJob(auditId, patch);
}

export function deleteJob(auditId: string): void {
  memoryStore.deleteJob(auditId);
}

export function getJobCount(): number {
  purgeExpiredJobs();
  return jobs.size;
}

// Default export is the memory store (can be swapped)
export default memoryStore;
