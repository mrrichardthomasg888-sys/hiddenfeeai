import type { DocumentRouteResult, SupportedFileFormat } from "../types.js";

/**
 * Document Routing Engine
 * 
 * Auto-detects everything about a document BEFORE processing:
 * - File format (via magic bytes + extension)
 * - MIME type
 * - Digital vs scanned
 * - OCR requirement (only OCR if needed)
 * - Language detection
 * - Page count estimation
 * - Presence of tables, images, forms, signatures
 * - Document quality assessment
 * 
 * This ensures we never OCR a perfectly good digital PDF
 * and we know what we're dealing with before committing to extraction.
 */

// ─── MIME type mapping ───

const MIME_MAP: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  doc: 'application/msword',
  rtf: 'application/rtf',
  txt: 'text/plain',
  md: 'text/markdown',
  csv: 'text/csv',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
  ods: 'application/vnd.oasis.opendocument.spreadsheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ppt: 'application/vnd.ms-powerpoint',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  tiff: 'image/tiff',
  tif: 'image/tiff',
  bmp: 'image/bmp',
  gif: 'image/gif',
  eml: 'message/rfc822',
  msg: 'application/vnd.ms-outlook',
  html: 'text/html',
  xml: 'application/xml',
  json: 'application/json',
  zip: 'application/zip',
};

// ─── Image formats (always need OCR for text extraction) ───

const IMAGE_FORMATS: SupportedFileFormat[] = [
  'jpg', 'jpeg', 'png', 'webp', 'heic', 'tiff', 'tif', 'bmp', 'gif',
];

// ─── Text-based formats (rarely need OCR) ───

const TEXT_FORMATS: SupportedFileFormat[] = [
  'txt', 'md', 'csv', 'html', 'xml', 'json',
];

// ─── Structured formats ───

const OFFICE_FORMATS: SupportedFileFormat[] = [
  'docx', 'doc', 'rtf', 'xlsx', 'xls', 'ods', 'pptx', 'ppt',
];

// ─── Email formats ───

const EMAIL_FORMATS: SupportedFileFormat[] = ['eml', 'msg'];

// ─── Archive formats ───

const ARCHIVE_FORMATS: SupportedFileFormat[] = ['zip'];

// ─── Magic bytes detection ───

