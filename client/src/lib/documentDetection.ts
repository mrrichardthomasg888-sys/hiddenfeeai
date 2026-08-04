export interface DocumentPoint {
  x: number;
  y: number;
}

export interface DocumentQuad {
  topLeft: DocumentPoint;
  topRight: DocumentPoint;
  bottomRight: DocumentPoint;
  bottomLeft: DocumentPoint;
}

export type DetectionWarningCode =
  | "missing_corners"
  | "blur"
  | "glare"
  | "low_light"
  | "shadows"
  | "perspective"
  | "outside_frame";

export interface DetectionWarning {
  code: DetectionWarningCode;
  message: string;
}

export interface DocumentDetectionResult {
  quad: DocumentQuad | null;
  confidence: number;
  canAutoCapture: boolean;
  warnings: DetectionWarning[];
  frameWidth: number;
  frameHeight: number;
  focusScore: number;
}

const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value));

function distance(left: DocumentPoint, right: DocumentPoint): number {
  return Math.hypot(right.x - left.x, right.y - left.y);
}

function grayscale(data: Uint8ClampedArray): Uint8Array {
  const gray = new Uint8Array(data.length / 4);
  for (let pixel = 0, channel = 0; channel < data.length; pixel += 1, channel += 4) {
    gray[pixel] = Math.round(data[channel]! * 0.299 + data[channel + 1]! * 0.587 + data[channel + 2]! * 0.114);
  }
  return gray;
}

function laplacianVariance(gray: Uint8Array, width: number, height: number): number {
  let sum = 0;
  let sumSquares = 0;
  let count = 0;
  for (let y = 1; y < height - 1; y += 2) {
    for (let x = 1; x < width - 1; x += 2) {
      const index = y * width + x;
      const value = 4 * gray[index]!
        - gray[index - 1]!
        - gray[index + 1]!
        - gray[index - width]!
        - gray[index + width]!;
      sum += value;
      sumSquares += value * value;
      count += 1;
    }
  }
  if (!count) return 0;
  const mean = sum / count;
  return sumSquares / count - mean * mean;
}

function lineAt(samples: Array<{ major: number; minor: number }>, major: number): number | null {
  if (samples.length < 6) return null;
  const sorted = [...samples].sort((left, right) => left.major - right.major);
  const window = Math.max(3, Math.floor(sorted.length * 0.18));
  const start = sorted.slice(0, window);
  const end = sorted.slice(-window);
  const startMajor = start.reduce((total, sample) => total + sample.major, 0) / start.length;
  const startMinor = start.reduce((total, sample) => total + sample.minor, 0) / start.length;
  const endMajor = end.reduce((total, sample) => total + sample.major, 0) / end.length;
  const endMinor = end.reduce((total, sample) => total + sample.minor, 0) / end.length;
  if (Math.abs(endMajor - startMajor) < 1) return (startMinor + endMinor) / 2;
  return startMinor + ((major - startMajor) / (endMajor - startMajor)) * (endMinor - startMinor);
}

function polygonArea(quad: DocumentQuad): number {
  const points = [quad.topLeft, quad.topRight, quad.bottomRight, quad.bottomLeft];
  let area = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index]!;
    const next = points[(index + 1) % points.length]!;
    area += current.x * next.y - next.x * current.y;
  }
  return Math.abs(area) / 2;
}

export function defaultCropQuad(width: number, height: number, insetRatio = 0.015): DocumentQuad {
  const insetX = width * insetRatio;
  const insetY = height * insetRatio;
  return {
    topLeft: { x: insetX, y: insetY },
    topRight: { x: width - insetX, y: insetY },
    bottomRight: { x: width - insetX, y: height - insetY },
    bottomLeft: { x: insetX, y: height - insetY },
  };
}

interface QuadEvidence {
  quad: DocumentQuad;
  support: number;
  areaRatio: number;
  confidence: number;
}

