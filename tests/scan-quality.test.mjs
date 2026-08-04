import test from "node:test";
import assert from "node:assert/strict";
import { analyzeScanQuality, cameraFailureMessage, fingerprintDistance, MAX_SCAN_PAGES, moveListItem, replaceListItem, rotateClockwise, selectionAfterDelete } from "../client/src/lib/scanQuality.ts";

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
