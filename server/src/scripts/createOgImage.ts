import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { rename } from "node:fs/promises";
import sharp from "sharp";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const input = resolve(repoRoot, "client/public/og-background.png");
const output = resolve(repoRoot, "client/public/og-image.png");

const overlay = Buffer.from(`
  <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="shade" x1="0" y1="0" x2="1" y2="0">
        <stop stop-color="#050911" stop-opacity=".96" />
        <stop offset=".58" stop-color="#050911" stop-opacity=".62" />
        <stop offset="1" stop-color="#050911" stop-opacity=".08" />
      </linearGradient>
      <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
        <stop stop-color="#fff7b0" />
        <stop offset=".5" stop-color="#ffd447" />
        <stop offset="1" stop-color="#ff9f1c" />
      </linearGradient>
    </defs>
    <rect width="1200" height="630" fill="url(#shade)" />
    <g transform="translate(76 70)">
      <g stroke="#f7b928" stroke-width="4" stroke-linecap="round">
        <path d="M36 0v10M36 62v10M0 36h10M62 36h10M10.5 10.5l7 7M54.5 54.5l7 7M61.5 10.5l-7 7M17.5 54.5l-7 7"/>
      </g>
      <circle cx="36" cy="36" r="25" fill="url(#gold)" stroke="#f7b928" stroke-width="3"/>
      <path d="M24 27h24M24 36h17M24 45h24" stroke="#12345b" stroke-width="4" stroke-linecap="round"/>
      <path d="M24 45h24" stroke="#0ea5e9" stroke-width="5" stroke-linecap="round"/>
      <path d="m50 19 2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#fff"/>
    </g>
    <text x="170" y="116" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="38" font-weight="800" letter-spacing="2">HIDDEN<tspan fill="#f4c542">FEE</tspan><tspan dx="10" font-size="25" fill="#f8d96e">AI</tspan></text>
    <text x="78" y="212" fill="#78bbff" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700" letter-spacing="4">FINANCIAL DOCUMENT INTELLIGENCE</text>
    <text x="78" y="294" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="52" font-weight="800">Find hidden fees.</text>
    <text x="78" y="356" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="52" font-weight="800">Know what to do next.</text>
    <text x="78" y="423" fill="#c8d1dd" font-family="Arial, Helvetica, sans-serif" font-size="24">Evidence-backed document audits with clear financial impact</text>
    <text x="78" y="458" fill="#c8d1dd" font-family="Arial, Helvetica, sans-serif" font-size="24">and ready-to-use negotiation scripts.</text>
    <rect x="78" y="511" width="340" height="54" rx="12" fill="#f4c542"/>
    <text x="108" y="546" fill="#111827" font-family="Arial, Helvetica, sans-serif" font-size="19" font-weight="800">ONE COMPLETE AUDIT · $15</text>
  </svg>
`);

await sharp(input)
  .resize(1200, 630, { fit: "cover", position: "centre" })
  .composite([{ input: overlay, top: 0, left: 0 }])
  .png({ quality: 88, compressionLevel: 9, palette: true })
  .toFile(`${output}.tmp.png`);

await rename(`${output}.tmp.png`, output);
