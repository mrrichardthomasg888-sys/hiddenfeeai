import type { Env } from "../../types.js";

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunk) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunk));
  }
  return btoa(binary);
}

export async function extractTextWithGemini(
  buffer: ArrayBuffer,
  mimeType: string,
  env: Env,
  timeoutMs: number,
): Promise<string | null> {
  const apiKey = env.GEMINI_API_KEY || env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY or GOOGLE_API_KEY is not configured");
  const model = env.GEMINI_MODEL || "gemini-3.5-flash-lite";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ role: "user", parts: [
            { text: "Extract every visible word, number, table cell, heading, and page marker from this financial document. Preserve reading order and table rows. Return only the extracted text. Do not summarize or omit repeated line items." },
            { inlineData: { mimeType, data: toBase64(buffer) } },
          ] }],
          generationConfig: { temperature: 0, maxOutputTokens: 16384 },
        }),
      },
    );
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Gemini extraction failed (${response.status}): ${detail.slice(0, 300)}`);
    }
    const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("\n").trim() ?? "";
    return text.length > 10 ? text : null;
  } finally {
    clearTimeout(timer);
  }
}
