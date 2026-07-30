import { HTTPException } from "hono/http-exception";

export function badFile(message?: string) {
  return new HTTPException(400, { message: message ?? "Invalid file. Please upload a supported document type." });
}

export function tooLarge(maxMb: number) {
  return new HTTPException(413, { message: `File too large. Maximum size is ${maxMb}MB.` });
}

export function unsupportedType(ext: string) {
  return new HTTPException(400, { message: `Unsupported file type: "${ext}". Please upload a PDF, image, DOCX, TXT, or spreadsheet.` });
}

export function jobNotFound() {
  return new HTTPException(404, { message: "Analysis not found. Please upload a document first." });
}

export function notPaid() {
  return new HTTPException(402, { message: "Payment is required before analysis. Please complete checkout." });
}

export function generic(message = "Something went wrong. Please try again.") {
  return new HTTPException(500, { message });
}