function quadFromSamples(
  leftSamples: Array<{ major: number; minor: number }>,
  rightSamples: Array<{ major: number; minor: number }>,
  topSamples: Array<{ major: number; minor: number }>,
  bottomSamples: Array<{ major: number; minor: number }>,
  width: number,
  height: number,
  contrastConfidence: number,
): QuadEvidence {
  const support = Math.min(leftSamples.length / (height * 0.34), topSamples.length / (width * 0.34), 1);
  const estimatedTop = topSamples.length ? Math.min(...topSamples.map((sample) => sample.minor)) : 0;
  const estimatedBottom = bottomSamples.length ? Math.max(...bottomSamples.map((sample) => sample.minor)) : height;
  const estimatedLeft = leftSamples.length ? Math.min(...leftSamples.map((sample) => sample.minor)) : 0;
  const estimatedRight = rightSamples.length ? Math.max(...rightSamples.map((sample) => sample.minor)) : width;
  const topY = clamp(estimatedTop, 0, height);
  const bottomY = clamp(estimatedBottom, 0, height);
  const leftX = clamp(estimatedLeft, 0, width);
  const rightX = clamp(estimatedRight, 0, width);
  const quad: DocumentQuad = {
    topLeft: { x: clamp(lineAt(leftSamples, topY) ?? leftX, 0, width), y: clamp(lineAt(topSamples, leftX) ?? topY, 0, height) },
    topRight: { x: clamp(lineAt(rightSamples, topY) ?? rightX, 0, width), y: clamp(lineAt(topSamples, rightX) ?? topY, 0, height) },
    bottomRight: { x: clamp(lineAt(rightSamples, bottomY) ?? rightX, 0, width), y: clamp(lineAt(bottomSamples, rightX) ?? bottomY, 0, height) },
    bottomLeft: { x: clamp(lineAt(leftSamples, bottomY) ?? leftX, 0, width), y: clamp(lineAt(bottomSamples, leftX) ?? bottomY, 0, height) },
  };
  const areaRatio = polygonArea(quad) / (width * height);
  return {
    quad,
    support,
    areaRatio,
    confidence: clamp(support * 0.62 + contrastConfidence * 0.18 + clamp(areaRatio / 0.5, 0, 1) * 0.2, 0, 1),
  };
}

/**
 * Finds page boundaries from contrast rather than page brightness.  The original
 * detector only followed a bright region, which fails for off-white paper on a
 * light table, receipts, and colored paper.  Here we look for long horizontal
 * and vertical intensity transitions on opposite sides of the frame.  This is
 * intentionally lightweight enough to run on a 320px camera frame.
 */
function edgeSamples(gray: Uint8Array, width: number, height: number, minimumStrength: number) {
  const left: Array<{ major: number; minor: number }> = [];
  const right: Array<{ major: number; minor: number }> = [];
  const top: Array<{ major: number; minor: number }> = [];
  const bottom: Array<{ major: number; minor: number }> = [];
  const xInset = Math.max(2, Math.round(width * 0.025));
  const yInset = Math.max(2, Math.round(height * 0.025));
  const leftEnd = Math.floor(width * 0.48);
  const rightStart = Math.ceil(width * 0.52);
  const topEnd = Math.floor(height * 0.48);
  const bottomStart = Math.ceil(height * 0.52);

  for (let y = yInset; y < height - yInset; y += 2) {
    let leftX = -1;
    let rightX = -1;
    let leftStrength = 0;
    let rightStrength = 0;
    for (let x = xInset; x < width - xInset; x += 1) {
      const strength = Math.abs(gray[y * width + x + 1]! - gray[y * width + x - 1]!);
      if (x <= leftEnd && strength > leftStrength) { leftStrength = strength; leftX = x; }
      if (x >= rightStart && strength > rightStrength) { rightStrength = strength; rightX = x; }
    }
    if (leftStrength >= minimumStrength && rightStrength >= minimumStrength && rightX - leftX >= width * 0.24) {
      left.push({ major: y, minor: leftX });
      right.push({ major: y, minor: rightX });
    }
  }

  for (let x = xInset; x < width - xInset; x += 2) {
    let topY = -1;
    let bottomY = -1;
    let topStrength = 0;
    let bottomStrength = 0;
    for (let y = yInset; y < height - yInset; y += 1) {
      const strength = Math.abs(gray[(y + 1) * width + x]! - gray[(y - 1) * width + x]!);
      if (y <= topEnd && strength > topStrength) { topStrength = strength; topY = y; }
      if (y >= bottomStart && strength > bottomStrength) { bottomStrength = strength; bottomY = y; }
    }
    if (topStrength >= minimumStrength && bottomStrength >= minimumStrength && bottomY - topY >= height * 0.24) {
      top.push({ major: x, minor: topY });
      bottom.push({ major: x, minor: bottomY });
    }
  }
  return { left, right, top, bottom };
}

export function scaleQuad(quad: DocumentQuad, scaleX: number, scaleY: number): DocumentQuad {
  return {
    topLeft: { x: quad.topLeft.x * scaleX, y: quad.topLeft.y * scaleY },
    topRight: { x: quad.topRight.x * scaleX, y: quad.topRight.y * scaleY },
    bottomRight: { x: quad.bottomRight.x * scaleX, y: quad.bottomRight.y * scaleY },
    bottomLeft: { x: quad.bottomLeft.x * scaleX, y: quad.bottomLeft.y * scaleY },
  };
}

export function smoothQuad(previous: DocumentQuad | null, next: DocumentQuad, amount = 0.36): DocumentQuad {
  if (!previous) return next;
  const mix = (left: DocumentPoint, right: DocumentPoint): DocumentPoint => ({
    x: left.x + (right.x - left.x) * amount,
    y: left.y + (right.y - left.y) * amount,
  });
  return {
    topLeft: mix(previous.topLeft, next.topLeft),
    topRight: mix(previous.topRight, next.topRight),
    bottomRight: mix(previous.bottomRight, next.bottomRight),
    bottomLeft: mix(previous.bottomLeft, next.bottomLeft),
  };
}

