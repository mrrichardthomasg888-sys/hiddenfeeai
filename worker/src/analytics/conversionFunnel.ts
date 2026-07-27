export type FunnelStage = 'visit' | 'upload_started' | 'upload_completed' | 'payment_started' | 'payment_completed' | 'report_viewed' | 'pdf_downloaded' | 'feedback_submitted';

interface FunnelEntry { stage: FunnelStage; timestamp: string; }
const funnelLog: FunnelEntry[] = [];
const MAX = 2000;

export function recordFunnelEvent(stage: FunnelStage): void {
  funnelLog.push({ stage, timestamp: new Date().toISOString() });
  while (funnelLog.length > MAX) funnelLog.shift();
}

export function getConversionMetrics() {
  const count = (s: FunnelStage) => funnelLog.filter(e => e.stage === s).length;
  const uploads = count('upload_completed');
  const payments = count('payment_completed');
  const reports = count('report_viewed');
  const downloads = count('pdf_downloaded');
  return {
    totalVisits: count('visit'), uploads, payments, reports, downloads,
    uploadToPaymentRate: uploads > 0 ? Math.round((payments / uploads) * 100) : 0,
    paymentToReportRate: payments > 0 ? Math.round((reports / payments) * 100) : 0,
    reportToDownloadRate: reports > 0 ? Math.round((downloads / reports) * 100) : 0,
  };
}