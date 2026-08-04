export type ScanIssueCode =
  | "blurry"
  | "dark"
  | "cropped"
  | "glare"
  | "low_resolution"
  | "duplicate";

export type ScanIssueSeverity = "warning" | "blocking";

export interface ScanIssue {
  code: ScanIssueCode;
  severity: ScanIssueSeverity;
  message: string;
}

export interface ScanQualityMetrics {
  averageLuminance: number;
  darkPixelRatio: number;
  clippedBrightRatio: number;
  focusScore: number;
  edgeInkRatio: number;
  edgeDetailRatio: number;
  glareImbalance: number;
  megapixels: number;
}

export interface ScanQualityResult {
  issues: ScanIssue[];
  metrics: ScanQualityMetrics;
  fingerprint: string;
}

export const MAX_SCAN_PAGES = 20;
export type QuarterTurn = 0 | 90 | 180 | 270;

export function rotateClockwise(rotation: QuarterTurn): QuarterTurn {
  return ((rotation + 90) % 360) as QuarterTurn;
}

export function moveListItem<T>(items: readonly T[], index: number, direction: -1 | 1): T[] {
  const destination = index + direction;
  if (index < 0 || index >= items.length || destination < 0 || destination >= items.length) return [...items];
  const next = [...items];
  [next[index], next[destination]] = [next[destination]!, next[index]!];
  return next;
}

export function replaceListItem<T>(items: readonly T[], index: number, replacement: T): T[] {
  if (index < 0 || index >= items.length) return [...items];
  return items.map((item, itemIndex) => itemIndex === index ? replacement : item);
}

export function selectionAfterDelete(lengthBefore: number, deletedIndex: number, selectedIndex: number): number {
  const lengthAfter = Math.max(0, lengthBefore - 1);
  if (!lengthAfter) return 0;
  const shiftedSelection = selectedIndex > deletedIndex ? selectedIndex - 1 : selectedIndex;
  return Math.max(0, Math.min(shiftedSelection, lengthAfter - 1));
}

export function cameraFailureMessage(supported: boolean, errorName = ""): string {
  if (!supported) return "Camera scanning is unavailable in this browser. You can close the scanner and use Upload Document instead.";
  if (errorName === "NotAllowedError" || errorName === "SecurityError") {
    return "Camera permission was denied. Allow camera access in your browser settings, or close the scanner and use Upload Document.";
  }
  return "The camera could not be started. Check that another app is not using it, then try again.";
}

function grayscale(data: Uint8ClampedArray): Uint8Array {
  const output = new Uint8Array(data.length / 4);
  for (let pixel = 0, channel = 0; channel < data.length; pixel += 1, channel += 4) {
    output[pixel] = Math.round(data[channel]! * 0.299 + data[channel + 1]! * 0.587 + data[channel + 2]! * 0.114);
  }
  return output;
}

function focusVariance(gray: Uint8Array, width: number, height: number): number {
  if (width < 3 || height < 3) return 0;
  let sum = 0;
  let sumSquares = 0;
  let count = 0;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x;
      const laplacian = 4 * gray[index]!
        - gray[index - 1]!
        - gray[index + 1]!
        - gray[index - width]!
        - gray[index + width]!;
      sum += laplacian;
      sumSquares += laplacian * laplacian;
      count += 1;
    }
  }
  if (!count) return 0;
  const mean = sum / count;
  return sumSquares / count - mean * mean;
}

function fingerprint(gray: Uint8Array, width: number, height: number): string {
  const cells: number[] = [];
  for (let cellY = 0; cellY < 8; cellY += 1) {
    for (let cellX = 0; cellX < 8; cellX += 1) {
      const startX = Math.floor((cellX * width) / 8);
      const endX = Math.max(startX + 1, Math.floor(((cellX + 1) * width) / 8));
      const startY = Math.floor((cellY * height) / 8);
      const endY = Math.max(startY + 1, Math.floor(((cellY + 1) * height) / 8));
      let sum = 0;
      let count = 0;
      for (let y = startY; y < endY && y < height; y += 1) {
        for (let x = startX; x < endX && x < width; x += 1) {
          sum += gray[y * width + x]!;
          count += 1;
        }
      }
      cells.push(count ? sum / count : 0);
    }
  }
  const mean = cells.reduce((total, value) => total + value, 0) / cells.length;
  return cells.map((value) => value >= mean ? "1" : "0").join("");
}

export function fingerprintDistance(left: string, right: string): number {
  if (left.length !== right.length) return Number.POSITIVE_INFINITY;
  let distance = 0;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) distance += 1;
  }
  return distance;
}

/**
 * Lightweight capture-quality heuristics only. This does not read document text
 * or perform OCR; HiddenFeeAI's existing pipeline remains responsible for that.
 */
