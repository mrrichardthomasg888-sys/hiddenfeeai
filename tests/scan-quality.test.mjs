import test from "node:test";
import assert from "node:assert/strict";
import { analyzeScanQuality, cameraFailureMessage, fingerprintDistance, MAX_SCAN_PAGES, moveListItem, replaceListItem, rotateClockwise, selectionAfterDelete } from "../client/src/lib/scanQuality.ts";
import { defaultCropQuad, detectDocumentPage, moveCropCorner, quadMovement, smoothQuad } from "../client/src/lib/documentDetection.ts";

function rgba(width, height, pixel) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const [red, green, blue] = pixel(x, y);
      const index = (y * width + x) * 4;
      data[index] = red;
      data[index + 1] = green;
      data[index + 2] = blue;
      data[index + 3] = 255;
    }
  }
  return data;
}

function issue(result, code) {
  return result.issues.find((candidate) => candidate.code === code);
}

test("the beta page limit is 20", () => {
  assert.equal(MAX_SCAN_PAGES, 20);
});

test("camera denial and unavailability have explicit recovery messages", () => {
  assert.match(cameraFailureMessage(false), /unavailable/i);
  assert.match(cameraFailureMessage(true, "NotAllowedError"), /permission was denied/i);
  assert.match(cameraFailureMessage(true, "NotReadableError"), /could not be started/i);
});

test("page reorder, retake, rotate, and delete operations are explicit and lossless", () => {
  assert.deepEqual(moveListItem(["page-1", "page-2", "page-3"], 1, -1), ["page-2", "page-1", "page-3"]);
  assert.deepEqual(replaceListItem(["page-1", "page-2", "page-3"], 1, "retaken-page-2"), ["page-1", "retaken-page-2", "page-3"]);
  assert.equal(rotateClockwise(0), 90);
  assert.equal(rotateClockwise(270), 0);
  assert.equal(selectionAfterDelete(3, 1, 2), 1);
  assert.equal(selectionAfterDelete(1, 0, 0), 0);
});

test("very dark captures are blocked", () => {
  const width = 96;
  const height = 128;
  const result = analyzeScanQuality(rgba(width, height, () => [20, 20, 20]), width, height, 1_500, 2_000);
  assert.equal(issue(result, "dark")?.severity, "blocking");
});

test("very low-resolution captures are blocked", () => {
  const width = 96;
  const height = 128;
  const result = analyzeScanQuality(rgba(width, height, (x, y) => (x + y) % 2 ? [35, 35, 35] : [235, 235, 235]), width, height, 480, 640);
  assert.equal(issue(result, "low_resolution")?.severity, "blocking");
});

test("sharp, adequately sized pages are not blocked as blurry", () => {
  const width = 96;
  const height = 128;
  const result = analyzeScanQuality(rgba(width, height, (x, y) => Math.floor(x / 3 + y / 3) % 2 ? [45, 45, 45] : [240, 240, 240]), width, height, 1_500, 2_000);
  assert.notEqual(issue(result, "blurry")?.severity, "blocking");
});

test("detailed content touching the frame produces a crop warning", () => {
  const width = 100;
  const height = 140;
  const result = analyzeScanQuality(rgba(width, height, (x, y) => x < 8 || y < 8 || x >= width - 8 || y >= height - 8 ? ((x + y) % 2 ? [20, 20, 20] : [235, 235, 235]) : [235, 235, 235]), width, height, 1_500, 2_000);
  assert.equal(issue(result, "cropped")?.severity, "warning");
});

test("a uniform dark surface outside the page does not falsely look cropped", () => {
  const width = 100;
  const height = 140;
  const result = analyzeScanQuality(rgba(width, height, (x, y) => x < 8 || y < 8 || x >= width - 8 || y >= height - 8 ? [25, 25, 25] : [235, 235, 235]), width, height, 1_500, 2_000);
  assert.equal(issue(result, "cropped"), undefined);
});

test("a localized clipped-bright region produces a glare warning", () => {
  const width = 100;
  const height = 140;
  const result = analyzeScanQuality(rgba(width, height, (x, y) => x < 48 && y < 64 ? [255, 255, 255] : ((x + y) % 11 < 3 ? [85, 85, 85] : [175, 175, 175])), width, height, 1_500, 2_000);
  assert.equal(issue(result, "glare")?.severity, "warning");
});

test("identical page fingerprints are recognized without discarding either page", () => {
  const width = 96;
  const height = 128;
  const pixels = rgba(width, height, (x, y) => x > 25 && x < 70 && y % 12 < 3 ? [20, 20, 20] : [235, 235, 235]);
  const first = analyzeScanQuality(pixels, width, height, 1_500, 2_000);
  const second = analyzeScanQuality(pixels, width, height, 1_500, 2_000);
  assert.equal(fingerprintDistance(first.fingerprint, second.fingerprint), 0);
});

test("a high-contrast paper rectangle produces four supported page corners", () => {
  const width = 160;
  const height = 120;
  const pixels = rgba(width, height, (x, y) => {
    const onPage = x >= 20 && x <= 140 && y >= 10 && y <= 110;
    const text = onPage && x >= 36 && x <= 124 && y % 13 < 2;
    return text ? [45, 45, 45] : onPage ? [244, 244, 244] : [24, 24, 24];
  });
  const result = detectDocumentPage(pixels, width, height);
  assert.ok(result.quad);
  assert.ok(result.confidence >= 0.6);
  assert.equal(result.warnings.find((warning) => warning.code === "missing_corners"), undefined);
  assert.ok(result.quad.topLeft.x >= 15 && result.quad.topLeft.x <= 25);
  assert.ok(result.quad.bottomRight.x >= 135 && result.quad.bottomRight.x <= 150);
});