function detectFormatByMagic(buffer: ArrayBuffer): SupportedFileFormat | null {
  const arr = new Uint8Array(buffer);
  const len = arr.length;

  // Need at least 12 bytes for most signatures
  if (len < 4) return null;

  // PDF: %PDF
  if (arr[0] === 0x25 && arr[1] === 0x50 && arr[2] === 0x44 && arr[3] === 0x46) return 'pdf';

  // PNG: \x89PNG\r\n\x1a\n
  if (arr[0] === 0x89 && arr[1] === 0x50 && arr[2] === 0x4E && arr[3] === 0x47) return 'png';

  // JPEG: \xFF\xD8\xFF
  if (arr[0] === 0xFF && arr[1] === 0xD8 && arr[2] === 0xFF) return 'jpg';

  // WEBP: RIFF....WEBP (need 12 bytes)
  if (len >= 12 && arr[0] === 0x52 && arr[1] === 0x49 && arr[2] === 0x46 && arr[3] === 0x46) {
    const webpMarker = new TextDecoder().decode(arr.slice(8, 12));
    if (webpMarker === 'WEBP') return 'webp';
  }

  // TIFF: II (little-endian) or MM (big-endian)
  if ((arr[0] === 0x49 && arr[1] === 0x49 && arr[2] === 0x2A && arr[3] === 0x00) ||
      (arr[0] === 0x4D && arr[1] === 0x4D && arr[2] === 0x00 && arr[3] === 0x2A)) {
    return 'tiff';
  }

  // BMP: BM
  if (arr[0] === 0x42 && arr[1] === 0x4D) return 'bmp';

  // GIF: GIF87a or GIF89a
  if (len >= 6 && (arr[0] === 0x47 && arr[1] === 0x49 && arr[2] === 0x46)) {
    const ver = new TextDecoder().decode(arr.slice(3, 6));
    if (ver === '87a' || ver === '89a') return 'gif';
  }

  // ZIP-based (DOCX, XLSX, PPTX, ODS, JAR, etc): PK\x03\x04
  if (arr[0] === 0x50 && arr[1] === 0x4B && arr[2] === 0x03 && arr[3] === 0x04) {
    // ZIP format — need to inspect internal structure to disambiguate
    // For now, we return 'zip' and let the caller use extension for office formats
    return 'zip';
  }

  // HEIC/HEIF: ftyp box
  if (len >= 12 && arr[4] === 0x66 && arr[5] === 0x74 && arr[6] === 0x79 && arr[7] === 0x70) {
    const brand = new TextDecoder().decode(arr.slice(8, 12)).toLowerCase();
    if (['heic', 'heif', 'heix', 'hevc'].includes(brand)) return 'heic';
  }

  // EML: starts with common email headers
  if (len >= 15) {
    const start = new TextDecoder().decode(arr.slice(0, 15)).toLowerCase();
    if (start.startsWith('from:') || start.startsWith('to:') ||
        start.startsWith('subject:') || start.startsWith('date:') ||
        start.startsWith('return-path:') || start.startsWith('received:') ||
        start.startsWith('message-id:') || start.startsWith('mime-version:')) {
      return 'eml';
    }
  }

  // RTF: {\\rtf
  if (len >= 5) {
    const start = new TextDecoder().decode(arr.slice(0, 5));
    if (start === '{\\rtf') return 'rtf';
  }

  // XML/HTML detection
  if (len >= 5) {
    const start = new TextDecoder().decode(arr.slice(0, 5)).trimStart();
    if (start.startsWith('<?xml')) return 'xml';
    if (start.startsWith('<!DO') || start.startsWith('<html')) return 'html';
    if (start.startsWith('<')) return 'xml'; // likely XML-based
  }

  // JSON detection
  if (len >= 1) {
    const start = new TextDecoder().decode(arr.slice(0, 1));
    if (start === '{' || start === '[') return 'json';
  }

  return null;
}

// ─── Extension-based format guess ───

function detectFormatByExtension(fileName: string): SupportedFileFormat | null {
  const ext = fileName.toLowerCase().split('.').pop() ?? '';
  
  const extMap: Record<string, SupportedFileFormat> = {
    pdf: 'pdf', docx: 'docx', doc: 'doc', rtf: 'rtf',
    txt: 'txt', text: 'txt', md: 'md', markdown: 'md',
    csv: 'csv', tsv: 'csv',
    xlsx: 'xlsx', xls: 'xls', xlsm: 'xlsx', ods: 'ods',
    pptx: 'pptx', ppt: 'ppt',
    jpg: 'jpg', jpeg: 'jpg', png: 'png', webp: 'webp',
    heic: 'heic', heif: 'heic',
    tiff: 'tiff', tif: 'tiff', bmp: 'bmp', gif: 'gif',
    eml: 'eml', msg: 'msg',
    html: 'html', htm: 'html',
    xml: 'xml', json: 'json',
    zip: 'zip',
  };

  return extMap[ext] ?? null;
}

// ─── Resolve format (magic bytes win, extension as fallback) ───

function resolveFormat(buffer: ArrayBuffer, fileName: string): { format: SupportedFileFormat; mimeType: string; confidence: number } {
  const magic = detectFormatByMagic(buffer);
  const ext = detectFormatByExtension(fileName);

  // Magic bytes always take priority if detected
  if (magic) {
    // Special case: ZIP magic + Office extension = Office file
    if (magic === 'zip' && ext && OFFICE_FORMATS.includes(ext)) {
      return { format: ext, mimeType: MIME_MAP[ext] ?? 'application/octet-stream', confidence: 0.85 };
    }
    return { format: magic, mimeType: MIME_MAP[magic] ?? 'application/octet-stream', confidence: 0.9 };
  }

  // Fall back to extension
  if (ext) {
    return { format: ext, mimeType: MIME_MAP[ext] ?? 'application/octet-stream', confidence: 0.7 };
  }

  // Last resort
  return { format: 'txt', mimeType: 'text/plain', confidence: 0.3 };
}

