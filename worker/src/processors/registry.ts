import type { DocumentProcessor, DocumentRouteResult, StructuredDocument, SupportedFileFormat, Env } from "../types.js";
import { BaseProcessor } from "./base.js";

/**
 * Processor Registry — the plug-in dispatch system.
 * 
 * All format-specific processors register themselves here.
 * The pipeline calls dispatch(), and the registry picks the best processor
 * for the detected file format, prioritizing by:
 * 1. Exact format match
 * 2. canProcess() returning true
 * 3. Highest priority (lowest number wins)
 */
export class ProcessorRegistry {
  private processors: Map<string, DocumentProcessor> = new Map();

  /**
   * Register a processor. The processor's format(s) become route keys.
   * If a processor handles multiple formats, it's registered under each.
   */
  register(processor: DocumentProcessor): void {
    const formats = Array.isArray(processor.format) ? processor.format : [processor.format];
    for (const fmt of formats) {
      const existing = this.processors.get(fmt);
      if (existing && existing.priority <= processor.priority) {
        // A higher-priority processor is already registered for this format
        continue;
      }
      this.processors.set(fmt, processor);
    }
  }

  /**
   * Unregister a processor (useful for testing or hot-swapping).
   */
  unregister(format: SupportedFileFormat): void {
    this.processors.delete(format);
  }

  /**
   * Find the best processor for a given route result.
   * Returns the processor if found, or undefined if no processor can handle this format.
   */
  findProcessor(routeResult: DocumentRouteResult): DocumentProcessor | undefined {
    return this.processors.get(routeResult.fileFormat);
  }

  /**
   * Get all registered processors (for inspection/debugging).
   */
  list(): Array<{ format: SupportedFileFormat; priority: number; requiresOcr: boolean }> {
    return Array.from(this.processors.entries()).map(([fmt, proc]) => ({
      format: fmt as SupportedFileFormat,
      priority: proc.priority,
      requiresOcr: proc.requiresOcr,
    }));
  }

  /**
   * Dispatch: find + process the document.
   * Throws if no processor is registered for the detected format.
   */
  async dispatch(
    buffer: ArrayBuffer,
    fileName: string,
    routeResult: DocumentRouteResult,
    env: Env
  ): Promise<StructuredDocument> {
    const processor = this.findProcessor(routeResult);
    if (!processor) {
      throw new Error(
        `No processor registered for format '${routeResult.fileFormat}'. ` +
        `Supported formats: ${Array.from(this.processors.keys()).join(', ')}`
      );
    }

    // Verify the processor claims it can handle this document
    if (!processor.canProcess(buffer, fileName, routeResult)) {
      throw new Error(
        `Processor for '${routeResult.fileFormat}' rejected the document. ` +
        `The file may be corrupted or in an unexpected encoding.`
      );
    }

    console.log(
      `[ProcessorRegistry] Dispatching ${fileName} (${routeResult.fileFormat}) ` +
      `to processor priority=${processor.priority}`
    );

    return processor.process(buffer, fileName, routeResult, env);
  }
}

/**
 * Singleton registry instance used by the pipeline.
 * Processors are registered at startup (lazily, on first use).
 */
export const registry = new ProcessorRegistry();

/**
 * Auto-registration helper — processors call this in their module.
 */
export function registerProcessor(processor: DocumentProcessor): void {
  registry.register(processor);
}

// Re-export BaseProcessor for processor implementors
export { BaseProcessor };