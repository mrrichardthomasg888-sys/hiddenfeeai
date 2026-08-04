import type { DocumentPoint, DocumentQuad } from "@/lib/documentDetection";

interface LoadedImage {
  source: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
}

export interface CroppedDocument {
  blob: Blob;
  width: number;
  height: number;
  sampleData: Uint8ClampedArray;
  sampleWidth: number;
  sampleHeight: number;
}

async function loadBlobImage(blob: Blob): Promise<LoadedImage> {
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

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("The cropped page could not be prepared.")),
      "image/jpeg",
      quality,
    );
  });
}

function distance(left: DocumentPoint, right: DocumentPoint): number {
  return Math.hypot(right.x - left.x, right.y - left.y);
}

function interpolate(quad: DocumentQuad, horizontal: number, vertical: number): DocumentPoint {
  const topX = quad.topLeft.x + (quad.topRight.x - quad.topLeft.x) * horizontal;
  const topY = quad.topLeft.y + (quad.topRight.y - quad.topLeft.y) * horizontal;
  const bottomX = quad.bottomLeft.x + (quad.bottomRight.x - quad.bottomLeft.x) * horizontal;
  const bottomY = quad.bottomLeft.y + (quad.bottomRight.y - quad.bottomLeft.y) * horizontal;
  return {
    x: topX + (bottomX - topX) * vertical,
    y: topY + (bottomY - topY) * vertical,
  };
}

function drawTriangle(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  source: [DocumentPoint, DocumentPoint, DocumentPoint],
  destination: [DocumentPoint, DocumentPoint, DocumentPoint],
) {
  const [s1, s2, s3] = source;
  const [d1, d2, d3] = destination;
  const denominator = s1.x * (s2.y - s3.y) + s2.x * (s3.y - s1.y) + s3.x * (s1.y - s2.y);
  if (Math.abs(denominator) < 0.0001) return;
  const a = (d1.x * (s2.y - s3.y) + d2.x * (s3.y - s1.y) + d3.x * (s1.y - s2.y)) / denominator;
  const c = (d1.x * (s3.x - s2.x) + d2.x * (s1.x - s3.x) + d3.x * (s2.x - s1.x)) / denominator;
  const e = (d1.x * (s2.x * s3.y - s3.x * s2.y) + d2.x * (s3.x * s1.y - s1.x * s3.y) + d3.x * (s1.x * s2.y - s2.x * s1.y)) / denominator;
  const b = (d1.y * (s2.y - s3.y) + d2.y * (s3.y - s1.y) + d3.y * (s1.y - s2.y)) / denominator;
  const d = (d1.y * (s3.x - s2.x) + d2.y * (s1.x - s3.x) + d3.y * (s2.x - s1.x)) / denominator;
  const f = (d1.y * (s2.x * s3.y - s3.x * s2.y) + d2.y * (s3.x * s1.y - s1.x * s3.y) + d3.y * (s1.x * s2.y - s2.x * s1.y)) / denominator;

  context.save();
  context.beginPath();
  context.moveTo(d1.x, d1.y);
  context.lineTo(d2.x, d2.y);
  context.lineTo(d3.x, d3.y);
  context.closePath();
  context.clip();
  context.setTransform(a, b, c, d, e, f);
  context.drawImage(image, 0, 0);
  context.restore();
}

/**
 * Deskews a quadrilateral page entirely in the browser. A small affine mesh is
 * used instead of per-pixel JavaScript so memory stays bounded on mobile.
 */
export async function cropDocumentImage(blob: Blob, quad: DocumentQuad, maximumEdge = 2_000, quality = 0.88): Promise<CroppedDocument> {
  const decoded = await loadBlobImage(blob);
  try {
    const naturalWidth = Math.max(distance(quad.topLeft, quad.topRight), distance(quad.bottomLeft, quad.bottomRight));
    const naturalHeight = Math.max(distance(quad.topLeft, quad.bottomLeft), distance(quad.topRight, quad.bottomRight));
    if (naturalWidth < 80 || naturalHeight < 80) throw new Error("The crop area is too small. Move the crop corners around the full page.");
    const scale = Math.min(1, maximumEdge / Math.max(naturalWidth, naturalHeight));
    const width = Math.max(1, Math.round(naturalWidth * scale));
    const height = Math.max(1, Math.round(naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Manual cropping is not supported in this browser. Retake the page or use Upload Document.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";

    const columns = 12;
    const rows = Math.max(12, Math.round((height / Math.max(1, width)) * columns));
    for (let row = 0; row < rows; row += 1) {
      const top = row / rows;
      const bottom = (row + 1) / rows;
      for (let column = 0; column < columns; column += 1) {
        const left = column / columns;
        const right = (column + 1) / columns;
        const sourceTopLeft = interpolate(quad, left, top);
        const sourceTopRight = interpolate(quad, right, top);
        const sourceBottomRight = interpolate(quad, right, bottom);
        const sourceBottomLeft = interpolate(quad, left, bottom);
        const destinationTopLeft = { x: left * width, y: top * height };
        const destinationTopRight = { x: right * width, y: top * height };
        const destinationBottomRight = { x: right * width, y: bottom * height };
        const destinationBottomLeft = { x: left * width, y: bottom * height };
        drawTriangle(context, decoded.source, [sourceTopLeft, sourceTopRight, sourceBottomRight], [destinationTopLeft, destinationTopRight, destinationBottomRight]);
        drawTriangle(context, decoded.source, [sourceTopLeft, sourceBottomRight, sourceBottomLeft], [destinationTopLeft, destinationBottomRight, destinationBottomLeft]);
      }
    }

    context.setTransform(1, 0, 0, 1, 0, 0);
    const sampleScale = Math.min(1, 256 / Math.max(width, height));
    const sampleWidth = Math.max(32, Math.round(width * sampleScale));
    const sampleHeight = Math.max(32, Math.round(height * sampleScale));
    const sampleCanvas = document.createElement("canvas");
    sampleCanvas.width = sampleWidth;
    sampleCanvas.height = sampleHeight;
    const sampleContext = sampleCanvas.getContext("2d", { willReadFrequently: true });
    if (!sampleContext) throw new Error("The cropped page quality could not be checked in this browser.");
    sampleContext.drawImage(canvas, 0, 0, sampleWidth, sampleHeight);
    const sampleData = sampleContext.getImageData(0, 0, sampleWidth, sampleHeight).data;
    const croppedBlob = await canvasToBlob(canvas, quality);
    canvas.width = 1;
    canvas.height = 1;
    sampleCanvas.width = 1;
    sampleCanvas.height = 1;
    return { blob: croppedBlob, width, height, sampleData, sampleWidth, sampleHeight };
  } finally {
    decoded.release();
  }
}

