const MAX_IMAGE_DIMENSION = 3200;
const IMAGE_REENCODE_THRESHOLD = 4 * 1024 * 1024;
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
  const ext = extension(file.name);
  const imageTypes = new Set(["jpg", "jpeg", "png", "webp", "heic", "heif"]);
  if (!imageTypes.has(ext) || (file.size < IMAGE_REENCODE_THRESHOLD && !["heic", "heif"].includes(ext))) {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Canvas is unavailable.");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await canvasBlob(canvas);
    if (blob.size >= file.size && !["heic", "heif"].includes(ext)) return file;
    return new File([blob], replaceExtension(file.name, "jpg"), {
      type: "image/jpeg",
      lastModified: file.lastModified,
    });
  } catch {
    return file;
  }
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
