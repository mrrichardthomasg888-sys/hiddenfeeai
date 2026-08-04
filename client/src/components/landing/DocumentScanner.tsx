import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { jsPDF } from "jspdf";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  FileCheck2,
  Loader2,
  RefreshCcw,
  RotateCw,
  ScanLine,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  analyzeScanQuality,
  cameraFailureMessage,
  fingerprintDistance,
  MAX_SCAN_PAGES,
  moveListItem,
  replaceListItem,
  rotateClockwise,
  selectionAfterDelete,
  type QuarterTurn,
  type ScanIssue,
} from "@/lib/scanQuality";

const CAPTURE_MAX_EDGE = 2_000;
const JPEG_QUALITY = 0.86;
const PDF_JPEG_QUALITY = 0.82;

interface ScanPage {
  id: string;
  blob: Blob;
  url: string;
  width: number;
  height: number;
  rotation: QuarterTurn;
  issues: ScanIssue[];
  fingerprint: string;
}

export interface ScanPdfMetadata {
  pageCount: number;
  creationTimeMs: number;
  memoryDeltaBytes?: number;
}

interface DocumentScannerProps {
  maxFileSizeBytes: number;
  onCancel: () => void;
  onConfirm: (file: File, metadata: ScanPdfMetadata) => void;
}

type ScannerMode = "camera" | "review" | "generating";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function thumbnailStatus(page: ScanPage): { label: string; blocking: boolean } {
  const issue = page.issues.find((candidate) => candidate.severity === "blocking") ?? page.issues[0];
  if (!issue) return { label: "Looks clear", blocking: false };
  const labels: Record<ScanIssue["code"], string> = {
    blurry: "Image may be blurry—retake recommended.",
    dark: "Image may be dark—retake recommended.",
    cropped: "Page edges may be cropped—check all four corners.",
    glare: "Glare may hide text—retake recommended.",
    low_resolution: issue.severity === "blocking" ? "Resolution too low—retake required." : "Low resolution—retake recommended.",
    duplicate: "Possible duplicate—confirm both pages belong.",
  };
  return { label: labels[issue.code], blocking: issue.severity === "blocking" };
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("The captured page could not be prepared.")),
      "image/jpeg",
      quality,
    );
  });
}

async function loadBlobImage(blob: Blob): Promise<{ source: CanvasImageSource; width: number; height: number; release: () => void }> {
  if ("createImageBitmap" in window) {
    const bitmap = await createImageBitmap(blob);
    return { source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() };
  }
  const url = URL.createObjectURL(blob);
  const image = new Image();
  image.src = url;
  await image.decode();
  return { source: image, width: image.naturalWidth, height: image.naturalHeight, release: () => URL.revokeObjectURL(url) };
}

function currentHeapSize(): number | undefined {
  const memory = (performance as Performance & { memory?: { usedJSHeapSize?: number } }).memory;
  return memory?.usedJSHeapSize;
}

async function createScanPdf(pages: ScanPage[]): Promise<{ file: File; metadata: ScanPdfMetadata }> {
  const startedAt = performance.now();
  const heapBefore = currentHeapSize();
  const firstRotated = (pages[0]!.rotation / 90) % 2 === 1;
  const firstOrientedWidth = firstRotated ? pages[0]!.height : pages[0]!.width;
  const firstOrientedHeight = firstRotated ? pages[0]!.width : pages[0]!.height;
  const firstLandscape = firstOrientedWidth > firstOrientedHeight;
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: firstLandscape ? "landscape" : "portrait", compress: true });

  for (let index = 0; index < pages.length; index += 1) {
    const page = pages[index]!;
    const decoded = await loadBlobImage(page.blob);
    try {
      const quarterTurns = page.rotation / 90;
      const rotated = quarterTurns % 2 === 1;
      const canvas = document.createElement("canvas");
      canvas.width = rotated ? decoded.height : decoded.width;
      canvas.height = rotated ? decoded.width : decoded.height;
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) throw new Error("PDF creation is not supported in this browser.");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.translate(canvas.width / 2, canvas.height / 2);
      context.rotate((page.rotation * Math.PI) / 180);
      context.drawImage(decoded.source, -decoded.width / 2, -decoded.height / 2);

      const orientation = canvas.width > canvas.height ? "landscape" : "portrait";
      if (index > 0) pdf.addPage("a4", orientation);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 5;
      const scale = Math.min((pdfWidth - margin * 2) / canvas.width, (pdfHeight - margin * 2) / canvas.height);
      const renderedWidth = canvas.width * scale;
      const renderedHeight = canvas.height * scale;
      const x = (pdfWidth - renderedWidth) / 2;
      const y = (pdfHeight - renderedHeight) / 2;
      const compressed = await canvasToBlob(canvas, PDF_JPEG_QUALITY);
      pdf.addImage(new Uint8Array(await compressed.arrayBuffer()), "JPEG", x, y, renderedWidth, renderedHeight, undefined, "MEDIUM");
      canvas.width = 1;
      canvas.height = 1;
    } finally {
      decoded.release();
    }
  }

  const pdfBlob = pdf.output("blob");
  const date = new Date().toISOString().slice(0, 10);
  const file = new File([pdfBlob], `HiddenFeeAI-scan-${date}.pdf`, { type: "application/pdf", lastModified: Date.now() });
  const heapAfter = currentHeapSize();
  return {
    file,
    metadata: {
      pageCount: pages.length,
      creationTimeMs: performance.now() - startedAt,
      memoryDeltaBytes: heapBefore !== undefined && heapAfter !== undefined ? Math.max(0, heapAfter - heapBefore) : undefined,
    },
  };
}