// ─── Text density scan (approximate, fast) ───

function estimateTextDensity(buffer: ArrayBuffer): number {
  const arr = new Uint8Array(buffer);
  const sampleSize = Math.min(arr.length, 8192); // First 8KB
  let textChars = 0;
  
  for (let i = 0; i < sampleSize; i++) {
    const byte = arr[i];
    // Count printable ASCII characters
    if (byte >= 0x20 && byte <= 0x7E) textChars++;
    // Count common UTF-8 continuation bytes
    else if (byte >= 0x80) textChars += 0.5;
    // Count newlines and tabs
    else if (byte === 0x0A || byte === 0x0D || byte === 0x09) textChars++;
  }
  
  return textChars / sampleSize;
}

// ─── Quick page count estimation ───

function estimatePageCount(buffer: ArrayBuffer, format: SupportedFileFormat): number {
  const size = buffer.byteLength;
  const arr = new Uint8Array(buffer);

  // PDF: count page objects (quick approximation)
  if (format === 'pdf' && size < 50_000_000) {
    const sample = new TextDecoder().decode(arr.slice(0, Math.min(size, 100_000)));
    const pageMatches = sample.match(/\/Type\s*\/Page[^s]/g);
    if (pageMatches) return pageMatches.length;
    
    // Estimate: ~50KB per page for typical consumer documents
    return Math.max(1, Math.round(size / 50_000));
  }

  // Text-based: estimate by character count
  if (TEXT_FORMATS.includes(format)) {
    return 1; // Text files don't have pages
  }

  // Images: 1 page per image
  if (IMAGE_FORMATS.includes(format)) return 1;

  // Office docs: rough estimate by size
  if (OFFICE_FORMATS.includes(format)) {
    return Math.max(1, Math.round(size / 40_000));
  }

  return 1;
}

// ─── Quick table detection ───

function detectTables(buffer: ArrayBuffer, format: SupportedFileFormat): boolean {
  if (IMAGE_FORMATS.includes(format)) {
    // Images: can't detect tables without OCR/vision, assume possible
    return true;
  }

  // Quick scan first 64KB for table indicators
  const arr = new Uint8Array(buffer);
  const sample = new TextDecoder().decode(arr.slice(0, Math.min(arr.length, 65536)));

  // Pipe-delimited, tab-separated, markdown tables
  if (sample.includes('|') && sample.match(/\|[-\s|]+\|/)) return true;
  if (sample.includes('\t') && sample.split('\t').length > 3) return true;

  // XML table tags
  if (format === 'xlsx' || format === 'xls' || format === 'ods') return true;
  if (sample.includes('<table') || sample.includes('<w:tbl>')) return true;

  return false;
}

// ─── Quick image/scan detection for PDFs ───

function detectPdfNature(buffer: ArrayBuffer): {
  isDigital: boolean;
  isScanned: boolean;
  needsOcr: boolean;
  hasImages: boolean;
} {
  const arr = new Uint8Array(buffer);
  
  // Sample the first 128KB for text content indicators
  const sampleSize = Math.min(arr.length, 131_072);
  const sample = new TextDecoder().decode(arr.slice(0, sampleSize));
  
  // Digital PDFs have BT...ET text blocks with readable content
  const btBlocks = sample.match(/BT([\s\S]*?)ET/g);
  let totalTextChars = 0;
  
  if (btBlocks) {
    for (const block of btBlocks) {
      const textMatches = block.match(/\(([^)]*)\)/g);
      if (textMatches) {
        for (const t of textMatches) {
          totalTextChars += t.length - 2; // minus parentheses
        }
      }
    }
  }
  
  // Check for image XObjects in PDF
  const hasImages = sample.includes('/Subtype /Image') || sample.includes('/Subtype/Image');
  
  // Decision logic:
  // > 200 characters from BT blocks = digital PDF with text
  // < 200 chars but has images = likely scanned PDF
  // Neither = possibly empty or corrupted
  
  // KEY INSIGHT: If a PDF has NO image XObjects, it's a digital PDF.
  // Many PDFs use FlateDecode compression — text is invisible to regex
  // but the native extractor CAN decompress it. Only mark as scanned
  // if the PDF actively contains embedded images (the hallmark of a scan).
  const isDigital = totalTextChars > 200 || !hasImages;
  const isScanned = !isDigital && hasImages;
  const needsOcr = hasImages && !isDigital;

  return { isDigital, isScanned, needsOcr, hasImages };
}

