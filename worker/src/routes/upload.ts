import { Hono } from "hono";
import type { Env } from "../types.js";
import { createJob, updateJob } from "../jobStore.js";
import { extractText as extractTextLegacy, isAcceptedExtension as isAcceptedExtensionLegacy } from "../services/extractor.legacy.js";
import { DocumentProcessor, isAcceptedExtension } from "../services/documentProcessor.js";
import { parseWithDocling, shouldUseDocling } from "../services/doclingClient.js";
import { routeDocument } from "../router/documentRouter.js";
import type { DoclingError } from "../services/doclingClient.js";
import * as errors from "../utils/errors.js";

export const uploadRoute = new Hono<{ Bindings: Env }>();

uploadRoute.post("/", async (c) => {
  const maxMb = Number(c.env.MAX_UPLOAD_SIZE_MB || 25);

  const formData = await c.req.formData().catch(() => null);
  if (!formData) throw errors.badFile();

  const file = formData.get("file") as File | null;
  if (!file) throw errors.badFile();

  // Reject empty files before any processing
  if (file.size === 0) {
    throw errors.badFile("The uploaded file is empty. Please select a valid document.");
  }

  // Validate extension
  const fileName = file.name;
  const accepted = typeof isAcceptedExtension === "function"
    ? isAcceptedExtension(fileName)
    : isAcceptedExtensionLegacy(fileName);

  if (!accepted) {
    const ext = fileName.split(".").pop() ?? "";
    throw errors.unsupportedType("." + ext);
  }

  // Validate size
  if (file.size > maxMb * 1024 * 1024) {
    throw errors.tooLarge(maxMb);
  }

  const auditId = crypto.randomUUID();
  const job = await createJob(auditId, fileName);
  console.log(`[JobLifecycle] JOB_CREATED auditId=${auditId} fileName="${fileName}" fileSize=${file.size} status=uploading`);

  // Determine which pipeline to use
  const useNew = c.env.USE_NEW_PIPELINE === "true";
  const useV2 = c.env.USE_V2_PIPELINE === "true";
  const processor = useNew ? new DocumentProcessor(c.env) : null;

  // Read file buffer
  const buffer = await file.arrayBuffer();

  // Start extraction (async)
  c.executionCtx.waitUntil(
    (async () => {
      try {
        await updateJob(auditId, { status: "extracting" });

        // ──────────────────────────────────────────────
        // V2 PIPELINE: Docling → fallback to DeepSeek Vision
        // ──────────────────────────────────────────────
        if (useV2) {
          // Step 1: Route the document
          const routeResult = routeDocument(buffer, fileName);
          console.log(`[Upload V2] Routed: ${routeResult.fileFormat}, ` +
            `digital=${routeResult.isDigital}, needsOcr=${routeResult.needsOcr}, ` +
            `quality=${routeResult.documentQuality}`);

          // Step 2: Try Docling (if applicable)
          let structuredDoc = null;
          let usedDocling = false;

          if (shouldUseDocling(routeResult) && c.env.DOCLING_SERVICE_URL) {
            // ── Docling with exponential backoff retry ──
            let doclingAttempts = 0;
            const maxRetries = 2; // 1 initial + 1 retry
            for (let attempt = 0; attempt < maxRetries; attempt++) {
              try {
                doclingAttempts++;
                console.log(`[Upload V2] Docling attempt ${attempt + 1}/${maxRetries}...`);
                const doclingResult = await parseWithDocling(buffer, fileName, routeResult, c.env);
                structuredDoc = doclingResult.structuredDocument;
                usedDocling = true;
                console.log(`[Upload V2] Docling SUCCESS (attempt ${doclingAttempts}) — ${structuredDoc.pageCount} pages, ` +
                  `${structuredDoc.tables.length} tables, quality=${doclingResult.metadata.qualityLabel}`);
                break; // Success — exit retry loop
              } catch (doclingErr) {
                const dErr = doclingErr as DoclingError;
                const isLastAttempt = attempt === maxRetries - 1;
                if (isLastAttempt) {
                  console.warn(`[Upload V2] Docling FAILED after ${doclingAttempts} attempt(s) [${dErr.code}]: ${dErr.error}. Falling back to DeepSeek Vision.`);
                } else {
                  const backoffMs = Math.pow(2, attempt) * 500; // 500ms, 1000ms
                  console.warn(`[Upload V2] Docling attempt ${attempt + 1} FAILED [${dErr.code}]: ${dErr.error}. Retrying in ${backoffMs}ms...`);
                  await new Promise((resolve) => setTimeout(resolve, backoffMs));
                }
              }
            }
          } else {
            console.log(`[Upload V2] Docling not applicable for ${routeResult.fileFormat}. Using DeepSeek Vision.`);
          }

          // Step 3: Fallback to DocumentProcessor (DeepSeek Vision)
          if (!structuredDoc) {
            try {
              console.log(`[Upload V2] Using DeepSeek Vision fallback...`);
              const fallbackProcessor = new DocumentProcessor(c.env);
              const extracted = await fallbackProcessor.process(buffer, fileName);

              // Convert ExtractedDocument → StructuredDocument (lightweight conversion)
              structuredDoc = {
                fileName: extracted.fileName,
                fileFormat: extracted.fileType as any,
                pageCount: extracted.pageCount,
                markdown: extracted.fullText,
                elements: extracted.pages.map(p => ({
                  type: 'paragraph' as const,
                  pageNumber: p.pageNumber,
                  content: p.text,
                })),
                tables: (extracted.pages || []).flatMap(p =>
                  (p.tables || []).map(t => ({
                    pageNumber: p.pageNumber,
                    headers: t.length > 0 ? t[0].map(c => String(c)) : [],
                    rows: t.length > 1 ? t.slice(1) : [],
                    detectedAs: 'general' as const,
                  }))
                ),
                metadata: {
                  pageCount: extracted.pageCount,
                  language: routeResult.detectedLanguage,
                },
                routeResult,
                extractionMethod: 'deepseek-vision',
                extractionConfidence: extracted.extractionConfidence,
                warnings: extracted.warnings,
              };
            } catch (fallbackErr) {
              console.error(`[Upload V2] DeepSeek Vision fallback also failed:`, fallbackErr);
              throw fallbackErr;
            }
          }

          // Step 4: Circuit breaker
          if (structuredDoc.extractionConfidence < 0.3) {
            await updateJob(auditId, {
              status: "error",
              error: "We could not reliably read this document. Please upload a clearer image or PDF.",
              extractedDocument: structuredDoc as any,
              extractedText: structuredDoc.markdown,
              documentContext: {
                pages: structuredDoc.pageCount,
                lineItems: structuredDoc.markdown.split("\n").filter(l => l.trim()).length,
                fileType: structuredDoc.fileFormat,
                extractionMethod: usedDocling ? "docling" : "deepseek-vision",
                confidenceScore: Math.round(structuredDoc.extractionConfidence * 100),
              },
            });
            return;
          }

          // Step 5: Store result
          await updateJob(auditId, {
            status: "extracted",
            extractedText: structuredDoc.markdown,
            extractedDocument: structuredDoc as any,
            documentContext: {
              pages: structuredDoc.pageCount,
              lineItems: structuredDoc.markdown.split("\n").filter(l => l.trim()).length,
              fileType: structuredDoc.fileFormat,
              extractionMethod: usedDocling ? "docling" : "deepseek-vision",
              confidenceScore: Math.round(structuredDoc.extractionConfidence * 100),
            },
          });

          return;
        }

        // ──────────────────────────────────────────────
        // NEW PIPELINE: DeepSeek Vision (existing)
        // ──────────────────────────────────────────────
        if (useNew && processor) {
          const result = await processor.process(buffer, fileName);

          // Circuit breaker
          if (result.extractionConfidence < 0.5) {
            await updateJob(auditId, {
              status: "error",
              error: "We could not reliably read this document. Please upload a clearer image or PDF.",
              extractedDocument: result,
              documentContext: {
                pages: result.pageCount,
                lineItems: result.fullText.split("\n").filter(l => l.trim()).length,
                fileType: result.fileType,
                extractionMethod: "deepseek-vision",
                confidenceScore: Math.round(result.extractionConfidence * 100),
              },
            });
            return;
          }

          await updateJob(auditId, {
            status: "extracted",
            extractedText: result.fullText,
            extractedDocument: result,
            documentContext: {
              pages: result.pageCount,
              lineItems: result.fullText.split("\n").filter(l => l.trim()).length,
              fileType: result.fileType,
              extractionMethod: "deepseek-vision",
              confidenceScore: Math.round(result.extractionConfidence * 100),
            },
          });
        } else {
          // ── LEGACY PIPELINE ──
          const result = await extractTextLegacy(buffer, fileName, c.env);
          await updateJob(auditId, {
            status: "extracted",
            extractedText: result.text,
            documentContext: {
              pages: result.pages,
              lineItems: result.lineItems,
              fileType: result.fileType,
              extractionMethod: result.extractionMethod,
              confidenceScore: result.confidenceScore,
            },
          });
        }
      } catch (extractError) {
        await updateJob(auditId, {
          status: "error",
          error: extractError instanceof Error ? extractError.message : "Extraction failed",
        });
      }
    })()
  );

  return c.json({
    auditId,
    status: "uploading",
    fileName,
    fileSize: file.size,
  }, 202);
});
