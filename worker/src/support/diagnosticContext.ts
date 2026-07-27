export interface DiagnosticInfo { auditId: string; status: string; pipeline: string; extractionMethod: string; pageCount: number; processingTimeMs: number; errorCategory: string | null; timestamp: string; }
const diagnostics: DiagnosticInfo[] = []; const MAX = 200;

export function recordDiagnostic(d: DiagnosticInfo): void { diagnostics.push(d); while (diagnostics.length > MAX) diagnostics.shift(); }
export function getDiagnostic(auditId: string): DiagnosticInfo | undefined { return diagnostics.find(d => d.auditId === auditId); }