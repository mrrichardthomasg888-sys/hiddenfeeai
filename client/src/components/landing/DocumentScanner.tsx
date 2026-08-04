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

type ScannerMode = "camera" | "review" | "generating" | "ready";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
  const [generated, setGenerated] = useState<{ file: File; metadata: ScanPdfMetadata } | null>(null);
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
    setGenerated(null);
  };

  const movePage = (index: number, direction: -1 | 1) => {
    const destination = index + direction;
    if (destination < 0 || destination >= pages.length) return;
    setPages(moveListItem(pages, index, direction));
    setSelectedIndex(destination);
    setGenerated(null);
  };

  const rotatePage = (index: number) => {
    setPages((current) => current.map((page, pageIndex) => pageIndex === index
      ? { ...page, rotation: rotateClockwise(page.rotation) }
      : page));
    setGenerated(null);
  };

  const generatePdf = async () => {
    if (!pages.length || pages.some((page) => page.issues.some((issue) => issue.severity === "blocking"))) return;
    setMode("generating");
    setPdfError(null);
    try {
      const result = await createScanPdf(pages);
      setGenerated(result);
      setMode("ready");
      window.dispatchEvent(new CustomEvent("hiddenfee:scan-metric", { detail: { event: "pdf_created", ...result.metadata, fileSize: result.file.size } }));
    } catch (error) {
      setPdfError(error instanceof Error ? error.message : "The PDF could not be created. Your pages are still available.");
      setMode("review");
    }
  };

  const confirm = () => {
    if (!generated || generated.file.size > maxFileSizeBytes) return;
    pagesRef.current.forEach((page) => URL.revokeObjectURL(page.url));
    pagesRef.current = [];
    setPages([]);
    onConfirm(generated.file, generated.metadata);
  };

  const blockingCount = useMemo(() => pages.reduce((total, page) => total + page.issues.filter((issue) => issue.severity === "blocking").length, 0), [pages]);
  const warningCount = useMemo(() => pages.reduce((total, page) => total + page.issues.filter((issue) => issue.severity === "warning").length, 0), [pages]);
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
          <p className="mt-0.5 text-xs font-semibold text-[#c8d3df]">Pages stay on this device until you confirm the PDF upload.</p>
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
        <main className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6">
          <div className="mx-auto max-w-5xl">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h3 className="text-xl font-black">Review the complete document</h3><p className="mt-1 text-sm font-semibold text-[#c8d3df]">Check every thumbnail. Pages are included in the order shown.</p></div>
              <div className="flex gap-2"><Button variant="outline" onClick={() => { setRetakeIndex(null); setMode("camera"); }} disabled={pages.length >= MAX_SCAN_PAGES}><Camera className="h-4 w-4" /> Add page</Button><Button variant="violet" onClick={() => void generatePdf()} disabled={!pages.length || blockingCount > 0}><FileCheck2 className="h-4 w-4" /> Create PDF</Button></div>
            </div>

            {(blockingCount > 0 || warningCount > 0 || pdfError) && (
              <div className={`mt-4 rounded-2xl border p-4 text-sm font-semibold ${blockingCount > 0 || pdfError ? "border-red-400/30 bg-red-400/10 text-red-100" : "border-amber-300/25 bg-amber-300/10 text-amber-100"}`} role="alert">
                <div className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" /><span>{pdfError || (blockingCount > 0 ? `${blockingCount} unreadable quality issue${blockingCount === 1 ? "" : "s"} must be fixed before PDF creation. No pages will be discarded.` : `${warningCount} quality warning${warningCount === 1 ? "" : "s"}. Review the affected pages before continuing.`)}</span></div>
              </div>
            )}

            {pages.length === 0 ? (
              <div className="mt-8 rounded-3xl border border-dashed border-white/20 p-10 text-center"><p className="font-bold">No pages captured.</p><Button variant="outline" className="mt-4" onClick={() => setMode("camera")}><Camera className="h-4 w-4" /> Capture page 1</Button></div>
            ) : (
              <>
                <div className="mt-5 grid min-h-[280px] place-items-center overflow-hidden rounded-3xl border border-white/10 bg-black/35 p-4 sm:min-h-[430px]">
                  {selected && <img src={selected.url} alt={`Full preview of page ${selectedIndex + 1}`} className="max-h-[62vh] max-w-full object-contain transition-transform" style={{ transform: `rotate(${selected.rotation}deg)`, maxWidth: selected.rotation % 180 ? "70%" : "100%", maxHeight: selected.rotation % 180 ? "45vw" : "62vh" }} />}
                </div>

                {selected && (
                  <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3"><p className="font-black">Page {selectedIndex + 1} of {pages.length}</p><div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => movePage(selectedIndex, -1)} disabled={selectedIndex === 0}><ArrowLeft className="h-4 w-4" /> Earlier</Button><Button variant="outline" size="sm" onClick={() => movePage(selectedIndex, 1)} disabled={selectedIndex === pages.length - 1}>Later <ArrowRight className="h-4 w-4" /></Button><Button variant="outline" size="sm" onClick={() => rotatePage(selectedIndex)}><RotateCw className="h-4 w-4" /> Rotate</Button><Button variant="outline" size="sm" onClick={() => { setRetakeIndex(selectedIndex); setMode("camera"); }}><RefreshCcw className="h-4 w-4" /> Retake</Button><Button variant="outline" size="sm" onClick={() => deletePage(selectedIndex)}><Trash2 className="h-4 w-4" /> Delete</Button></div></div>
                    {selected.issues.length > 0 ? <ul className="mt-3 space-y-2">{selected.issues.map((issue, issueIndex) => <li key={`${issue.code}-${issueIndex}`} className={`flex items-start gap-2 text-sm font-semibold ${issue.severity === "blocking" ? "text-red-200" : "text-amber-100"}`}><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{issue.message}</li>)}</ul> : <p className="mt-3 flex items-center gap-2 text-sm font-bold text-[#76ecba]"><Check className="h-4 w-4" /> No obvious capture problems detected. Zoom in and confirm small text yourself.</p>}
                  </div>
                )}

                <ol className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5" aria-label="Captured page thumbnails">
                  {pages.map((page, index) => (
                    <li key={page.id}><button type="button" onClick={() => setSelectedIndex(index)} className={`relative w-full overflow-hidden rounded-2xl border bg-black/30 p-2 text-left ${selectedIndex === index ? "border-[#73b8ff] ring-2 ring-[#4da3ff]/30" : "border-white/10"}`} aria-label={`Review page ${index + 1}${page.issues.length ? `, ${page.issues.length} quality warning` : ""}`}><div className="grid aspect-[3/4] place-items-center overflow-hidden rounded-xl bg-black/50"><img src={page.url} alt="" className="max-h-full max-w-full object-contain" style={{ transform: `rotate(${page.rotation}deg)`, maxWidth: page.rotation % 180 ? "72%" : "100%" }} /></div><span className="mt-2 flex items-center justify-between text-xs font-black"><span>Page {index + 1}</span>{page.issues.length > 0 ? <AlertTriangle className={`h-4 w-4 ${page.issues.some((issue) => issue.severity === "blocking") ? "text-red-300" : "text-amber-300"}`} /> : <Check className="h-4 w-4 text-[#76ecba]" />}</span></button></li>
                  ))}
                </ol>
              </>
            )}
          </div>
        </main>
      )}

      {mode === "generating" && <main className="flex min-h-0 flex-1 items-center justify-center p-6 text-center"><div><Loader2 className="mx-auto h-10 w-10 animate-spin text-[#73b8ff]" /><h3 className="mt-5 text-xl font-black">Creating your PDF</h3><p className="mt-2 text-sm font-semibold text-[#c8d3df]">Compressing {pages.length} page{pages.length === 1 ? "" : "s"} without OCR or analysis…</p></div></main>}

      {mode === "ready" && generated && (
        <main className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto p-4 sm:p-6">
          <div className="w-full max-w-lg rounded-3xl border border-white/12 bg-[#0c1728] p-5 shadow-2xl sm:p-8">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#36d399]/15"><FileCheck2 className="h-8 w-8 text-[#76ecba]" /></div>
            <h3 className="mt-5 text-center text-2xl font-black">PDF ready for your confirmation</h3>
            <p className="mt-2 text-center text-sm font-semibold leading-6 text-[#c8d3df]">Nothing has been sent for analysis yet.</p>
            <dl className="mt-6 divide-y divide-white/10 rounded-2xl border border-white/10 bg-black/20 px-4">
              <div className="flex items-start justify-between gap-4 py-3"><dt className="text-sm font-semibold text-[#c8d3df]">Filename</dt><dd className="break-all text-right text-sm font-black">{generated.file.name}</dd></div>
              <div className="flex items-center justify-between gap-4 py-3"><dt className="text-sm font-semibold text-[#c8d3df]">Pages</dt><dd className="text-sm font-black">{generated.metadata.pageCount}</dd></div>
              <div className="flex items-center justify-between gap-4 py-3"><dt className="text-sm font-semibold text-[#c8d3df]">File size</dt><dd className="text-sm font-black">{formatFileSize(generated.file.size)}</dd></div>
            </dl>
            {generated.file.size > maxFileSizeBytes && <div role="alert" className="mt-4 flex items-start gap-2 rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm font-bold text-red-100"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />The PDF exceeds the existing {formatFileSize(maxFileSizeBytes)} upload limit. Nothing was uploaded and no pages were removed. Go back to review or cancel and use Upload Document with a smaller pre-compressed PDF.</div>}
            <p className="mt-5 text-sm font-semibold leading-6 text-[#c8d3df]">By confirming, you send this PDF into HiddenFeeAI’s existing upload and analysis flow. The local camera images are deleted when upload begins.</p>
            <Button variant="violet" size="lg" className="mt-5 w-full" onClick={confirm} disabled={generated.file.size > maxFileSizeBytes}><Check className="h-5 w-5" /> Confirm and send for analysis</Button>
            <Button variant="outline" className="mt-3 w-full" onClick={() => { setGenerated(null); setMode("review"); }}><ArrowLeft className="h-4 w-4" /> Back to pages</Button>
          </div>
        </main>
      )}
    </div>,
    document.body,
  );
}
