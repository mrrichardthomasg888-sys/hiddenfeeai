import type { Env } from "../../types.js";

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

export interface GeminiExtraction {
  text: string;
  units: Array<{ reference: string; text: string }>;
  retries: number;
}

const EXTRACTION_SCHEMA = {
  type: "OBJECT", required: ["units"], properties: {
    units: { type: "ARRAY", items: { type: "OBJECT", required: ["reference", "text"], properties: {
      reference: { type: "STRING" }, text: { type: "STRING" },
    } } },
  },
};

export async function extractDocumentWithGemini(
  buffer: ArrayBuffer, mimeType: string, env: Env, timeoutMs: number,
  expectedUnits = 1, referenceKind: "page" | "image" = "page",
): Promise<GeminiExtraction> {
  const apiKey = env.GEMINI_API_KEY || env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY or GOOGLE_API_KEY is not configured");
  const model = env.GEMINI_MODEL || "gemini-3.5-flash-lite";
  let lastError = "Gemini extraction failed";

  for (let attempt = 0; attempt < 3; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal,
        body: JSON.stringify({
          contents: [{ role: "user", parts: [
            { text: `Read the complete attached document. Return exactly one ordered unit for every ${referenceKind}. Expected units: ${expectedUnits}. Transcribe every visible word and number including tables, footnotes, handwriting where readable, headers, disclosures, fine print, and page-spanning clauses. Preserve rows and reading order. Use references ${referenceKind} 1, ${referenceKind} 2, etc. Never summarize or omit repeated content.` },
            { inlineData: { mimeType, data: toBase64(buffer) } },
          ] }],
          generationConfig: { temperature: 0, maxOutputTokens: 65536, responseMimeType: "application/json", responseSchema: EXTRACTION_SCHEMA },
        }),
      });
      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        lastError = `Gemini extraction failed (${response.status}): ${detail.slice(0, 300)}`;
        if (![408, 429, 500, 502, 503, 504].includes(response.status)) throw new Error(lastError);
        continue;
      }
      const payload = await response.json() as any;
      const finishReason = payload.candidates?.[0]?.finishReason;
      const raw = payload.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? "").join("") ?? "";
      if (!raw || finishReason === "SAFETY" || finishReason === "MAX_TOKENS") {
        lastError = `Gemini returned ${finishReason || "an empty response"}`;
        continue;
      }
      let parsed: any;
      try { parsed = JSON.parse(raw); } catch { lastError = "Gemini returned malformed extraction JSON"; continue; }
      const units = Array.isArray(parsed.units) ? parsed.units.filter((u: any) => typeof u?.reference === "string" && typeof u?.text === "string" && u.text.trim()) : [];
      if (units.length !== expectedUnits) { lastError = `Gemini returned ${units.length}/${expectedUnits} ${referenceKind}s`; continue; }
      return { units, text: units.map((u: any) => `\n--- ${u.reference} ---\n${u.text.trim()}`).join("\n").trim(), retries: attempt };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    } finally { clearTimeout(timer); }
  }
  throw new Error(lastError);
}

export async function extractTextWithGemini(buffer: ArrayBuffer, mimeType: string, env: Env, timeoutMs: number): Promise<string | null> {
  return (await extractDocumentWithGemini(buffer, mimeType, env, timeoutMs, 1, "image")).text;
}
