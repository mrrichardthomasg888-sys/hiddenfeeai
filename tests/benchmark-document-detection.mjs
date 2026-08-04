import { detectDocumentPage } from "../client/src/lib/documentDetection.ts";

const width = 320;
const height = 240;

function inside(point, polygon) {
  let sign = 0;
  for (let index = 0; index < polygon.length; index += 1) {
    const left = polygon[index];
    const right = polygon[(index + 1) % polygon.length];
    const cross = (right[0] - left[0]) * (point[1] - left[1]) - (right[1] - left[1]) * (point[0] - left[0]);
    if (Math.abs(cross) < 0.001) continue;
    const nextSign = Math.sign(cross);
    if (sign && nextSign !== sign) return false;
    sign = nextSign;
  }
  return true;
}

function frame({ corners, background, paper, text = true, glare = false, shadow = false }) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const onPage = inside([x, y], corners);
      let value = onPage ? paper : background;
      if (onPage && text && x % 7 < 4 && y % 19 < 2) value = Math.max(20, paper - 130);
      if (onPage && glare && x > 185 && x < 245 && y > 45 && y < 105) value = 255;
      if (onPage && shadow && x < 150) value = Math.max(20, value - 95);
      const offset = (y * width + x) * 4;
      data[offset] = value;
      data[offset + 1] = value;
      data[offset + 2] = value;
      data[offset + 3] = 255;
    }
  }
  return data;
}

function cornerError(quad, expected) {
  if (!quad) return null;
  const actual = [quad.topLeft, quad.topRight, quad.bottomRight, quad.bottomLeft];
  return actual.reduce((total, point, index) => total + Math.hypot(point.x - expected[index][0], point.y - expected[index][1]), 0) / actual.length;
}

const scenarios = [
  { name: "white paper / dark background", corners: [[28, 14], [292, 18], [288, 226], [24, 222]], background: 24, paper: 244 },
  { name: "white paper / light background", corners: [[28, 14], [292, 18], [288, 226], [24, 222]], background: 226, paper: 244 },
  { name: "narrow receipt", corners: [[102, 12], [222, 16], [218, 228], [98, 224]], background: 28, paper: 242 },
  { name: "perspective page", corners: [[70, 24], [250, 22], [296, 224], [22, 226]], background: 24, paper: 242 },
  { name: "corner outside frame", corners: [[-18, 8], [280, 18], [288, 224], [-12, 232]], background: 24, paper: 242 },
  { name: "glossy page / glare", corners: [[28, 14], [292, 18], [288, 226], [24, 222]], background: 24, paper: 238, glare: true },
  { name: "heavy side shadow", corners: [[28, 14], [292, 18], [288, 226], [24, 222]], background: 24, paper: 238, shadow: true },
  { name: "low light", corners: [[28, 14], [292, 18], [288, 226], [24, 222]], background: 10, paper: 92 },
];

const iterations = 40;
const observations = [];
for (const scenario of scenarios) {
  const pixels = frame(scenario);
  const timings = [];
  let result;
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const startedAt = performance.now();
    result = detectDocumentPage(pixels, width, height);
    timings.push(performance.now() - startedAt);
  }
  timings.sort((left, right) => left - right);
  observations.push({
    scenario: scenario.name,
    detected: Boolean(result.quad),
    autoCapture: result.canAutoCapture,
    confidence: Number(result.confidence.toFixed(2)),
    meanCornerErrorPx: result.quad ? Number(cornerError(result.quad, scenario.corners).toFixed(1)) : null,
    warnings: result.warnings.map((warning) => warning.code),
    meanMs: Number((timings.reduce((total, value) => total + value, 0) / timings.length).toFixed(2)),
    p95Ms: Number(timings[Math.floor(timings.length * 0.95)].toFixed(2)),
  });
}

console.log(JSON.stringify({ frame: `${width}x${height}`, iterationsPerScenario: iterations, observations }, null, 2));

