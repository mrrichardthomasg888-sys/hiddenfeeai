import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const requireFromClient = createRequire(new URL("../client/package.json", import.meta.url));
const { jsPDF } = requireFromClient("jspdf");

const pageCount = Number(process.argv[2] || 20);
const outputPath = path.resolve(process.argv[3] || "tmp/pdfs/scanner-production-benchmark.pdf");
const width = 1_455;
const height = 2_000;
const startedAt = performance.now();
const rssBefore = process.memoryUsage().rss;
let peakRss = rssBefore;
const pageImages = [];

function pageSvg(pageNumber) {
  const rows = Array.from({ length: 34 }, (_, index) => {
    const y = 470 + index * 38;
    const amount = ((pageNumber * 97 + index * 13) % 800 + 12).toFixed(2);
    return `<text x="130" y="${y}" font-family="Arial" font-size="22" fill="#172033">Service line ${String(index + 1).padStart(2, "0")}: documented charge and description</text><text x="1190" y="${y}" text-anchor="end" font-family="Arial" font-size="22" fill="#172033">$${amount}</text><line x1="125" y1="${y + 10}" x2="1200" y2="${y + 10}" stroke="#d7dde7" stroke-width="1"/>`;
  }).join("");
  return Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#f8f6ef"/><rect x="75" y="70" width="1305" height="1860" rx="8" fill="#fff" stroke="#c8ced8" stroke-width="3"/><text x="125" y="165" font-family="Arial" font-size="48" font-weight="700" fill="#101827">Physical Document Sample</text><text x="125" y="220" font-family="Arial" font-size="25" fill="#4c596e">Scanner compression and readability benchmark</text><text x="1200" y="165" text-anchor="end" font-family="Arial" font-size="34" font-weight="700" fill="#245b9b">Page ${pageNumber}</text><line x1="125" y1="280" x2="1200" y2="280" stroke="#245b9b" stroke-width="5"/><text x="125" y="360" font-family="Arial" font-size="27" font-weight="700" fill="#172033">Account summary and itemized charges</text>${rows}<text x="125" y="1840" font-family="Arial" font-size="18" fill="#5c6678">Small-print verification: Every captured page must remain legible after JPEG and PDF compression.</text></svg>`);
}

for (let page = 1; page <= pageCount; page += 1) {
  const jpeg = await sharp(pageSvg(page)).jpeg({ quality: 82, chromaSubsampling: "4:4:4" }).toBuffer();
  pageImages.push(jpeg);
  peakRss = Math.max(peakRss, process.memoryUsage().rss);
}

const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
for (let index = 0; index < pageImages.length; index += 1) {
  if (index > 0) pdf.addPage("a4", "portrait");
  const scale = Math.min(200 / width, 287 / height);
  const renderedWidth = width * scale;
  const renderedHeight = height * scale;
  pdf.addImage(new Uint8Array(pageImages[index]), "JPEG", (210 - renderedWidth) / 2, (297 - renderedHeight) / 2, renderedWidth, renderedHeight, undefined, "MEDIUM");
  peakRss = Math.max(peakRss, process.memoryUsage().rss);
}

const bytes = Buffer.from(pdf.output("arraybuffer"));
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, bytes);
peakRss = Math.max(peakRss, process.memoryUsage().rss);

const result = {
  outputPath,
  pageCount,
  fileSizeBytes: bytes.length,
  fileSizeMb: Number((bytes.length / 1024 / 1024).toFixed(2)),
  creationTimeMs: Math.round(performance.now() - startedAt),
  rssIncreaseMb: Number(((peakRss - rssBefore) / 1024 / 1024).toFixed(1)),
  averageCapturedJpegKb: Math.round(pageImages.reduce((total, image) => total + image.length, 0) / pageImages.length / 1024),
};

console.log(JSON.stringify(result, null, 2));
