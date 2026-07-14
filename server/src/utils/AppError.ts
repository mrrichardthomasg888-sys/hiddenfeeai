// Custom error class that carries an HTTP status + a friendly, human-readable
// message safe to show directly to end users (per the "never show technical
// errors" UX requirement). Internal/technical detail goes in `debugMessage`
// and is only logged server-side, never sent to the client.

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly friendlyMessage: string;
  public readonly debugMessage?: string;

  constructor(statusCode: number, friendlyMessage: string, debugMessage?: string) {
    super(friendlyMessage);
    this.statusCode = statusCode;
    this.friendlyMessage = friendlyMessage;
    this.debugMessage = debugMessage;
    this.name = "AppError";
  }
}

export const Errors = {
  badFile: () =>
    new AppError(
      400,
      "We couldn't read that file. Try a clearer photo, a different format, or a PDF."
    ),
  unsupportedType: (ext: string) =>
    new AppError(
      415,
      `The file type "${ext}" isn't supported yet. Please upload a PDF, image (PNG/JPG), DOCX, XLSX, or CSV.`
    ),
  tooLarge: (maxMb: number) =>
    new AppError(400, `That file is too large. Please upload a file under ${maxMb}MB.`),
  jobNotFound: () =>
    new AppError(404, "We couldn't find your document. Please upload it again."),
  notPaid: () =>
    new AppError(402, "Payment is required before we can generate your audit report."),
  aiUnavailable: () =>
    new AppError(
      503,
      "Our AI audit engine is temporarily unavailable. Please try again in a moment."
    ),
  generic: () =>
    new AppError(500, "Something went wrong on our end. Please try again."),
};