// ─── Language detection (simple, common consumer languages) ───

function detectLanguage(buffer: ArrayBuffer): string {
  const arr = new Uint8Array(buffer);
  const sample = new TextDecoder().decode(arr.slice(0, Math.min(arr.length, 16384))).toLowerCase();

  // Extremely fast: count common words per language
  const englishMarkers = ['the', 'and', 'for', 'you', 'this', 'that', 'with', 'have', 'from', 'your'];
  const spanishMarkers = ['el', 'la', 'los', 'las', 'una', 'por', 'para', 'como', 'usted', 'sus'];
  const frenchMarkers = ['le', 'la', 'les', 'des', 'vous', 'une', 'est', 'dans', 'pour', 'votre'];

  let englishScore = 0, spanishScore = 0, frenchScore = 0;

  for (const word of englishMarkers) {
    if (sample.includes(` ${word} `)) englishScore++;
  }
  for (const word of spanishMarkers) {
    if (sample.includes(` ${word} `)) spanishScore++;
  }
  for (const word of frenchMarkers) {
    if (sample.includes(` ${word} `)) frenchScore++;
  }

  if (spanishScore > englishScore && spanishScore > frenchScore) return 'es';
  if (frenchScore > englishScore && frenchScore > spanishScore) return 'fr';
  if (englishScore > 0) return 'en';
  
  // Check for non-Latin scripts
  const nonLatinCount = (sample.match(/[\u0400-\u04FF]/g) || []).length; // Cyrillic
  if (nonLatinCount > 50) return 'ru';

  const cjkCount = (sample.match(/[\u4E00-\u9FFF]/g) || []).length; // CJK
  if (cjkCount > 20) return 'zh';

  const arabicCount = (sample.match(/[\u0600-\u06FF]/g) || []).length;
  if (arabicCount > 20) return 'ar';

  return 'en'; // Default to English
}

// ─── Document quality assessment ───

function assessQuality(
  buffer: ArrayBuffer,
  format: SupportedFileFormat,
  textDensity: number,
  isScanned: boolean,
  needsOcr: boolean,
): DocumentRouteResult['documentQuality'] {
  const sizeMB = buffer.byteLength / (1024 * 1024);

  if (needsOcr && format === 'pdf' && sizeMB < 0.01) return 'unusable';
  if (needsOcr && textDensity < 0.01) return 'poor';
  if (needsOcr) return 'fair';
  if (isScanned) return 'fair';
  if (textDensity > 0.5 && sizeMB > 0.05) return 'excellent';
  if (textDensity > 0.3) return 'good';
  if (textDensity > 0.1) return 'fair';

  return 'poor';
}

// ─── Form detection (basic) ───

function detectForms(buffer: ArrayBuffer, format: SupportedFileFormat): boolean {
  if (format !== 'pdf') return false;
  
  const arr = new Uint8Array(buffer);
  const sample = new TextDecoder().decode(arr.slice(0, Math.min(arr.length, 65536)));
  
  // PDF form field indicators
  if (sample.includes('/AcroForm')) return true;
  if (sample.includes('/SigFlags')) return true;
  if (sample.includes('/Annot')) return true;

  // Text-based form patterns (underscore lines, checkbox patterns)
  if (sample.match(/_{3,}/)) return true;
  if (sample.match(/☐|□|○/)) return true;
  if (sample.match(/Name:?\s*_{3,}/i)) return true;

  return false;
}

// ─── Signature detection ───

function detectSignatures(buffer: ArrayBuffer, format: SupportedFileFormat): boolean {
  const arr = new Uint8Array(buffer);
  const sample = new TextDecoder().decode(arr.slice(0, Math.min(arr.length, 65536)));

  if (sample.toLowerCase().includes('signature')) return true;
  if (sample.includes('_/s/')) return true;
  if (sample.includes('/Sig')) return true; // PDF signature field
  
  // Common signature block patterns
  if (sample.match(/Signed:?\s*_{10,}/i)) return true;
  if (sample.match(/Signature.*Date/i)) return true;

  return false;
}