export function quadMovement(left: DocumentQuad | null, right: DocumentQuad | null, width: number, height: number): number {
  if (!left || !right) return Number.POSITIVE_INFINITY;
  const diagonal = Math.max(1, Math.hypot(width, height));
  return (
    distance(left.topLeft, right.topLeft)
    + distance(left.topRight, right.topRight)
    + distance(left.bottomRight, right.bottomRight)
    + distance(left.bottomLeft, right.bottomLeft)
  ) / (4 * diagonal);
}

export function moveCropCorner(quad: DocumentQuad, corner: keyof DocumentQuad, point: DocumentPoint, width: number, height: number): DocumentQuad {
  const minimumGap = Math.max(24, Math.min(width, height) * 0.06);
  const next = { ...quad };
  if (corner === "topLeft") next.topLeft = { x: clamp(point.x, 0, quad.topRight.x - minimumGap), y: clamp(point.y, 0, quad.bottomLeft.y - minimumGap) };
  if (corner === "topRight") next.topRight = { x: clamp(point.x, quad.topLeft.x + minimumGap, width), y: clamp(point.y, 0, quad.bottomRight.y - minimumGap) };
  if (corner === "bottomRight") next.bottomRight = { x: clamp(point.x, quad.bottomLeft.x + minimumGap, width), y: clamp(point.y, quad.topRight.y + minimumGap, height) };
  if (corner === "bottomLeft") next.bottomLeft = { x: clamp(point.x, 0, quad.bottomRight.x - minimumGap), y: clamp(point.y, quad.topLeft.y + minimumGap, height) };
  return next;
}

/**
 * Lightweight local page detector. It analyzes a downscaled frame and looks for
 * a large bright rectangular region with supported edges. It intentionally
 * returns no quad when confidence is low so manual capture/cropping stays safe.
 */
