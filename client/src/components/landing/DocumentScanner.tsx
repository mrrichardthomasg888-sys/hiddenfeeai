import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { jsPDF } from "jspdf";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  Crop,
  FileCheck2,
  Loader2,
  Plus,
  RefreshCcw,
  RotateCw,
  ScanLine,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cropDocumentImage } from "@/lib/documentCrop";
import {
  defaultCropQuad,
  detectDocumentPage,
  moveCropCorner,
  quadMovement,
  scaleQuad,
  smoothQuad,
  type DetectionWarning,
  type DocumentDetectionResult,
  type DocumentQuad,
} from "@/lib/documentDetection";
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
const JPEG_QUALITY = 0.9;
const PDF_JPEG_QUALITY = 0.82;
const DETECTION_MAX_EDGE = 320;
const STABLE_FRAME_TARGET = 5;

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

interface PendingCapture {
  blob: Blob;
  url: string;
  width: number;
  height: number;
  crop: DocumentQuad;
  resetCrop: DocumentQuad;
  rotation: QuarterTurn;
  warnings: DetectionWarning[];
  automaticallyDetected: boolean;
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

type ScannerMode = "camera" | "crop" | "review" | "generating";
type CropCorner = keyof DocumentQuad;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function thumbnailStatus(page: ScanPage): { label: string; blocking: boolean } {
  const issue = page.issues.find((candidate) => candidate.severity === "blocking") ?? page.issues[0];
  if (!issue) return { label: "Looks clear", blocking: false };
  const labels: Record<ScanIssue["code"], string> = {
    blurry: "Image may be blurry - retake recommended.",
    dark: "Image may be dark - retake recommended.",
    cropped: "Text may touch the crop boundary - check this page.",
    glare: "Glare may hide text - retake recommended.",
    shadows: "Heavy shadows may hide text - retake recommended.",
    perspective: "Page angle may be too steep - check the crop.",
    missing_corners: "Page corners need review.",
    low_resolution: issue.severity === "blocking" ? "Resolution too low - retake required." : "Low resolution - retake recommended.",
    duplicate: "Possible duplicate - confirm both pages belong.",
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
      const rotated = (page.rotation / 90) % 2 === 1;
      const canvas = document.createElement("canvas");
      canvas.width = rotated ? decoded.height : decoded.width;
      canvas.height = rotated ? decoded.width : decoded.height;
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) throw new Error("Document preparation is not supported in this browser.");
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
      const compressed = await canvasToBlob(canvas, PDF_JPEG_QUALITY);
      pdf.addImage(new Uint8Array(await compressed.arrayBuffer()), "JPEG", (pdfWidth - renderedWidth) / 2, (pdfHeight - renderedHeight) / 2, renderedWidth, renderedHeight, undefined, "MEDIUM");
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

function detectionLabel(detection: DocumentDetectionResult | null, stableProgress: number, autoCapture: boolean, detectionSupported: boolean): string {
  if (!detectionSupported) return "Automatic detection unavailable - use manual capture";
  if (!detection?.quad) return "Move the page inside the guide - manual capture is ready";
  if (detection.warnings.length) return detection.warnings[0]!.message;
  if (!autoCapture) return "Page detected - manual capture ready";
  if (stableProgress > 0) return `Hold still - ${Math.round(stableProgress * 100)}%`;
  return "Page detected - hold still";
}

type ZoomCapableTrack = Omit<MediaStreamTrack, "getCapabilities" | "applyConstraints"> & {
  getCapabilities?: () => { zoom?: { min?: number; max?: number } };
  applyConstraints?: (constraints: { advanced: Array<{ zoom: number }> }) => Promise<void>;
};

/** Apply a small optical zoom only when the camera exposes a standard zoom range. */
export async function applyModestCameraZoom(track: MediaStreamTrack): Promise<void> {
  const zoomTrack = track as ZoomCapableTrack;
  const zoom = zoomTrack.getCapabilities?.().zoom;
  if (!zoom || typeof zoomTrack.applyConstraints !== "function") return;
  const minimum = Number(zoom.min ?? 1);
  const maximum = Number(zoom.max ?? minimum);
  if (!Number.isFinite(minimum) || !Number.isFinite(maximum) || maximum <= minimum) return;
  const target = Math.min(maximum, Math.max(minimum, minimum * 1.18));
  if (target <= minimum + 0.01) return;
  try {
    await zoomTrack.applyConstraints({ advanced: [{ zoom: target }] });
  } catch {
    // Zoom is an enhancement; iPhone Safari and older Android browsers safely
    // continue with the camera's default framing when it is unsupported.
  }
}

function cloneQuad(quad: DocumentQuad): DocumentQuad {
  return {
    topLeft: { ...quad.topLeft },
    topRight: { ...quad.topRight },
    bottomRight: { ...quad.bottomRight },
    bottomLeft: { ...quad.bottomLeft },
  };
}

function orientedSize(width: number, height: number, rotation: QuarterTurn): { width: number; height: number } {
  return rotation % 180 ? { width: height, height: width } : { width, height };
}

function toOrientedPoint(point: { x: number; y: number }, width: number, height: number, rotation: QuarterTurn): { x: number; y: number } {
  if (rotation === 90) return { x: height - point.y, y: point.x };
  if (rotation === 180) return { x: width - point.x, y: height - point.y };
  if (rotation === 270) return { x: point.y, y: width - point.x };
  return point;
}

function fromOrientedPoint(point: { x: number; y: number }, width: number, height: number, rotation: QuarterTurn): { x: number; y: number } {
  if (rotation === 90) return { x: point.y, y: height - point.x };
  if (rotation === 180) return { x: width - point.x, y: height - point.y };
  if (rotation === 270) return { x: width - point.y, y: point.x };
  return point;
}

function svgImageTransform(width: number, height: number, rotation: QuarterTurn): string | undefined {
  if (rotation === 90) return `matrix(0 1 -1 0 ${height} 0)`;
  if (rotation === 180) return `matrix(-1 0 0 -1 ${width} ${height})`;
  if (rotation === 270) return `matrix(0 -1 1 0 0 ${width})`;
  return undefined;
}

export function DocumentScanner({ maxFileSizeBytes, onCancel, onConfirm }: DocumentScannerProps) {
  const [mode, setMode] = useState<ScannerMode>("camera");
  const [pages, setPages] = useState<ScanPage[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [retakeIndex, setRetakeIndex] = useState<number | null>(null);
  const [pending, setPending] = useState<PendingCapture | null>(null);
  const [cameraLoading, setCameraLoading] = useState(true);
  const [cameraReady, setCameraReady] = useState(false);
  const [captureBusy, setCaptureBusy] = useState(false);
  const [cropBusy, setCropBusy] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cropError, setCropError] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [autoCapture, setAutoCapture] = useState(true);
  const [detectionSupported, setDetectionSupported] = useState(true);
  const [detection, setDetection] = useState<DocumentDetectionResult | null>(null);
  const [stableProgress, setStableProgress] = useState(0);
  const [draggingCorner, setDraggingCorner] = useState<CropCorner | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cropSvgRef = useRef<SVGSVGElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pagesRef = useRef<ScanPage[]>([]);
  const pendingRef = useRef<PendingCapture | null>(null);
  const detectionRef = useRef<DocumentDetectionResult | null>(null);
  const detectionCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeRef = useRef(true);
  const cameraRequestRef = useRef(0);
  const captureBusyRef = useRef(false);
  const autoCaptureRef = useRef(true);
  const captureRef = useRef<((source?: "manual" | "auto") => Promise<void>) | undefined>(undefined);

  useEffect(() => { pagesRef.current = pages; }, [pages]);
  useEffect(() => { pendingRef.current = pending; }, [pending]);
  useEffect(() => { detectionRef.current = detection; }, [detection]);
  useEffect(() => { autoCaptureRef.current = autoCapture; }, [autoCapture]);

  const stopCamera = useCallback(() => {
    cameraRequestRef.current += 1;
    const stream = streamRef.current;
    streamRef.current = null;
    stream?.getTracks().forEach((track) => track.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraReady(false);
    setDetection(null);
    setStableProgress(0);
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);
    setCameraLoading(true);
    setDetectionSupported(true);
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
        await applyModestCameraZoom(track);
        track.addEventListener("ended", () => {
          if (streamRef.current === stream) {
            setCameraReady(false);
            setCameraError("The camera stopped. Your accepted pages are still here; tap Try camera again to continue.");
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
    streamRef.current?.getTracks().forEach((track) => track.stop());
    pagesRef.current.forEach((page) => URL.revokeObjectURL(page.url));
    if (pendingRef.current) URL.revokeObjectURL(pendingRef.current.url);
  }, []);

  const cancel = useCallback(() => {
    activeRef.current = false;
    stopCamera();
    pagesRef.current.forEach((page) => URL.revokeObjectURL(page.url));
    if (pendingRef.current) URL.revokeObjectURL(pendingRef.current.url);
    pagesRef.current = [];
    pendingRef.current = null;
    setPages([]);
    setPending(null);
    onCancel();
  }, [onCancel, stopCamera]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") cancel(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [cancel]);

  const capture = useCallback(async (source: "manual" | "auto" = "manual") => {
    const video = videoRef.current;
    if (!video || !cameraReady || captureBusyRef.current) return;
    if (retakeIndex === null && pagesRef.current.length >= MAX_SCAN_PAGES) return;
    captureBusyRef.current = true;
    setCaptureBusy(true);
    setCropError(null);
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
      const blob = await canvasToBlob(canvas, JPEG_QUALITY);
      const liveDetection = detectionRef.current;
      const detectedCrop = liveDetection?.quad
        ? scaleQuad(liveDetection.quad, width / liveDetection.frameWidth, height / liveDetection.frameHeight)
        : defaultCropQuad(width, height);
      const warnings = liveDetection?.warnings.length
        ? liveDetection.warnings
        : liveDetection?.quad
          ? []
          : [{ code: "missing_corners", message: "Automatic page edges were not reliable. Check and move all four crop corners." } as DetectionWarning];
      const nextPending: PendingCapture = {
        blob,
        url: URL.createObjectURL(blob),
        width,
        height,
        crop: cloneQuad(detectedCrop),
        resetCrop: cloneQuad(detectedCrop),
        rotation: 0,
        warnings,
        automaticallyDetected: Boolean(liveDetection?.quad),
      };
      setPending(nextPending);
      setMode("crop");
      canvas.width = 1;
      canvas.height = 1;
      window.dispatchEvent(new CustomEvent("hiddenfee:scan-metric", { detail: { event: "page_captured", source, detectionConfidence: liveDetection?.confidence ?? 0 } }));
    } catch (error) {
      setCameraError(error instanceof Error ? error.message : "The page could not be captured.");
    } finally {
      captureBusyRef.current = false;
      setCaptureBusy(false);
    }
  }, [cameraReady, retakeIndex]);
  captureRef.current = capture;

  useEffect(() => {
    if (mode !== "camera" || !cameraReady || cameraError) return;
    let stopped = false;
    let timer = 0;
    let previousQuad: DocumentQuad | null = null;
    let stableFrames = 0;

    const detectFrame = () => {
      timer = window.setTimeout(() => {
        if (stopped || captureBusyRef.current) return;
        const video = videoRef.current;
        if (!video?.videoWidth || !video.videoHeight) {
          detectFrame();
          return;
        }
        try {
          const scale = Math.min(1, DETECTION_MAX_EDGE / Math.max(video.videoWidth, video.videoHeight));
          const width = Math.max(48, Math.round(video.videoWidth * scale));
          const height = Math.max(48, Math.round(video.videoHeight * scale));
          const canvas = detectionCanvasRef.current ?? document.createElement("canvas");
          detectionCanvasRef.current = canvas;
          canvas.width = width;
          canvas.height = height;
          const context = canvas.getContext("2d", { willReadFrequently: true });
          if (!context) throw new Error("Canvas unavailable");
          context.drawImage(video, 0, 0, width, height);
          const frame = context.getImageData(0, 0, width, height);
          const raw = detectDocumentPage(frame.data, width, height);
          const smoothed = raw.quad ? smoothQuad(previousQuad, raw.quad) : null;
          const movement = quadMovement(previousQuad, smoothed, width, height);
          if (raw.canAutoCapture && smoothed && movement < 0.012) stableFrames += 1;
          else stableFrames = raw.canAutoCapture && smoothed ? 1 : 0;
          previousQuad = smoothed;
          const nextDetection = { ...raw, quad: smoothed };
          detectionRef.current = nextDetection;
          setDetection(nextDetection);
          const progress = Math.min(1, stableFrames / STABLE_FRAME_TARGET);
          setStableProgress(progress);
          if (autoCaptureRef.current && stableFrames >= STABLE_FRAME_TARGET) {
            stableFrames = 0;
            void captureRef.current?.("auto");
            return;
          }
          detectFrame();
        } catch {
          setDetectionSupported(false);
          setDetection(null);
          setStableProgress(0);
        }
      }, 180);
    };
    detectFrame();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [cameraError, cameraReady, mode]);

  useEffect(() => {
    if (!draggingCorner) return;
    const onMove = (event: PointerEvent) => {
      const svg = cropSvgRef.current;
      if (!svg) return;
      event.preventDefault();
      const bounds = svg.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      setPending((current) => current ? {
        ...current,
        crop: moveCropCorner(current.crop, draggingCorner, {
          ...fromOrientedPoint({
            x: ((event.clientX - bounds.left) / bounds.width) * orientedSize(current.width, current.height, current.rotation).width,
            y: ((event.clientY - bounds.top) / bounds.height) * orientedSize(current.width, current.height, current.rotation).height,
          }, current.width, current.height, current.rotation),
        }, current.width, current.height),
      } : current);
    };
    const onUp = () => setDraggingCorner(null);
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [draggingCorner]);

  const retakePending = () => {
    if (pendingRef.current) URL.revokeObjectURL(pendingRef.current.url);
    pendingRef.current = null;
    setPending(null);
    setCropError(null);
    setMode("camera");
  };

  const acceptPage = async () => {
    if (!pending || cropBusy) return;
    setCropBusy(true);
    setCropError(null);
    const startedAt = performance.now();
    try {
      const cropped = await cropDocumentImage(pending.blob, pending.crop);
      const quality = analyzeScanQuality(cropped.sampleData, cropped.sampleWidth, cropped.sampleHeight, cropped.width, cropped.height);
      const duplicateOf = pagesRef.current.findIndex((page, index) => index !== retakeIndex && fingerprintDistance(page.fingerprint, quality.fingerprint) <= 3);
      const issues = duplicateOf >= 0
        ? [...quality.issues, { code: "duplicate", severity: "warning", message: `This resembles page ${duplicateOf + 1}. Keep it only if both pages belong in the document.` } as ScanIssue]
        : quality.issues;
      const page: ScanPage = {
        id: crypto.randomUUID(),
        blob: cropped.blob,
        url: URL.createObjectURL(cropped.blob),
        width: cropped.width,
        height: cropped.height,
        rotation: pending.rotation,
        issues,
        fingerprint: quality.fingerprint,
      };
      let nextPages: ScanPage[];
      let nextSelected: number;
      if (retakeIndex !== null) {
        const replaced = pagesRef.current[retakeIndex];
        if (replaced) URL.revokeObjectURL(replaced.url);
        nextPages = replaceListItem(pagesRef.current, retakeIndex, page);
        nextSelected = retakeIndex;
      } else {
        nextPages = [...pagesRef.current, page];
        nextSelected = nextPages.length - 1;
      }
      URL.revokeObjectURL(pending.url);
      pendingRef.current = null;
      setPending(null);
      setPages(nextPages);
      setSelectedIndex(nextSelected);
      setRetakeIndex(null);
      setMode("review");
      window.dispatchEvent(new CustomEvent("hiddenfee:scan-metric", { detail: { event: "crop_accepted", cropTimeMs: performance.now() - startedAt, width: cropped.width, height: cropped.height } }));
    } catch (error) {
      setCropError(error instanceof Error ? error.message : "The page could not be cropped. Your original photo is still available.");
    } finally {
      setCropBusy(false);
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
    setPages((current) => current.map((page, pageIndex) => pageIndex === index ? { ...page, rotation: rotateClockwise(page.rotation) } : page));
  };

  const addPage = () => {
    setRetakeIndex(null);
    setPdfError(null);
    setMode("camera");
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
  const cameraStatus = detectionLabel(detection, stableProgress, autoCapture, detectionSupported);
  const cropPoints = pending ? [pending.crop.topLeft, pending.crop.topRight, pending.crop.bottomRight, pending.crop.bottomLeft].map((point) => {
    const oriented = toOrientedPoint(point, pending.width, pending.height, pending.rotation);
    return `${oriented.x},${oriented.y}`;
  }).join(" ") : "";
  const cropOrientedSize = pending ? orientedSize(pending.width, pending.height, pending.rotation) : { width: 1, height: 1 };
  const cropCorners: Array<[CropCorner, string]> = [["topLeft", "top left"], ["topRight", "top right"], ["bottomRight", "bottom right"], ["bottomLeft", "bottom left"]];

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#050911] text-white" role="dialog" aria-modal="true" aria-labelledby="scan-title">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-[#081220] px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-[#73b8ff]" />
            <h2 id="scan-title" className="truncate text-base font-black sm:text-lg">Scan With Camera <span className="ml-1 rounded-full border border-[#f4c542]/25 bg-[#f4c542]/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-[#f8d96e]">Beta</span></h2>
          </div>
          <p className="mt-0.5 text-xs font-semibold text-[#c8d3df]">Camera frames stay on this device. Only accepted pages are uploaded.</p>
        </div>
        <button type="button" onClick={cancel} className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-white/15 bg-white/5" aria-label="Cancel scan and delete captured pages"><X className="h-5 w-5" /></button>
      </header>

      {mode === "camera" && (
        <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="relative min-h-0 flex-1 bg-black">
            <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-contain" aria-label="Camera preview" />
            {!detection?.quad && (
              <div className="pointer-events-none absolute inset-[5%] rounded-2xl border border-dashed border-white/45" aria-label="Manual page framing guide">
                <span className="absolute left-0 top-0 h-7 w-7 -translate-x-px -translate-y-px rounded-tl-xl border-l-4 border-t-4 border-[#f8d96e]" />
                <span className="absolute right-0 top-0 h-7 w-7 translate-x-px -translate-y-px rounded-tr-xl border-r-4 border-t-4 border-[#f8d96e]" />
                <span className="absolute bottom-0 left-0 h-7 w-7 -translate-x-px translate-y-px rounded-bl-xl border-b-4 border-l-4 border-[#f8d96e]" />
                <span className="absolute bottom-0 right-0 h-7 w-7 translate-x-px translate-y-px rounded-br-xl border-b-4 border-r-4 border-[#f8d96e]" />
              </div>
            )}
            {detection?.quad && (
              <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${detection.frameWidth} ${detection.frameHeight}`} preserveAspectRatio="xMidYMid meet" aria-label="Detected page outline">
                <polygon points={[detection.quad.topLeft, detection.quad.topRight, detection.quad.bottomRight, detection.quad.bottomLeft].map((point) => `${point.x},${point.y}`).join(" ")} fill="rgba(77,163,255,.10)" stroke={detection.canAutoCapture ? "#76ecba" : "#f8d96e"} strokeWidth="3" strokeLinejoin="round" />
                {[detection.quad.topLeft, detection.quad.topRight, detection.quad.bottomRight, detection.quad.bottomLeft].map((point, index) => <circle key={index} cx={point.x} cy={point.y} r="5" fill={detection.canAutoCapture ? "#76ecba" : "#f8d96e"} />)}
              </svg>
            )}
            <div className="absolute left-1/2 top-3 w-[min(92%,380px)] -translate-x-1/2 text-center">
              <div className="inline-flex rounded-full bg-black/75 px-4 py-2 text-sm font-black backdrop-blur">{retakeIndex === null ? `Page ${nextPageNumber} of ${MAX_SCAN_PAGES}` : `Retake page ${nextPageNumber}`}</div>
              {!cameraLoading && !cameraError && <p className={`mt-2 rounded-xl px-3 py-2 text-xs font-bold backdrop-blur ${detection?.canAutoCapture ? "bg-emerald-950/85 text-emerald-100" : "bg-black/75 text-amber-100"}`} aria-live="polite">{cameraStatus}</p>}
            </div>
            {cameraLoading && <div className="absolute inset-0 flex items-center justify-center bg-[#050911]/85"><Loader2 className="h-8 w-8 animate-spin text-[#73b8ff]" /><span className="ml-3 font-bold">Starting camera...</span></div>}
            {cameraError && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#050911]/95 p-6 text-center">
                <div className="max-w-sm"><ShieldAlert className="mx-auto h-10 w-10 text-[#f8d96e]" /><p role="alert" className="mt-4 font-bold leading-7">{cameraError}</p><Button variant="outline" className="mt-5" onClick={() => void startCamera()}><RefreshCcw className="h-4 w-4" /> Try camera again</Button></div>
              </div>
            )}
          </div>
          <div className="shrink-0 border-t border-white/10 bg-[#081220] px-3 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3 sm:px-5">
            <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
              <label className="flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-bold text-[#d9e3ec]"><input type="checkbox" checked={autoCapture} onChange={(event) => setAutoCapture(event.target.checked)} className="h-4 w-4 accent-[#4da3ff]" /> Assisted auto-capture</label>
              <p className="text-right text-[11px] font-semibold leading-4 text-[#aebdca]">Manual capture always available<br />{pages.length}/{MAX_SCAN_PAGES} accepted</p>
            </div>
            <div className="mt-2 flex items-center justify-center gap-4">
              {pages.length > 0 && <Button variant="outline" onClick={() => setMode("review")}>Review {pages.length}</Button>}
              <button type="button" onClick={() => void capture("manual")} disabled={!cameraReady || captureBusy || (retakeIndex === null && pages.length >= MAX_SCAN_PAGES)} className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-[#4da3ff] text-[#06111f] shadow-[0_0_0_4px_rgba(77,163,255,.28)] disabled:opacity-40" aria-label={retakeIndex === null ? `Capture page ${nextPageNumber}` : `Retake page ${nextPageNumber}`}>
                {captureBusy ? <Loader2 className="h-7 w-7 animate-spin" /> : <Camera className="h-7 w-7" />}
              </button>
              <span className="w-[86px] text-center text-xs font-bold text-[#c8d3df]">Capture<br />manually</span>
            </div>
          </div>
        </main>
      )}

      {mode === "crop" && pending && (
        <main className="min-h-0 flex-1 overflow-y-auto px-3 py-3 pb-[calc(16px+env(safe-area-inset-bottom))] sm:px-6">
          <div className="mx-auto max-w-2xl">
            <div className="flex items-center justify-between gap-3"><div><h3 className="text-lg font-black">Review crop</h3><p className="text-xs font-semibold text-[#c8d3df]">Page {nextPageNumber} - drag every corner outside the paper.</p></div><span className="rounded-full border border-white/10 px-3 py-1 text-xs font-black">{nextPageNumber} of {Math.max(nextPageNumber, pages.length + (retakeIndex === null ? 1 : 0))}</span></div>
            <div className="mt-3 rounded-xl border border-[#4da3ff]/35 bg-[#07101c] p-2">
              <div className="relative mx-auto max-w-full overflow-hidden" style={{ aspectRatio: `${cropOrientedSize.width} / ${cropOrientedSize.height}`, width: `min(100%, ${(cropOrientedSize.width / cropOrientedSize.height) * 58}vh)` }}>
                <svg ref={cropSvgRef} className="absolute inset-0 h-full w-full touch-none" viewBox={`0 0 ${cropOrientedSize.width} ${cropOrientedSize.height}`} preserveAspectRatio="none" aria-label="Manual crop area">
                  <image href={pending.url} width={pending.width} height={pending.height} transform={svgImageTransform(pending.width, pending.height, pending.rotation)} aria-label={`Uncropped original for page ${nextPageNumber}`} />
                  <defs><mask id="crop-mask"><rect width="100%" height="100%" fill="white" /><polygon points={cropPoints} fill="black" /></mask></defs>
                  <rect width="100%" height="100%" fill="rgba(0,0,0,.48)" mask="url(#crop-mask)" />
                  <polygon points={cropPoints} fill="rgba(77,163,255,.08)" stroke="#73b8ff" strokeWidth={Math.max(5, pending.width * 0.004)} strokeLinejoin="round" />
                  {cropCorners.map(([corner, label]) => {
                    const point = pending.crop[corner];
                    const orientedPoint = toOrientedPoint(point, pending.width, pending.height, pending.rotation);
                    return <circle key={corner} role="slider" tabIndex={0} aria-label={`Drag ${label} crop corner`} aria-valuetext={`${Math.round(point.x)}, ${Math.round(point.y)}`} cx={orientedPoint.x} cy={orientedPoint.y} r={Math.max(24, cropOrientedSize.width * 0.018)} fill="#f8d96e" stroke="#081220" strokeWidth={Math.max(6, cropOrientedSize.width * 0.004)} className="cursor-grab" onPointerDown={(event) => { event.preventDefault(); setDraggingCorner(corner); }} onKeyDown={(event) => {
                      const step = event.shiftKey ? 20 : 6;
                      const delta = event.key === "ArrowLeft" ? { x: -step, y: 0 } : event.key === "ArrowRight" ? { x: step, y: 0 } : event.key === "ArrowUp" ? { x: 0, y: -step } : event.key === "ArrowDown" ? { x: 0, y: step } : null;
                      if (!delta) return;
                      event.preventDefault();
                      setPending((current) => current ? { ...current, crop: moveCropCorner(current.crop, corner, { x: current.crop[corner].x + delta.x, y: current.crop[corner].y + delta.y }, current.width, current.height) } : current);
                    }} />;
                  })}
                </svg>
              </div>
            </div>
            <div className={`mt-2 rounded-xl border p-3 text-xs font-bold ${pending.warnings.length ? "border-amber-300/30 bg-amber-300/10 text-amber-100" : "border-emerald-300/20 bg-emerald-300/[0.08] text-emerald-100"}`}>
              {pending.warnings.length ? <ul className="space-y-1.5">{pending.warnings.map((warning) => <li key={warning.code} className="flex gap-2"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{warning.message}</li>)}</ul> : <p className="flex gap-2"><Check className="h-4 w-4 shrink-0" />All four page edges were detected. Confirm no text is outside the blue outline.</p>}
            </div>
            {cropError && <p role="alert" className="mt-2 rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-xs font-bold text-red-100">{cropError}</p>}
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Button variant="outline" size="sm" onClick={() => setPending((current) => current ? { ...current, crop: cloneQuad(current.resetCrop) } : current)}><Crop className="h-4 w-4" /> Reset Crop</Button>
              <Button variant="outline" size="sm" onClick={() => setPending((current) => current ? { ...current, rotation: rotateClockwise(current.rotation) } : current)}><RotateCw className="h-4 w-4" /> Rotate</Button>
              <Button variant="outline" size="sm" onClick={retakePending}><RefreshCcw className="h-4 w-4" /> Retake</Button>
              <Button variant="violet" size="sm" onClick={() => void acceptPage()} disabled={cropBusy}>{cropBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Accept Page</Button>
            </div>
            <p className="mt-2 text-center text-[11px] font-semibold text-[#9eacba]">The uncropped original stays only on this device until you accept or retake this page.</p>
          </div>
        </main>
      )}

      {mode === "review" && (
        <main className="min-h-0 flex-1 overflow-y-auto px-3 py-3 pb-[calc(18px+env(safe-area-inset-bottom))] sm:px-6 sm:py-5">
          <div className="mx-auto max-w-3xl">
            <div><h3 className="text-lg font-black sm:text-xl">Review the complete document</h3><p className="mt-0.5 text-xs font-semibold leading-5 text-[#c8d3df] sm:text-sm">Scan a page, review it, add another, then continue when every page is present.</p></div>

            {pages.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-white/20 p-6 text-center"><p className="font-bold">No accepted pages.</p><Button variant="outline" className="mt-3" onClick={addPage}><Camera className="h-4 w-4" /> Capture page 1</Button></div>
            ) : (
              <>
                <ol className="mt-3 flex snap-x gap-2 overflow-x-auto pb-2" aria-label="Captured page thumbnails">
                  {pages.map((page, index) => {
                    const status = thumbnailStatus(page);
                    return (
                      <li key={page.id} className="w-28 shrink-0 snap-start">
                        <button type="button" onClick={() => setSelectedIndex(index)} className={`h-full w-full overflow-hidden rounded-xl border p-1.5 text-left transition ${status.blocking ? "border-red-400/70 bg-red-400/10" : page.issues.length ? "border-amber-300/60 bg-amber-300/[0.08]" : selectedIndex === index ? "border-[#73b8ff] bg-[#4da3ff]/10 ring-1 ring-[#4da3ff]/40" : "border-white/12 bg-white/[0.035]"}`} aria-label={`Review page ${index + 1}, ${status.label}`}>
                          <div className="grid h-24 place-items-center overflow-hidden rounded-lg bg-black/45"><img src={page.url} alt="" className="max-h-full max-w-full object-contain" style={{ transform: `rotate(${page.rotation}deg)`, maxWidth: page.rotation % 180 ? "72%" : "100%" }} /></div>
                          <span className="mt-1.5 flex items-center justify-between gap-1 text-xs font-black"><span>Page {index + 1}</span>{page.issues.length ? <AlertTriangle className={`h-4 w-4 shrink-0 ${status.blocking ? "text-red-300" : "text-amber-300"}`} /> : <Check className="h-4 w-4 shrink-0 text-[#76ecba]" />}</span>
                          <span className={`mt-0.5 block line-clamp-2 text-[10px] font-bold leading-3.5 ${status.blocking ? "text-red-200" : page.issues.length ? "text-amber-100" : "text-[#9ddfc5]"}`}>{status.label}</span>
                        </button>
                      </li>
                    );
                  })}
                  <li className="w-24 shrink-0 snap-start"><button type="button" onClick={addPage} disabled={pages.length >= MAX_SCAN_PAGES} className="flex h-full min-h-32 w-full flex-col items-center justify-center rounded-xl border border-dashed border-[#73b8ff]/55 bg-[#4da3ff]/[0.08] text-xs font-black text-[#ddecff] disabled:opacity-40" aria-label="Add another page"><Plus className="mb-2 h-7 w-7" />Add Page</button></li>
                </ol>

                {selected && (
                  <section className="mt-2 rounded-2xl border border-white/10 bg-white/[0.035] p-3" aria-label={`Edit page ${selectedIndex + 1}`}>
                    <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-black">Selected: Page {selectedIndex + 1}</p><p className="text-[11px] font-semibold text-[#aebdca]">Tap a thumbnail to select another page.</p></div><span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-bold text-[#c8d3df]">{selectedIndex + 1} of {pages.length}</span></div>
                    <div className="mt-2 grid max-h-[38vh] min-h-44 place-items-center overflow-hidden rounded-xl bg-black/40 p-2"><img src={selected.url} alt={`Full preview of page ${selectedIndex + 1}`} className="max-h-[36vh] max-w-full object-contain transition-transform" style={{ transform: `rotate(${selected.rotation}deg)`, maxWidth: selected.rotation % 180 ? "72%" : "100%" }} /></div>
                    {selected.issues.length > 0 ? <ul className="mt-2 space-y-1.5">{selected.issues.map((issue, issueIndex) => <li key={`${issue.code}-${issueIndex}`} className={`flex items-start gap-2 rounded-lg px-2.5 py-2 text-xs font-bold ${issue.severity === "blocking" ? "bg-red-400/10 text-red-200" : "bg-amber-300/10 text-amber-100"}`}><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{issue.message}</li>)}</ul> : <p className="mt-2 flex items-center gap-2 text-xs font-bold text-[#76ecba]"><Check className="h-4 w-4" /> No obvious capture problems detected.</p>}
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5"><Button variant="outline" size="sm" onClick={() => movePage(selectedIndex, -1)} disabled={selectedIndex === 0}><ArrowLeft className="h-4 w-4" /> Earlier</Button><Button variant="outline" size="sm" onClick={() => movePage(selectedIndex, 1)} disabled={selectedIndex === pages.length - 1}>Later <ArrowRight className="h-4 w-4" /></Button><Button variant="outline" size="sm" onClick={() => rotatePage(selectedIndex)}><RotateCw className="h-4 w-4" /> Rotate</Button><Button variant="outline" size="sm" onClick={() => { setRetakeIndex(selectedIndex); setMode("camera"); }}><RefreshCcw className="h-4 w-4" /> Retake</Button><Button variant="outline" size="sm" className="col-span-2 text-red-100 sm:col-span-1" onClick={() => deletePage(selectedIndex)}><Trash2 className="h-4 w-4" /> Delete</Button></div>
                  </section>
                )}

                {(blockingCount > 0 || pdfError) && <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-xs font-bold text-red-100" role="alert"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span>{pdfError || `${blockingCount} unreadable page issue${blockingCount === 1 ? "" : "s"} must be retaken before analysis. No pages will be discarded.`}</span></div>}
                <Button variant="outline" className="mt-3 w-full border-[#4da3ff]/60 bg-[#4da3ff]/10 text-[#ddecff]" onClick={addPage} disabled={pages.length >= MAX_SCAN_PAGES}><Plus className="h-5 w-5" /> + Add Page</Button>
                <Button variant="violet" size="lg" className="mt-3 w-full" onClick={() => void continueToAnalysis()} disabled={!pages.length || blockingCount > 0}><FileCheck2 className="h-5 w-5" /> Continue to Analysis</Button>
                <p className="mt-2 text-center text-[11px] font-semibold leading-4 text-[#9eacba]">Every accepted page is combined in the order shown and sent through the existing HiddenFeeAI upload flow.</p>
              </>
            )}
          </div>
        </main>
      )}

      {mode === "generating" && <main className="flex min-h-0 flex-1 items-center justify-center p-6 text-center"><div><Loader2 className="mx-auto h-10 w-10 animate-spin text-[#73b8ff]" /><h3 className="mt-4 text-xl font-black">Preparing your document</h3><p className="mt-2 text-sm font-semibold text-[#c8d3df]">Combining {pages.length} page{pages.length === 1 ? "" : "s"} in the reviewed order, then continuing to analysis...</p></div></main>}
    </div>,
    document.body,
  );
}