// ─── Main routing function ───

/**
 * Analyze a document buffer and return a complete routing assessment.
 * This runs BEFORE any heavy processing to determine the best extraction strategy.
 */
export function routeDocument(buffer: ArrayBuffer, fileName: string): DocumentRouteResult {
  const { format, mimeType, confidence: formatConfidence } = resolveFormat(buffer, fileName);
  
  // Image formats always need OCR
  const isImage = IMAGE_FORMATS.includes(format);
  const isText = TEXT_FORMATS.includes(format);
  
  // PDF-specific analysis
  let isDigital = false;
  let isScanned = false;
  let needsOcr = isImage; // Images always need OCR
  let hasImages = isImage;

  if (format === 'pdf') {
    const pdfAnalysis = detectPdfNature(buffer);
    isDigital = pdfAnalysis.isDigital;
    isScanned = pdfAnalysis.isScanned;
    needsOcr = pdfAnalysis.needsOcr;
    hasImages = pdfAnalysis.hasImages;
  }

  // Office formats: digital by default
  if (OFFICE_FORMATS.includes(format)) {
    isDigital = true;
    isScanned = false;
    needsOcr = false;
  }

  // Text formats: digital
  if (isText) {
    isDigital = true;
    isScanned = false;
    needsOcr = false;
  }

  // Run detections
  const textDensity = estimateTextDensity(buffer);
  const pageCount = estimatePageCount(buffer, format);
  const tableResult = detectTables(buffer, format);
  const formResult = detectForms(buffer, format);
  const sigResult = detectSignatures(buffer, format);
  const language = detectLanguage(buffer);
  const quality = assessQuality(buffer, format, textDensity, isScanned, needsOcr);

  // Build warnings
  const warnings: string[] = [];
  if (needsOcr && format !== 'pdf') {
    warnings.push(`This ${format.toUpperCase()} image will be OCR-processed. Results may vary with image quality.`);
  }
  if (needsOcr && format === 'pdf') {
    warnings.push('This appears to be a scanned PDF. OCR will be applied.');
  }
  if (pageCount > 50) {
    warnings.push(`Large document detected (estimated ${pageCount} pages). Processing may take longer.`);
  }
  if (formatConfidence < 0.7) {
    warnings.push(`File format detection confidence is low (${Math.round(formatConfidence * 100)}%). Results may be affected.`);
  }
  if (quality === 'poor' || quality === 'unusable') {
    warnings.push('Document quality is low. Consider uploading a clearer version for best results.');
  }
  if (format === 'zip') {
    warnings.push('ZIP archive detected. Archives will be decompressed and each file processed individually.');
  }

  return {
    fileFormat: format,
    mimeType,
    isDigital,
    isScanned,
    needsOcr,
    detectedLanguage: language,
    pageCount,
    hasTables: tableResult,
    hasImages,
    hasForms: formResult,
    hasSignatures: sigResult,
    hasHandwriting: needsOcr, // Assume handwriting possible when OCR is needed
    documentQuality: quality,
    warnings,
  };
}

/**
 * All accepted file extensions for validation.
 * Keep in sync with the SupportedFileFormat type.
 */
export const ACCEPTED_EXTENSIONS = [
  '.pdf', '.docx', '.doc', '.rtf', '.txt', '.text', '.md', '.markdown',
  '.csv', '.tsv', '.xlsx', '.xls', '.xlsm', '.ods',
  '.pptx', '.ppt',
  '.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif',
  '.tiff', '.tif', '.bmp', '.gif',
  '.eml', '.msg',
  '.html', '.htm', '.xml', '.json',
  '.zip',
];

/**
 * Quick extension check for upload validation.
 */
export function isAcceptedExtension(fileName: string): boolean {
  const ext = '.' + fileName.toLowerCase().split('.').pop();
  return ACCEPTED_EXTENSIONS.includes(ext);
}