export function detectDocumentPage(data: Uint8ClampedArray, width: number, height: number): DocumentDetectionResult {
  const warnings: DetectionWarning[] = [];
  if (width < 48 || height < 48 || data.length < width * height * 4) {
    return { quad: null, confidence: 0, canAutoCapture: false, warnings: [{ code: "missing_corners", message: "All four page corners are not visible." }], frameWidth: width, frameHeight: height, focusScore: 0 };
  }

  const gray = grayscale(data);
  let sum = 0;
  let sumSquares = 0;
  let dark = 0;
  let clipped = 0;
  const quadrantSums = [0, 0, 0, 0];
  const quadrantCounts = [0, 0, 0, 0];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const value = gray[y * width + x]!;
      sum += value;
      sumSquares += value * value;
      if (value < 52) dark += 1;
      if (value > 250) clipped += 1;
      const quadrant = (y >= height / 2 ? 2 : 0) + (x >= width / 2 ? 1 : 0);
      quadrantSums[quadrant]! += value;
      quadrantCounts[quadrant]! += 1;
    }
  }
  const total = width * height;
  const mean = sum / total;
  const standardDeviation = Math.sqrt(Math.max(0, sumSquares / total - mean * mean));
  const threshold = clamp(mean + Math.max(8, standardDeviation * 0.22), 80, 242);
  const focusScore = laplacianVariance(gray, width, height);

  // Establish a threshold from the frame itself, so a matte page on a light
  // surface can still be outlined without treating ordinary text as a page edge.
  let gradientSum = 0;
  let gradientSquares = 0;
  let gradientCount = 0;
  for (let y = 1; y < height - 1; y += 2) {
    for (let x = 1; x < width - 1; x += 2) {
      const horizontal = Math.abs(gray[y * width + x + 1]! - gray[y * width + x - 1]!);
      const vertical = Math.abs(gray[(y + 1) * width + x]! - gray[(y - 1) * width + x]!);
      const strength = Math.max(horizontal, vertical);
      gradientSum += strength;
      gradientSquares += strength * strength;
      gradientCount += 1;
    }
  }
  const gradientMean = gradientSum / Math.max(1, gradientCount);
  const gradientDeviation = Math.sqrt(Math.max(0, gradientSquares / Math.max(1, gradientCount) - gradientMean * gradientMean));
  const edgeThreshold = Math.max(16, gradientMean + gradientDeviation * 0.75);

  const leftSamples: Array<{ major: number; minor: number }> = [];
  const rightSamples: Array<{ major: number; minor: number }> = [];
  for (let y = Math.floor(height * 0.03); y < height * 0.97; y += 2) {
    let first = -1;
    let last = -1;
    for (let x = 0; x < width; x += 1) {
      if (gray[y * width + x]! >= threshold) {
        if (first < 0) first = x;
        last = x;
      }
    }
    if (first >= 0 && last - first >= width * 0.24) {
      leftSamples.push({ major: y, minor: first });
      rightSamples.push({ major: y, minor: last });
    }
  }

  const topSamples: Array<{ major: number; minor: number }> = [];
  const bottomSamples: Array<{ major: number; minor: number }> = [];
  for (let x = Math.floor(width * 0.03); x < width * 0.97; x += 2) {
    let first = -1;
    let last = -1;
    for (let y = 0; y < height; y += 1) {
      if (gray[y * width + x]! >= threshold) {
        if (first < 0) first = y;
        last = y;
      }
    }
    if (first >= 0 && last - first >= height * 0.24) {
      topSamples.push({ major: x, minor: first });
      bottomSamples.push({ major: x, minor: last });
    }
  }

  const contrastConfidence = clamp((standardDeviation - 8) / 35, 0, 1);
  const brightEvidence = quadFromSamples(leftSamples, rightSamples, topSamples, bottomSamples, width, height, contrastConfidence);
  const edge = edgeSamples(gray, width, height, edgeThreshold);
  const edgeEvidence = quadFromSamples(edge.left, edge.right, edge.top, edge.bottom, width, height, contrastConfidence);
  const brightValid = brightEvidence.support > 0.52 && brightEvidence.areaRatio > 0.16 && brightEvidence.areaRatio < 0.94;
  const edgeValid = edgeEvidence.support > 0.42 && edgeEvidence.areaRatio > 0.13 && edgeEvidence.areaRatio < 0.94;
  // Prefer real boundary evidence when it is comparable. Bright-region evidence
  // remains valuable on a clean white page in dim light.
  const selected = edgeValid && (!brightValid || edgeEvidence.confidence >= brightEvidence.confidence - 0.08)
    ? edgeEvidence
    : brightEvidence;
  const areaRatio = selected.areaRatio;
  const candidate = selected.quad;
  const minimumMargin = Math.min(
    candidate.topLeft.x,
    candidate.bottomLeft.x,
    width - candidate.topRight.x,
    width - candidate.bottomRight.x,
    candidate.topLeft.y,
    candidate.topRight.y,
    height - candidate.bottomLeft.y,
    height - candidate.bottomRight.y,
  ) / Math.min(width, height);
  const horizontalRatio = Math.min(distance(candidate.topLeft, candidate.topRight), distance(candidate.bottomLeft, candidate.bottomRight))
    / Math.max(1, Math.max(distance(candidate.topLeft, candidate.topRight), distance(candidate.bottomLeft, candidate.bottomRight)));
  const verticalRatio = Math.min(distance(candidate.topLeft, candidate.bottomLeft), distance(candidate.topRight, candidate.bottomRight))
    / Math.max(1, Math.max(distance(candidate.topLeft, candidate.bottomLeft), distance(candidate.topRight, candidate.bottomRight)));
  const perspectiveRatio = Math.min(horizontalRatio, verticalRatio);
  const confidence = selected.confidence;
  const validGeometry = selected === edgeEvidence ? edgeValid : brightValid;
  const quad = validGeometry ? candidate : null;

  if (!quad) warnings.push({ code: "missing_corners", message: "All four page corners are not clearly visible." });
  if (quad && minimumMargin < 0.018) warnings.push({ code: "outside_frame", message: "A page corner is too close to or outside the camera frame." });
  if (quad && perspectiveRatio < 0.7) warnings.push({ code: "perspective", message: "The page angle is too steep. Hold the camera more directly above it." });
  if (mean < 84 || dark / total > 0.7) warnings.push({ code: "low_light", message: "The page is too dark for reliable automatic capture." });
  if (focusScore < 11) warnings.push({ code: "blur", message: "The page is not in focus yet. Hold the camera still." });
  const quadrantMeans = quadrantSums.map((value, index) => value / Math.max(1, quadrantCounts[index]!));
  if (Math.max(...quadrantMeans) - Math.min(...quadrantMeans) > 46) warnings.push({ code: "shadows", message: "Heavy shadows may hide part of the page." });
  if (clipped / total > 0.03 && clipped / total < 0.32 && standardDeviation > 25) warnings.push({ code: "glare", message: "Glare may be hiding text on the page." });

  return {
    quad,
    confidence,
    // Drawing an outline is helpful even when the scene is difficult. Auto-
    // capture stays stricter: it requires long edge support in addition to a
    // warning-free frame, so text lines and background textures cannot fire it.
    canAutoCapture: Boolean(quad) && confidence >= 0.66 && edgeEvidence.support >= 0.72 && warnings.length === 0,
    warnings,
    frameWidth: width,
    frameHeight: height,
    focusScore,
  };
}
