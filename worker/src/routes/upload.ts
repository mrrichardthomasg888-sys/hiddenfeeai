import { Hono } from "hono";
import type { Env } from "../types.js";
import { createJob, updateJob } from "../jobStore.js";
import { extractText as extractTextLegacy, isAcceptedExtension as isAcceptedExtensionLegacy } from "../services/extractor.legacy.js";
import { DocumentProcessor, isAcceptedExtension } from "../services/documentProcessor.js";
import { parseWithDocling, shouldUseDocling } from "../services/doclingClient.js";
import { routeDocument } from "../router/documentRouter.js";
import type { DoclingError, DoclingResult } from "../services/doclingClient.js";
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

        // ── [EXTRACT_START] — Log extraction entry point details ──
        const fileMime = file.type || 'unknown';
        const fileSize = file.size;
        console.log(`[EXTRACT_START]
filename="${fileName}"
mime="${fileMime}"
size=${fileSize}
env.ENVIRONMENT=${c.env.ENVIRONMENT}
env.USE_V2_PIPELINE=${c.env.USE_V2_PIPELINE}
env.USE_NEW_PIPELINE=${c.env.USE_NEW_PIPELINE}`);

        // ──────────────────────────────────────────────
        // PIPELINE SELECTION LOGIC
        // Priority: V2 (Docling) → New (DeepSeek Vision) → Legacy
        // ──────────────────────────────────────────────

        let extractionSucceeded = false;
        let extractedText = '';
        let extractedDocument: any = null;
        let documentContext: any = null;

        if (useV2) {
          // ────────────────────────────────────────────
          // V2 PIPELINE: Try Docling, fallback on failure
          // ────────────────────────────────────────────
          const routeResult = routeDocument(buffer, fileName);
          let doclingResult: DoclingResult | null = null;

          // Check if Docling is even worth attempting
          const doclingAvailable = !!c.env.DOCLING_SERVICE_URL;
          const formatIsDoclingCompatible = shouldUseDocling(routeResult);

          if (doclingAvailable && formatIsDoclingCompatible) {
            const maxRetries = 2;
            for (let attempt = 0; attempt < maxRetries; attempt++) {
              try {
                console.log(`[DOCLING_REQUEST] attempt=${attempt + 1}/${maxRetries} url="${c.env.DOCLING_SERVICE_URL}/parse" bytes=${buffer.byteLength}`);
                const startTs = Date.now();
                const result = await parseWithDocling(buffer, fileName, routeResult, c.env);
                const durationMs = Date.now() - startTs;
                doclingResult = result;
                console.log(`[DOCLING_RESPONSE]
status=success
durationMs=${durationMs}
pageCount=${result.structuredDocument.pageCount}
tables=${result.structuredDocument.tables.length}
confidence=${result.structuredDocument.extractionConfidence}
qualityLabel=${result.metadata.qualityLabel}`);
                break;
              } catch (doclingErr) {
                const dErr = doclingErr as DoclingError;
                const stack = (doclingErr instanceof Error) ? (doclingErr.stack || '(no stack)') : '(not an Error)';
                console.error(`[DOCLING_ERROR]
attempt=${attempt + 1}/${maxRetries}
code=${dErr.code}
message=${dErr.error}
retryable=${dErr.retryable}
stack=${stack}`);

                if (attempt === maxRetries - 1) {
                  console.error(`[DOCLING_FAILURE]
reason="Docling failed after ${maxRetries} attempts"
code=${dErr.code}
message=${dErr.error}
format=${routeResult.fileFormat}
willFallback=true`);
                } else {
                  const backoffMs = Math.pow(2, attempt) * 500;
                  console.warn(`[DOCLING_ERROR] Retry in ${backoffMs}ms...`);
                  await new Promise((resolve) => setTimeout(resolve, backoffMs));
                }
              }
            }
          } else {
            console.log(`[DOCLING_UNAVAILABLE]
reason=${doclingAvailable ? 'format_not_supported' : 'service_not_configured'}
format=${routeResult.fileFormat}
doclingUrlConfigured=${doclingAvailable}
willFallback=true`);
          }

          // If Docling succeeded, use its result
          if (doclingResult) {
            const sd = doclingResult.structuredDocument;

            // Circuit breaker for low confidence
            if (sd.extractionConfidence >= 0.3) {
              extractionSucceeded = true;
              extractedText = sd.markdown;
              extractedDocument = sd;
              documentContext = {
                pages: sd.pageCount,
                lineItems: sd.markdown.split("\n").filter(l => l.trim()).length,
                fileType: sd.fileFormat,
                extractionMethod: "docling",
                confidenceScore: Math.round(sd.extractionConfidence * 100),
              };
              console.log(`[EXTRACT_COMPLETE] auditId=${auditId} method=docling confidence=${sd.extractionConfidence.toFixed(2)}`);
            } else {
              // Low confidence — don't mark as failed, still fallback
              console.log(`[DOCLING_FAILURE] reason="Low confidence (${sd.extractionConfidence})" willFallback=true`);
            }
          }

          // Fallback: if Docling didn't succeed, try the next pipeline
          if (!extractionSucceeded) {
            console.log(`[FALLBACK_STARTED] provider=${useNew ? 'deepseek-vision' : 'legacy'} reason="Docling unavailable or failed"`);
          }
        }

        // ──────────────────────────────────────────────
        // FALLBACK 1: NEW PIPELINE (DeepSeek Vision)
        // ──────────────────────────────────────────────
        if (!extractionSucceeded && useNew && processor) {
          console.log(`[EXTRACTION_STARTED] auditId=${auditId} pipeline=new-deepseek fileName="${fileName}"`);
          try {
            const result = await processor.process(buffer, fileName);
            console.log(`[OCR_COMPLETE] auditId=${auditId} textLength=${result.fullText.length} pages=${result.pageCount} confidence=${result.extractionConfidence.toFixed(2)}`);

            if (result.extractionConfidence >= 0.5) {
              extractionSucceeded = true;
              extractedText = result.fullText;
              extractedDocument = result;
              documentContext = {
                pages: result.pageCount,
                lineItems: result.fullText.split("\n").filter(l => l.trim()).length,
                fileType: result.fileType,
                extractionMethod: "deepseek-vision",
                confidenceScore: Math.round(result.extractionConfidence * 100),
              };
              console.log(`[FALLBACK_SUCCESS] provider=deepseek-vision textLength=${result.fullText.length} confidence=${result.extractionConfidence.toFixed(2)}`);
            } else {
              console.warn(`[FALLBACK_FAILED] reason="Low confidence (${result.extractionConfidence})" willFallback=true`);
            }
          } catch (fallbackErr) {
            const fbMsg = fallbackErr instanceof Error ? fallbackErr.message : 'unknown';
            console.error(`[FALLBACK_FAILED] provider=deepseek-vision message="${fbMsg}" willFallback=true`);
          }
        }

        // ──────────────────────────────────────────────
        // FALLBACK 2: LEGACY PIPELINE
        // ──────────────────────────────────────────────
        if (!extractionSucceeded) {
          console.log(`[EXTRACTION_STARTED] auditId=${auditId} pipeline=legacy fileName="${fileName}"`);
          try {
            const result = await extractTextLegacy(buffer, fileName, c.env);
            console.log(`[OCR_COMPLETE] auditId=${auditId} textLength=${result.text.length} method=${result.extractionMethod}`);

            extractionSucceeded = true;
            extractedText = result.text;
            extractedDocument = null;
            documentContext = {
              pages: result.pages,
              lineItems: result.lineItems,
              fileType: result.fileType,
              extractionMethod: result.extractionMethod,
              confidenceScore: result.confidenceScore,
            };
            console.log(`[FALLBACK_SUCCESS] provider=legacy textLength=${result.text.length} method=${result.extractionMethod}`);
          } catch (fallbackErr) {
            const fbMsg = fallbackErr instanceof Error ? fallbackErr.message : 'unknown';
            console.error(`[FALLBACK_FAILED] provider=legacy message="${fbMsg}"`);
            throw fallbackErr; // Last resort failed — propagate the error
          }
        }

        // ──────────────────────────────────────────────
        // STORE EXTRACTION RESULT
        // ──────────────────────────────────────────────
        if (extractionSucceeded) {
          console.log(`[JOB_UPDATE] auditId=${auditId} status=extracted method=${documentContext?.extractionMethod}`);
          await updateJob(auditId, {
            status: "extracted",
            extractedText,
            extractedDocument: extractedDocument as any,
            documentContext,
          });
          console.log(`[EXTRACTION_COMPLETE] auditId=${auditId} status=extracted method=${documentContext?.extractionMethod}`);
        } else {
          // All pipelines failed — last resort error
          await updateJob(auditId, {
            status: "error",
            error: "We could not read this document. Please upload a clearer image or PDF.",
          });
        }
      } catch (extractError) {
        const errMsg = extractError instanceof Error ? extractError.message : 'unknown';
        const errStack = extractError instanceof Error ? (extractError.stack || '(no stack)') : '(not an Error)';
        const errCode = (extractError as any)?.code || 'unknown';
        console.error(`[EXTRACTION_FAILED] auditId=${auditId} code=${errCode} message="${errMsg}"
stack=${errStack}`);
        await updateJob(auditId, {
          status: "error",
          error: "Something went wrong — Extraction failed",
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