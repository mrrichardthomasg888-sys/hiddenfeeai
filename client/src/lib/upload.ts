const UPLOAD_TIMEOUT_MS = 120_000;

export class UploadError extends Error {
  readonly code: string;
  readonly status?: number;

  constructor(message: string, code: string, status?: number) {
    super(message);
    this.name = "UploadError";
    this.code = code;
    this.status = status;
  }
}

function extension(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function replaceExtension(name: string, next: string): string {
  const stem = name.replace(/\.[^.]+$/, "") || "document";
  return `${stem}.${next}`;
}

async function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("The image could not be compressed.")),
      "image/jpeg",
      0.88,
    );
  });
}

/** Resize very large phone photos before multipart upload. Modern Safari can also
 * decode HEIC here; browsers that cannot decode it leave the original intact for
 * the server-side Gemini fallback. */
export async function prepareUploadFile(file: File): Promise<File> {
  // Gemini must receive the original bytes. Browser-side resizing/re-encoding
  // previously destroyed small print and could also strip EXIF orientation.
  return file;
}

async function responseError(response: Response): Promise<UploadError> {
  const contentType = response.headers.get("content-type") ?? "";
  let message = "The upload failed. Please try again.";
  if (contentType.includes("application/json")) {
    const body = await response.json().catch(() => ({})) as { error?: string };
    if (body.error) message = body.error;
  } else {
    const text = await response.text().catch(() => "");
    if (text.trim() && !text.trim().startsWith("<")) message = text.trim().slice(0, 300);
  }

  const code = response.status === 413 ? "file_too_large"
    : response.status === 408 || response.status === 504 ? "timeout"
      : response.status >= 500 ? "backend_failure" : "upload_rejected";
  return new UploadError(message, code, response.status);
}

export async function uploadDocument(file: File): Promise<{ auditId: string; fileName?: string }> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);
  const formData = new FormData();
  formData.append("file", file, file.name);

  try {
    const response = await fetch(apiUrl("/upload"), {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });
    if (!response.ok) throw await responseError(response);
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      throw new UploadError("The upload service returned an invalid response.", "invalid_response", response.status);
    }
    const body = await response.json().catch(() => null) as { auditId?: string; fileName?: string } | null;
    if (!body?.auditId) throw new UploadError("The upload service returned an incomplete response.", "invalid_response", response.status);
    return { auditId: body.auditId, fileName: body.fileName };
  } catch (error) {
    if (error instanceof UploadError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new UploadError("The upload timed out. Try a smaller file or a faster connection.", "timeout");
    }
    throw new UploadError("The upload could not reach the service. Check your connection and try again.", "network_error");
  } finally {
    window.clearTimeout(timeout);
  }
}
import { apiUrl } from "@/config/api";
