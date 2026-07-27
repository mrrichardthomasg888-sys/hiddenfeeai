/**
 * Processing Cost Optimizer
 * 
 * Makes intelligent routing decisions to minimize AI costs
 * while maintaining analysis quality.
 * 
 * Decisions:
 * - Docling vs DeepSeek Vision vs Native extraction
 * - Full analysis vs simplified pass
 * - OCR only when needed
 * - Token budget management
 */

export interface ProcessingDecision {
  useDocling: boolean;
  useOcr: boolean;
  useVision: boolean;
  useFullAnalysis: boolean;
  estimatedCostCents: number;
  reasoning: string;
}

/**
 * Determine the optimal processing path for a document.
 */
export function optimizeProcessing(params: {
  fileFormat: string;
  isDigital: boolean;
  needsOcr: boolean;
  pageCount: number;
  hasTables: boolean;
  documentQuality: string;
}): ProcessingDecision {
  const { fileFormat, isDigital, needsOcr, pageCount, hasTables, documentQuality } = params;

  // Docling is best for structured formats with tables
  const useDocling = ['pdf', 'docx', 'xlsx', 'pptx'].includes(fileFormat) &&
    documentQuality !== 'unusable';

  // OCR only when truly needed (scanned docs, images)
  const useOcr = needsOcr && !isDigital;

  // Vision only as last resort (expensive)
  const useVision = !isDigital && needsOcr && documentQuality !== 'unusable';

  // Full analysis for contracts; simplified for simple receipts
  const useFullAnalysis = pageCount > 1 || hasTables ||
    ['pdf', 'docx', 'xlsx'].includes(fileFormat);

  // Cost estimation
  let costCents = 0;
  if (useDocling) costCents += 0.5; // ~$0.005
  if (useOcr) costCents += 2;       // ~$0.02
  if (useVision) costCents += 3;    // ~$0.03
  if (useFullAnalysis) costCents += pageCount * 0.4; // ~$0.004/page

  return {
    useDocling,
    useOcr,
    useVision,
    useFullAnalysis,
    estimatedCostCents: Math.round(costCents * 100) / 100,
    reasoning: useDocling
      ? `Docling for structured ${fileFormat.toUpperCase()} with ${pageCount} pages`
      : useVision
        ? `Vision OCR needed for scanned ${fileFormat.toUpperCase()}`
        : `Native extraction sufficient for this document`,
  };
}