export function analyzeScanQuality(
  data: Uint8ClampedArray,
  sampleWidth: number,
  sampleHeight: number,
  sourceWidth: number,
  sourceHeight: number,
): ScanQualityResult {
  const gray = grayscale(data);
  const totalPixels = Math.max(1, gray.length);
  let luminanceTotal = 0;
  let luminanceSquares = 0;
  let darkPixels = 0;
  let clippedBrightPixels = 0;
  let midtonePixels = 0;
  const quadrantBright = [0, 0, 0, 0];
  const quadrantCount = [0, 0, 0, 0];

  for (let y = 0; y < sampleHeight; y += 1) {
    for (let x = 0; x < sampleWidth; x += 1) {
      const value = gray[y * sampleWidth + x]!;
      luminanceTotal += value;
      luminanceSquares += value * value;
      if (value < 55) darkPixels += 1;
      if (value > 248) clippedBrightPixels += 1;
      if (value >= 70 && value <= 225) midtonePixels += 1;
      const quadrant = (y >= sampleHeight / 2 ? 2 : 0) + (x >= sampleWidth / 2 ? 1 : 0);
      quadrantCount[quadrant]! += 1;
      if (value > 248) quadrantBright[quadrant]! += 1;
    }
  }

  const edgeThickness = Math.max(1, Math.floor(Math.min(sampleWidth, sampleHeight) * 0.04));
  let edgeInk = 0;
  let edgeDetail = 0;
  let edgePixels = 0;
  for (let y = 0; y < sampleHeight; y += 1) {
    for (let x = 0; x < sampleWidth; x += 1) {
      if (x >= edgeThickness && x < sampleWidth - edgeThickness && y >= edgeThickness && y < sampleHeight - edgeThickness) continue;
      edgePixels += 1;
      if (gray[y * sampleWidth + x]! < 170) edgeInk += 1;
      const horizontal = x + 1 < sampleWidth ? Math.abs(gray[y * sampleWidth + x]! - gray[y * sampleWidth + x + 1]!) : 0;
      const vertical = y + 1 < sampleHeight ? Math.abs(gray[y * sampleWidth + x]! - gray[(y + 1) * sampleWidth + x]!) : 0;
      if (horizontal + vertical > 55) edgeDetail += 1;
    }
  }

  const averageLuminance = luminanceTotal / totalPixels;
  const luminanceStdDev = Math.sqrt(Math.max(0, luminanceSquares / totalPixels - averageLuminance * averageLuminance));
  const darkPixelRatio = darkPixels / totalPixels;
  const clippedBrightRatio = clippedBrightPixels / totalPixels;
  const focusScore = focusVariance(gray, sampleWidth, sampleHeight);
  const edgeInkRatio = edgePixels ? edgeInk / edgePixels : 0;
  const edgeDetailRatio = edgePixels ? edgeDetail / edgePixels : 0;
  const quadrantRatios = quadrantBright.map((value, index) => value / Math.max(1, quadrantCount[index]!));
  const glareImbalance = Math.max(...quadrantRatios) - Math.min(...quadrantRatios);
  const megapixels = (sourceWidth * sourceHeight) / 1_000_000;
  const shortEdge = Math.min(sourceWidth, sourceHeight);
  const midtoneRatio = midtonePixels / totalPixels;
  const issues: ScanIssue[] = [];

  if (megapixels < 0.5 || shortEdge < 600) {
    issues.push({ code: "low_resolution", severity: "blocking", message: "Resolution is too low to reliably read small print. Retake closer to the page." });
  } else if (megapixels < 1.2 || shortEdge < 900) {
    issues.push({ code: "low_resolution", severity: "warning", message: "Resolution is lower than recommended. Move closer and keep the full page visible." });
  }

  if (averageLuminance < 42 || darkPixelRatio > 0.8) {
    issues.push({ code: "dark", severity: "blocking", message: "This page is too dark to read reliably. Add light and retake it." });
  } else if (averageLuminance < 82 || darkPixelRatio > 0.55) {
    issues.push({ code: "dark", severity: "warning", message: "This page looks dark. More even lighting may improve the report." });
  }

  if (focusScore < 5 && luminanceStdDev > 12) {
    issues.push({ code: "blurry", severity: "blocking", message: "This page appears too blurry to read reliably. Hold still and retake it." });
  } else if (focusScore < 13) {
    issues.push({ code: "blurry", severity: "warning", message: "This page may be blurry. Check small text before continuing." });
  }

  if (edgeInkRatio > 0.12 && edgeDetailRatio > 0.035) {
    issues.push({ code: "cropped", severity: "warning", message: "Content may touch or cross the image edge. Make sure every page corner is visible." });
  }

  if (clippedBrightRatio > 0.06 && midtoneRatio > 0.12 && glareImbalance > 0.2) {
    issues.push({ code: "glare", severity: "warning", message: "A bright glare spot may hide text. Change the camera angle or lighting if needed." });
  }

  return {
    issues,
    metrics: { averageLuminance, darkPixelRatio, clippedBrightRatio, focusScore, edgeInkRatio, edgeDetailRatio, glareImbalance, megapixels },
    fingerprint: fingerprint(gray, sampleWidth, sampleHeight),
  };
}
