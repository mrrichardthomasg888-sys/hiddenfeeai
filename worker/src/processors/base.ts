import type { DocumentProcessor as IDocumentProcessor, DocumentRouteResult, StructuredDocument, SupportedFileFormat, Env } from "../types.js";

/**
 * Abstract base class for all document processors.
 * Each processor handles one or more file formats and produces a StructuredDocument.
 * 
 * To add support for a new file format:
 * 1. Create a new processor class extending BaseProcessor
 * 2. Register it in the ProcessorRegistry (registry.ts)
 * 3. No changes needed to the core pipeline
 */
export abstract class BaseProcessor implements IDocumentProcessor {
  abstract readonly format: SupportedFileFormat | SupportedFileFormat[];
  abstract readonly priority: number;
  abstract readonly requiresOcr: boolean;

  /**
   * Quick check: can this processor handle this file?
   * Default: checks format match. Override for deeper inspection (e.g., magic bytes).
   */
  canProcess(_buffer: ArrayBuffer, fileName: string, routeResult: DocumentRouteResult): boolean {
    const formats = Array.isArray(this.format) ? this.format : [this.format];
    return formats.includes(routeResult.fileFormat);
  }

  /**
   * Process the document. Must return a StructuredDocument.
   * Implementations should:
   * 1. Extract text preserving structure (headings, tables, lists, pages)
   * 2. Return markdown AND structured JSON elements
   * 3. Set extractionMethod and confidence honestly
   */
  abstract process(
    buffer: ArrayBuffer,
    fileName: string,
    routeResult: DocumentRouteResult,
    env: Env
  ): Promise<StructuredDocument>;

  /**
   * Utility: create a minimal StructuredDocument shell.
   */
  protected createStructuredDoc(
    fileName: string,
    fileFormat: SupportedFileFormat,
    pageCount: number,
    routeResult: DocumentRouteResult,
    extractionMethod: StructuredDocument['extractionMethod'],
    extractionConfidence: number,
  ): StructuredDocument {
    return {
      fileName,
      fileFormat,
      pageCount,
      markdown: '',
      elements: [],
      tables: [],
      metadata: {
        pageCount,
        language: routeResult.detectedLanguage,
      },
      routeResult,
      extractionMethod,
      extractionConfidence,
      warnings: [],
    };
  }
}