export function DocumentScanner({ maxFileSizeBytes, onCancel, onConfirm }: DocumentScannerProps) {
  const [mode, setMode] = useState<ScannerMode>("camera");
  const [pages, setPages] = useState<ScanPage[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [retakeIndex, setRetakeIndex] = useState<number | null>(null);
  const [cameraLoading, setCameraLoading] = useState(true);
  const [cameraReady, setCameraReady] = useState(false);
  const [captureBusy, setCaptureBusy] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pagesRef = useRef<ScanPage[]>([]);
  const activeRef = useRef(true);
  const cameraRequestRef = useRef(0);

  useEffect(() => { pagesRef.current = pages; }, [pages]);

  const stopCamera = useCallback(() => {
    cameraRequestRef.current += 1;
    const stream = streamRef.current;
    streamRef.current = null;
    stream?.getTracks().forEach((track) => track.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraReady(false);
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);
    setCameraLoading(true);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraLoading(false);
      setCameraError(cameraFailureMessage(false));
      return;
    }
    const requestId = cameraRequestRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 2560 } },
      });
      if (!activeRef.current || requestId !== cameraRequestRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      const track = stream.getVideoTracks()[0];
      if (track) {
        track.addEventListener("ended", () => {
          if (streamRef.current === stream) {
            setCameraReady(false);
            setCameraError("The camera stopped. Your captured pages are still here; tap Try camera again to continue.");
          }
        });
      }
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraReady(true);
    } catch (error) {
      const name = error instanceof DOMException ? error.name : "";
      if (requestId === cameraRequestRef.current) setCameraError(cameraFailureMessage(true, name));
    } finally {
      if (requestId === cameraRequestRef.current) setCameraLoading(false);
    }
  }, [stopCamera]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);

  useEffect(() => {
    if (mode === "camera") void startCamera();
    else stopCamera();
  }, [mode, startCamera, stopCamera]);

  useEffect(() => () => {
    activeRef.current = false;
    const stream = streamRef.current;
    streamRef.current = null;
    stream?.getTracks().forEach((track) => track.stop());
    pagesRef.current.forEach((page) => URL.revokeObjectURL(page.url));
  }, []);

  const cancel = useCallback(() => {
    activeRef.current = false;
    stopCamera();
    pagesRef.current.forEach((page) => URL.revokeObjectURL(page.url));
    pagesRef.current = [];
    setPages([]);
    onCancel();
  }, [onCancel, stopCamera]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") cancel(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [cancel]);

  const capture = async () => {
    const video = videoRef.current;
    if (!video || !cameraReady || captureBusy) return;
    if (retakeIndex === null && pages.length >= MAX_SCAN_PAGES) return;
    setCaptureBusy(true);
    setPdfError(null);
    try {
      const sourceWidth = video.videoWidth;
      const sourceHeight = video.videoHeight;
      if (!sourceWidth || !sourceHeight) throw new Error("The camera is not ready yet.");
      const scale = Math.min(1, CAPTURE_MAX_EDGE / Math.max(sourceWidth, sourceHeight));
      const width = Math.max(1, Math.round(sourceWidth * scale));
      const height = Math.max(1, Math.round(sourceHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) throw new Error("Page capture is not supported in this browser.");
      context.drawImage(video, 0, 0, width, height);

      const analysisCanvas = document.createElement("canvas");
      const analysisScale = Math.min(1, 256 / Math.max(width, height));
      analysisCanvas.width = Math.max(32, Math.round(width * analysisScale));
      analysisCanvas.height = Math.max(32, Math.round(height * analysisScale));
      const analysisContext = analysisCanvas.getContext("2d", { willReadFrequently: true });
      if (!analysisContext) throw new Error("Page quality could not be checked in this browser.");
      analysisContext.drawImage(canvas, 0, 0, analysisCanvas.width, analysisCanvas.height);
      const imageData = analysisContext.getImageData(0, 0, analysisCanvas.width, analysisCanvas.height);
      const quality = analyzeScanQuality(imageData.data, analysisCanvas.width, analysisCanvas.height, width, height);
      const duplicateOf = pages.findIndex((page, index) => index !== retakeIndex && fingerprintDistance(page.fingerprint, quality.fingerprint) <= 3);
      const issues = duplicateOf >= 0
        ? [...quality.issues, { code: "duplicate", severity: "warning", message: `This resembles page ${duplicateOf + 1}. Keep it only if both pages belong in the document.` } as ScanIssue]
        : quality.issues;
      const blob = await canvasToBlob(canvas, JPEG_QUALITY);
      const page: ScanPage = {
        id: crypto.randomUUID(),
        blob,
        url: URL.createObjectURL(blob),
        width,
        height,
        rotation: 0,
        issues,
        fingerprint: quality.fingerprint,
      };
      let nextPages: ScanPage[];
      let nextSelected: number;
      if (retakeIndex !== null) {
        const replaced = pages[retakeIndex];
        if (replaced) URL.revokeObjectURL(replaced.url);
        nextPages = replaceListItem(pages, retakeIndex, page);
        nextSelected = retakeIndex;
      } else {
        nextPages = [...pages, page];
        nextSelected = nextPages.length - 1;
      }
      setPages(nextPages);
      setSelectedIndex(nextSelected);
      setRetakeIndex(null);
      setMode("review");
      canvas.width = 1;
      canvas.height = 1;
      analysisCanvas.width = 1;
      analysisCanvas.height = 1;
    } catch (error) {
      setCameraError(error instanceof Error ? error.message : "The page could not be captured.");
    } finally {
      setCaptureBusy(false);
    }
  };

  const deletePage = (index: number) => {
    const page = pages[index];
    if (page) URL.revokeObjectURL(page.url);
    const next = pages.filter((_, pageIndex) => pageIndex !== index);
    setPages(next);
    setSelectedIndex((current) => selectionAfterDelete(pages.length, index, current));
  };

  const movePage = (index: number, direction: -1 | 1) => {
    const destination = index + direction;
    if (destination < 0 || destination >= pages.length) return;
    setPages(moveListItem(pages, index, direction));
    setSelectedIndex(destination);
  };

  const rotatePage = (index: number) => {
    setPages((current) => current.map((page, pageIndex) => pageIndex === index
      ? { ...page, rotation: rotateClockwise(page.rotation) }
      : page));
  };

  const continueToAnalysis = async () => {
    if (!pages.length || pages.some((page) => page.issues.some((issue) => issue.severity === "blocking"))) return;
    setMode("generating");
    setPdfError(null);
    try {
      const result = await createScanPdf(pages);
      window.dispatchEvent(new CustomEvent("hiddenfee:scan-metric", { detail: { event: "pdf_created", ...result.metadata, fileSize: result.file.size } }));
      if (result.file.size > maxFileSizeBytes) {
        setPdfError(`The combined document is ${formatFileSize(result.file.size)}, which exceeds the existing ${formatFileSize(maxFileSizeBytes)} upload limit. No pages were removed.`);
        setMode("review");
        return;
      }
      pagesRef.current.forEach((page) => URL.revokeObjectURL(page.url));
      pagesRef.current = [];
      setPages([]);
      onConfirm(result.file, result.metadata);
    } catch (error) {
      setPdfError(error instanceof Error ? error.message : "Your document could not be prepared. Your pages are still available.");
      setMode("review");
    }
  };

  const blockingCount = useMemo(() => pages.reduce((total, page) => total + page.issues.filter((issue) => issue.severity === "blocking").length, 0), [pages]);
  const selected = pages[selectedIndex];
  const nextPageNumber = retakeIndex === null ? pages.length + 1 : retakeIndex + 1;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#050911] text-white" role="dialog" aria-modal="true" aria-labelledby="scan-title">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-[#081220] px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-[#73b8ff]" />
            <h2 id="scan-title" className="truncate text-base font-black sm:text-lg">Scan With Camera <span className="ml-1 rounded-full border border-[#f4c542]/25 bg-[#f4c542]/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-[#f8d96e]">Beta</span></h2>
          </div>
          <p className="mt-0.5 text-xs font-semibold text-[#c8d3df]">Pages stay on this device until you continue to analysis.</p>
        </div>
        <button type="button" onClick={cancel} className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-white/15 bg-white/5" aria-label="Cancel scan and delete captured pages"><X className="h-5 w-5" /></button>
      </header>

      {mode === "camera" && (
        <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="relative min-h-0 flex-1 bg-black">
            <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-contain" aria-label="Camera preview" />
            <div className="pointer-events-none absolute inset-[7%] rounded-2xl border-2 border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,.28)]" />
            <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-black/70 px-4 py-2 text-sm font-black backdrop-blur">
              {retakeIndex === null ? `Page ${nextPageNumber} of ${MAX_SCAN_PAGES}` : `Retake page ${nextPageNumber}`}
            </div>
            {cameraLoading && <div className="absolute inset-0 flex items-center justify-center bg-[#050911]/85"><Loader2 className="h-8 w-8 animate-spin text-[#73b8ff]" /><span className="ml-3 font-bold">Starting camera…</span></div>}
            {cameraError && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#050911]/95 p-6 text-center">
                <div className="max-w-sm"><ShieldAlert className="mx-auto h-10 w-10 text-[#f8d96e]" /><p role="alert" className="mt-4 font-bold leading-7">{cameraError}</p><Button variant="outline" className="mt-5" onClick={() => void startCamera()}><RefreshCcw className="h-4 w-4" /> Try camera again</Button></div>
              </div>
            )}
          </div>
          <div className="shrink-0 border-t border-white/10 bg-[#081220] px-4 pb-[calc(14px+env(safe-area-inset-bottom))] pt-3">
            <p className="mb-3 text-center text-xs font-semibold text-[#c8d3df]">Lay one physical page flat, show all four corners, avoid shadows and glare, then hold still.</p>
            <div className="flex items-center justify-center gap-4">
              {pages.length > 0 && <Button variant="outline" onClick={() => setMode("review")}>Review {pages.length}</Button>}
              <button type="button" onClick={() => void capture()} disabled={!cameraReady || captureBusy || (retakeIndex === null && pages.length >= MAX_SCAN_PAGES)} className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-[#4da3ff] text-[#06111f] shadow-[0_0_0_4px_rgba(77,163,255,.28)] disabled:opacity-40" aria-label={retakeIndex === null ? `Capture page ${nextPageNumber}` : `Retake page ${nextPageNumber}`}>
                {captureBusy ? <Loader2 className="h-7 w-7 animate-spin" /> : <Camera className="h-7 w-7" />}
              </button>
              <span className="w-[92px] text-center text-xs font-bold text-[#c8d3df]">{pages.length}/{MAX_SCAN_PAGES} captured</span>
            </div>
          </div>
        </main>
      )}

      {mode === "review" && (
        <main className="min-h-0 flex-1 overflow-y-auto px-3 py-3 pb-[calc(18px+env(safe-area-inset-bottom))] sm:px-6 sm:py-5">
          <div className="mx-auto max-w-3xl">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0"><h3 className="text-lg font-black sm:text-xl">Review the complete document</h3><p className="mt-0.5 text-xs font-semibold leading-5 text-[#c8d3df] sm:text-sm">Pages will be analyzed in the order shown.</p></div>
              <Button variant="outline" size="sm" className="shrink-0" onClick={() => { setRetakeIndex(null); setMode("camera"); }} disabled={pages.length >= MAX_SCAN_PAGES}><Camera className="h-4 w-4" /> Add Page</Button>
            </div>

            {pages.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-white/20 p-6 text-center"><p className="font-bold">No pages captured.</p><Button variant="outline" className="mt-3" onClick={() => setMode("camera")}><Camera className="h-4 w-4" /> Capture page 1</Button></div>
            ) : (
              <>
                <ol className="mt-3 grid grid-cols-2 gap-2.5" aria-label="Captured page thumbnails">
                  {pages.map((page, index) => {
                    const status = thumbnailStatus(page);
                    return (
                      <li key={page.id}>
                        <button type="button" onClick={() => setSelectedIndex(index)} className={`h-full w-full overflow-hidden rounded-xl border p-2 text-left transition ${status.blocking ? "border-red-400/70 bg-red-400/10" : page.issues.length ? "border-amber-300/60 bg-amber-300/[0.08]" : selectedIndex === index ? "border-[#73b8ff] bg-[#4da3ff]/10 ring-1 ring-[#4da3ff]/40" : "border-white/12 bg-white/[0.035]"}`} aria-label={`Review page ${index + 1}, ${status.label}`}>
                          <div className="grid h-28 place-items-center overflow-hidden rounded-lg bg-black/45 sm:h-36"><img src={page.url} alt="" className="max-h-full max-w-full object-contain" style={{ transform: `rotate(${page.rotation}deg)`, maxWidth: page.rotation % 180 ? "72%" : "100%" }} /></div>
                          <span className="mt-2 flex items-center justify-between gap-2 text-xs font-black"><span>Page {index + 1}</span>{page.issues.length ? <AlertTriangle className={`h-4 w-4 shrink-0 ${status.blocking ? "text-red-300" : "text-amber-300"}`} /> : <Check className="h-4 w-4 shrink-0 text-[#76ecba]" />}</span>
                          <span className={`mt-1 block text-[11px] font-bold leading-4 ${status.blocking ? "text-red-200" : page.issues.length ? "text-amber-100" : "text-[#9ddfc5]"}`}>{status.label}</span>
                        </button>
                      </li>
                    );
                  })}
                </ol>

                {selected && (
                  <section className="mt-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3" aria-label={`Edit page ${selectedIndex + 1}`}>
                    <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-black">Selected: Page {selectedIndex + 1}</p><p className="text-[11px] font-semibold text-[#aebdca]">Tap any thumbnail to edit that page.</p></div><span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-bold text-[#c8d3df]">{selectedIndex + 1} of {pages.length}</span></div>
                    <div className="mt-3 grid max-h-[42vh] min-h-48 place-items-center overflow-hidden rounded-xl bg-black/40 p-2"><img src={selected.url} alt={`Full preview of page ${selectedIndex + 1}`} className="max-h-[40vh] max-w-full object-contain transition-transform" style={{ transform: `rotate(${selected.rotation}deg)`, maxWidth: selected.rotation % 180 ? "72%" : "100%" }} /></div>
                    {selected.issues.length > 0 ? <ul className="mt-2 space-y-1.5">{selected.issues.map((issue, issueIndex) => <li key={`${issue.code}-${issueIndex}`} className={`flex items-start gap-2 rounded-lg px-2.5 py-2 text-xs font-bold ${issue.severity === "blocking" ? "bg-red-400/10 text-red-200" : "bg-amber-300/10 text-amber-100"}`}><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{issue.message}</li>)}</ul> : <p className="mt-2 flex items-center gap-2 text-xs font-bold text-[#76ecba]"><Check className="h-4 w-4" /> No obvious capture problems detected.</p>}
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5"><Button variant="outline" size="sm" onClick={() => movePage(selectedIndex, -1)} disabled={selectedIndex === 0}><ArrowLeft className="h-4 w-4" /> Earlier</Button><Button variant="outline" size="sm" onClick={() => movePage(selectedIndex, 1)} disabled={selectedIndex === pages.length - 1}>Later <ArrowRight className="h-4 w-4" /></Button><Button variant="outline" size="sm" onClick={() => rotatePage(selectedIndex)}><RotateCw className="h-4 w-4" /> Rotate</Button><Button variant="outline" size="sm" onClick={() => { setRetakeIndex(selectedIndex); setMode("camera"); }}><RefreshCcw className="h-4 w-4" /> Retake</Button><Button variant="outline" size="sm" className="col-span-2 text-red-100 sm:col-span-1" onClick={() => deletePage(selectedIndex)}><Trash2 className="h-4 w-4" /> Delete</Button></div>
                  </section>
                )}

                {(blockingCount > 0 || pdfError) && <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-xs font-bold text-red-100" role="alert"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span>{pdfError || `${blockingCount} unreadable page issue${blockingCount === 1 ? "" : "s"} must be retaken before analysis. No pages will be discarded.`}</span></div>}
                <Button variant="violet" size="lg" className="mt-3 w-full" onClick={() => void continueToAnalysis()} disabled={!pages.length || blockingCount > 0}><FileCheck2 className="h-5 w-5" /> Continue to Analysis</Button>
                <p className="mt-2 text-center text-[11px] font-semibold leading-4 text-[#9eacba]">Your pages are combined securely in the order shown and sent directly to HiddenFeeAI. No download required.</p>
              </>
            )}
          </div>
        </main>
      )}

      {mode === "generating" && <main className="flex min-h-0 flex-1 items-center justify-center p-6 text-center"><div><Loader2 className="mx-auto h-10 w-10 animate-spin text-[#73b8ff]" /><h3 className="mt-4 text-xl font-black">Preparing your document</h3><p className="mt-2 text-sm font-semibold text-[#c8d3df]">Combining {pages.length} page{pages.length === 1 ? "" : "s"} in the order reviewed, then continuing to analysis…</p></div></main>}

    </div>,
    document.body,
  );
}
