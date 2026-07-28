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

  // ── File diagnostics logging (for debugging mobile upload issues) ──
  const fileMimeType = file.type || 'unknown';
  console.log(`[Upload Diagnostics] fileName="${fileName}" mimeType="${fileMimeType}" fileSize=${file.size} bytes`);

  // Detect actual format from magic bytes (more reliable than MIME type from device)
  const arr = new Uint8Array(buffer.slice(0, 12));
  const hexHeader = Array.from(arr.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join(' ');
  console.log(`[Upload Diagnostics] Magic bytes (first 8): ${hexHeader}`);

  let detectedFormat = 'unknown';
  if (arr[0] === 0xFF && arr[1] === 0xD8 && arr[2] === 0xFF) detectedFormat = 'JPEG';
  else if (arr[0] === 0x89 && arr[1] === 0x50 && arr[2] === 0x4E && arr[3] === 0x47) detectedFormat = 'PNG';
  else if (arr[0] === 0x52 && arr[1] === 0x49 && arr[2] === 0x46 && arr[3] === 0x46) detectedFormat = 'WEBP';
  else if (arr[4] === 0x66 && arr[5] === 0x74 && arr[6] === 0x79 && arr[7] === 0x70) {
    const brand = new TextDecoder().decode(arr.slice(8, 12)).toLowerCase();
    detectedFormat = brand.toUpperCase(); // HEIC, HEIF, HEIX, HEVC
  }
  else if (arr[0] === 0x25 && arr[1] === 0x50 && arr[2] === 0x44 && arr[3] === 0x46) detectedFormat = 'PDF';
  console.log(`[Upload Diagnostics] Detected format: ${detectedFormat}`);

  // For images, try to log dimensions
  if (['JPEG', 'PNG', 'WEBP', 'HEIC', 'HEIF'].includes(detectedFormat)) {
    try {
      const blob = new Blob([buffer]);
      const bitmap = await createImageBitmap(blob);
      console.log(`[Upload Diagnostics] Image dimensions: ${bitmap.width}x${bitmap.height}`);
      bitmap.close();
    } catch {
      console.log(`[Upload Diagnostics] Could not decode image dimensions (format may be unsupported: ${detectedFormat})`);
    }
  }

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
          console.log(`[EXTRACTION_STARTED] auditId=${auditId} pipeline=new-deepseek fileName="${fileName}"`);
          const result = await processor.process(buffer, fileName);
          console.log(`[OCR_COMPLETE] auditId=${auditId} textLength=${result.fullText.length} pages=${result.pageCount} confidence=${result.extractionConfidence.toFixed(2)}`);

          // Circuit breaker
          if (result.extractionConfidence < 0.5) {
            console.log(`[JOB_UPDATE] auditId=${auditId} status=error (low confidence)`);
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

          console.log(`[JOB_UPDATE] auditId=${auditId} status=extracted`);
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
          console.log(`[EXTRACTION_COMPLETE] auditId=${auditId} status=extracted`);
        } else {
          // ── LEGACY PIPELINE ──
          console.log(`[EXTRACTION_STARTED] auditId=${auditId} pipeline=legacy fileName="${fileName}"`);
          const result = await extractTextLegacy(buffer, fileName, c.env);
          console.log(`[OCR_COMPLETE] auditId=${auditId} textLength=${result.text.length} method=${result.extractionMethod}`);
          console.log(`[JOB_UPDATE] auditId=${auditId} status=extracted`);
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
          console.log(`[EXTRACTION_COMPLETE] auditId=${auditId} status=extracted`);
        }
      } catch (extractError) {
        console.error(`[EXTRACTION_FAILED] auditId=${auditId} error="${extractError instanceof Error ? extractError.message : 'unknown'}"`);
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
