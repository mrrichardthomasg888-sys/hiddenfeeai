import { Hono } from "hono";
import { v4 as uuid } from "uuid";
import type { Env } from "../types.js";
import { createJob, updateJob } from "../jobStore.js";
import { extractText, isAcceptedExtension } from "../services/extractor.js";
import * as errors from "../utils/errors.js";

export const uploadRoute = new Hono<{ Bindings: Env }>();

uploadRoute.post("/", async (c) => {
  const maxMb = Number(c.env.MAX_UPLOAD_SIZE_MB || 25);

  const formData = await c.req.formData().catch(() => null);
  if (!formData) throw errors.badFile();

  const file = formData.get("file") as File | null;
  if (!file) throw errors.badFile();

  // Validate extension
  const fileName = file.name;
  if (!isAcceptedExtension(fileName)) {
    const ext = fileName.split(".").pop() ?? "";
    throw errors.unsupportedType("." + ext);
  }

  // Validate size
  if (file.size > maxMb * 1024 * 1024) {
    throw errors.tooLarge(maxMb);
  }

  const auditId = uuid();
  const job = createJob(auditId, fileName);

  // Read file buffer
  const buffer = await file.arrayBuffer();

  // Start extraction (async)
  c.executionCtx.waitUntil(
    (async () => {
      try {
        updateJob(auditId, { status: "extracting" });
        const result = await extractText(buffer, fileName, c.env);
        updateJob(auditId, {
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
      } catch (extractError) {
        updateJob(auditId, {
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