test("edge detection outlines a darker page on a lighter surface", () => {
  const width = 160;
  const height = 120;
  const pixels = rgba(width, height, (x, y) => {
    const onPage = x >= 20 && x <= 140 && y >= 10 && y <= 110;
    const text = onPage && x >= 34 && x <= 126 && y % 15 < 2;
    return text ? [55, 55, 55] : onPage ? [172, 172, 172] : [224, 224, 224];
  });
  const result = detectDocumentPage(pixels, width, height);
  assert.ok(result.quad, "the page boundary should not depend on a bright page");
  assert.equal(result.warnings.find((warning) => warning.code === "missing_corners"), undefined);
  assert.ok(result.quad.topLeft.x >= 14 && result.quad.topLeft.x <= 27);
  assert.ok(result.quad.topLeft.y >= 5 && result.quad.topLeft.y <= 16);
  assert.ok(result.quad.bottomRight.x >= 133 && result.quad.bottomRight.x <= 146);
});

test("the crop follows the outer sheet instead of stronger text edges", () => {
  const width = 180;
  const height = 140;
  const pixels = rgba(width, height, (x, y) => {
    const onPage = x >= 22 && x <= 158 && y >= 10 && y <= 130;
    const denseText = onPage && x >= 42 && x <= 138 && y >= 20 && y <= 120 && y % 6 < 2;
    return denseText ? [28, 28, 28] : onPage ? [190, 190, 190] : [220, 220, 220];
  });
  const result = detectDocumentPage(pixels, width, height);
  assert.ok(result.quad);
  assert.ok(result.quad.topLeft.x <= 22, `left crop was too tight: ${result.quad.topLeft.x}`);
  assert.ok(result.quad.topLeft.y <= 10, `top crop was too tight: ${result.quad.topLeft.y}`);
  assert.ok(result.quad.bottomRight.x >= 158, `right crop was too tight: ${result.quad.bottomRight.x}`);
  assert.ok(result.quad.bottomRight.y >= 130, `bottom crop was too tight: ${result.quad.bottomRight.y}`);
});

test("low-contrast scenes fail safely to manual cropping", () => {
  const width = 160;
  const height = 120;
  const pixels = rgba(width, height, (x, y) => x >= 18 && x <= 142 && y >= 8 && y <= 112 ? [238, 238, 238] : [229, 229, 229]);
  const result = detectDocumentPage(pixels, width, height);
  assert.equal(result.canAutoCapture, false);
  assert.ok(!result.quad || result.confidence < 0.6 || result.warnings.length > 0);
});

test("pages touching the camera edge never auto-capture", () => {
  const width = 160;
  const height = 120;
  const pixels = rgba(width, height, (x, y) => x <= 140 && y >= 8 && y <= 112 ? [242, 242, 242] : [20, 20, 20]);
  const result = detectDocumentPage(pixels, width, height);
  assert.equal(result.canAutoCapture, false);
  assert.ok(result.warnings.some((warning) => warning.code === "outside_frame" || warning.code === "missing_corners"));
});

test("low light and heavy shadows suppress assisted auto-capture", () => {
  const width = 160;
  const height = 120;
  const lowLight = detectDocumentPage(rgba(width, height, (x, y) => x >= 18 && x <= 142 && y >= 8 && y <= 112 ? [92, 92, 92] : [10, 10, 10]), width, height);
  assert.equal(lowLight.canAutoCapture, false);
  assert.ok(lowLight.warnings.some((warning) => warning.code === "low_light"));
  const shadowed = detectDocumentPage(rgba(width, height, (x, y) => {
    if (x < 18 || x > 142 || y < 8 || y > 112) return [22, 22, 22];
    return x < 80 ? [132, 132, 132] : [242, 242, 242];
  }), width, height);
  assert.equal(shadowed.canAutoCapture, false);
  assert.ok(shadowed.warnings.some((warning) => warning.code === "shadows"));
});

test("crop corners can be moved without crossing neighboring corners", () => {
  const initial = defaultCropQuad(1_000, 1_400);
  const moved = moveCropCorner(initial, "topLeft", { x: 250, y: 180 }, 1_000, 1_400);
  assert.equal(moved.topLeft.x, 250);
  assert.equal(moved.topLeft.y, 180);
  const clamped = moveCropCorner(moved, "topLeft", { x: 990, y: 1_390 }, 1_000, 1_400);
  assert.ok(clamped.topLeft.x < clamped.topRight.x);
  assert.ok(clamped.topLeft.y < clamped.bottomLeft.y);
});

test("outline smoothing reduces live corner movement", () => {
  const initial = defaultCropQuad(100, 140, 0.1);
  const shifted = { ...initial, topLeft: { x: 20, y: 25 } };
  const smoothed = smoothQuad(initial, shifted, 0.25);
  assert.ok(quadMovement(initial, smoothed, 100, 140) < quadMovement(initial, shifted, 100, 140));
});
