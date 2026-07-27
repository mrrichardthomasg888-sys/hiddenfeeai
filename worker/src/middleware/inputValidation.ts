/**
 * Input Validation Hardening
 * 
 * Validates uploads before any processing begins.
 * Blocks common attack vectors and malformed files.
 */

const MAX_FILENAME_LENGTH = 255;
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const MAX_PAGES = 500;
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/rtf',
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/vnd.oasis.opendocument.spreadsheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/tiff',
  'image/bmp',
  'image/gif',
  'message/rfc822',
  'application/vnd.ms-outlook',
  'text/html',
  'application/xml',
  'application/json',
  'application/zip',
  'application/octet-stream', // Fallback for unknown binary
];

const BLOCKED_EXTENSIONS = [
  '.exe', '.dll', '.so', '.dylib', '.bin',
  '.sh', '.bash', '.zsh', '.fish',
  '.bat', '.cmd', '.ps1', '.vbs', '.js', '.ts',
  '.py', '.rb', '.pl', '.php',
  '.jar', '.war', '.ear',
  '.msi', '.deb', '.rpm', '.apk', '.ipa',
];

export interface ValidationResult {
  valid: boolean;
  error?: string;
  sanitizedFileName: string;
}

/**
 * Validate an uploaded file before processing.
 * Checks: filename safety, extension blocking, size, MIME type.
 */
export function validateUpload(
  fileName: string,
  fileSize: number,
  mimeType?: string,
): ValidationResult {
  // Filename check
  if (!fileName || fileName.length > MAX_FILENAME_LENGTH) {
    return {
      valid: false,
      error: `Filename is too long or empty. Maximum is ${MAX_FILENAME_LENGTH} characters.`,
      sanitizedFileName: '',
    };
  }

  // Block dangerous extensions
  const lowerName = fileName.toLowerCase();
  for (const blocked of BLOCKED_EXTENSIONS) {
    if (lowerName.endsWith(blocked)) {
      return {
        valid: false,
        error: `File type "${blocked}" is not supported for security reasons.`,
        sanitizedFileName: sanitizeFilename(fileName),
      };
    }
  }

  // Block path traversal
  if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
    return {
      valid: false,
      error: 'Invalid filename. Path separators are not allowed.',
      sanitizedFileName: sanitizeFilename(fileName),
    };
  }

  // Size check
  if (fileSize <= 0) {
    return { valid: false, error: 'File is empty.', sanitizedFileName: '' };
  }
  if (fileSize > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File is too large (${(fileSize / 1024 / 1024).toFixed(1)}MB). Maximum is 25MB.`,
      sanitizedFileName: sanitizeFilename(fileName),
    };
  }

  // MIME type validation (if provided)
  if (mimeType && !ALLOWED_MIME_TYPES.includes(mimeType) && mimeType !== '') {
    // Don't reject on unknown MIME — browsers/clients can be unreliable
    // But log for monitoring
    console.log(`[Validation] Unknown MIME type: ${mimeType} for file: ${sanitizeFilename(fileName)}`);
  }

  return {
    valid: true,
    sanitizedFileName: sanitizeFilename(fileName),
  };
}

/**
 * Sanitize a filename for safe storage/display.
 * Removes or replaces dangerous characters.
 */
export function sanitizeFilename(fileName: string): string {
  return fileName
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')  // Remove Windows-illegal chars
    .replace(/\.\./g, '_')                       // No directory traversal
    .replace(/^\.+/, '_')                        // No hidden files
    .slice(0, 255);
}

/**
 * Validate page count (call after extraction gives a page count).
 */
export function validatePageCount(pageCount: number): { valid: boolean; error?: string } {
  if (pageCount <= 0) {
    return { valid: false, error: 'Document appears to be empty. No pages detected.' };
  }
  if (pageCount > MAX_PAGES) {
    return {
      valid: false,
      error: `Document has ${pageCount} pages, which exceeds the ${MAX_PAGES} page limit. Please split the document into smaller files.`,
    };
  }
  return { valid: true };
}