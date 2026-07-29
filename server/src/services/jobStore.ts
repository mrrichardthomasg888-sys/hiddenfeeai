import type { Job } from "@/types/audit.js";

// Ephemeral in-memory job store.
// Per the privacy-first architecture: NO user accounts, NO document history.
// Jobs are transient session state only (upload → pay → analyze → deliver),
// auto-purged after TTL regardless of whether the report was downloaded.

const JOB_TTL_MS = 60 * 60 * 1000; // 1 hour

const jobs = new Map<string, Job>();

export function createJob(auditId: string, fileName: string): Job {
  const job: Job = {
    auditId,
    status: "uploading",
    fileName,
    paid: false,
    createdAt: Date.now(),
  };
  jobs.set(auditId, job);
  return job;
}

export function getJob(auditId: string): Job | undefined {
  return jobs.get(auditId);
}

export function updateJob(auditId: string, patch: Partial<Job>): Job | undefined {
  const existing = jobs.get(auditId);
  if (!existing) return undefined;
  const updated = { ...existing, ...patch };
  jobs.set(auditId, updated);
  return updated;
}

export function deleteJob(auditId: string): void {
  jobs.delete(auditId);
}

function purgeExpiredJobs() {
  const now = Date.now();
  for (const [id, job] of jobs.entries()) {
    if (now - job.createdAt > JOB_TTL_MS) {
      jobs.delete(id);
    }
  }
}

// Sweep every 5 minutes for expired ephemeral jobs.
setInterval(purgeExpiredJobs, 5 * 60 * 1000).unref();
