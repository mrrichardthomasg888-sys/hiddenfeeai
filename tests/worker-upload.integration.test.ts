import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import app from "../worker/src/index.ts";

function testEnv() {
  return {
    ENVIRONMENT: "development",
    FRONTEND_URL: "http://localhost:5173",
    MAX_UPLOAD_SIZE_MB: "25",
    TEST_MODE_SKIP_PAYMENT: "true",
    GEMINI_API_KEY: "test-key-never-sent",
    GEMINI_MODEL: "gemini-test-model",
  } as any;
}

function completeReport(pageCount = 2) {
  return {
    document_meta: { document_type: "Scanned Contract", issuer: "", payer: "", pages_reviewed: pageCount, line_items_reviewed: 4 },
    risk_score: 12,
    risk_level: "Low",
    potential_savings: 0,
    confidence_level: 92,
    financial_impact: { original_total: 0, questionable_charges_total: 0, corrected_total: 0 },
    findings: [],
    premium_insights: {
      document_summary: `${pageCount}-page scan reviewed.`, confirmed_charges: 0, recurring_monthly_exposure: 0,
      estimated_annual_exposure: 0, contract_term_exposure: null, calculation_explanation: "No charges.",
      timeline: [], positive_terms: [], missing_protections: [], watch_items: [], provider_questions: [], escalation_steps: [],
      final_decision: "Accept", decision_reasoning: "No material issues in test fixture.", unreadable_areas: [], assumptions: [],
      negotiation_playbook: {
        objective: "Confirm terms", leverage_points: [], priority_items: [], opening_statement: "", likely_objections: [],
        concessions: [], unacceptable_terms: [], escalation_path: [], walk_away_threshold: "", follow_up_schedule: [],
        phone_script: "", short_email: "", detailed_email: "", renewal_script: "", cancellation_script: "",
      },
    },
  };
}

function mockGemini(options: { failUpload?: boolean; pages?: number } = {}) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes("/upload/v1beta/files")) {
      if (options.failUpload) return new Response("upstream unavailable", { status: 400 });
      return new Response(JSON.stringify({}), { status: 200, headers: { "x-goog-upload-url": "https://upload.test/session" } });
    }
    if (url === "https://upload.test/session") {
      return new Response(JSON.stringify({ file: { uri: "https://files.test/scan", name: "files/scanner-test", mimeType: "application/pdf", state: "ACTIVE" } }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (url.includes("/v1beta/files/scanner-test") && init?.method === "DELETE") {
      return new Response(null, { status: 204 });
    }
    if (url.includes("/v1beta/files/scanner-test")) {
      return new Response(JSON.stringify({ state: "ACTIVE" }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (url.includes(":generateContent")) {
      return new Response(JSON.stringify({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify(completeReport(options.pages ?? 2)) }] } }] }), { status: 200, headers: { "content-type": "application/json" } });
    }
    throw new Error(`Unexpected external request in test: ${url}`);
  });
}

async function upload(env: any, file: File) {
  const form = new FormData();
  form.set("file", file, file.name);
  return app.request("http://localhost/api/upload", { method: "POST", body: form }, env);
}

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("production Worker upload contract with mocked processors", () => {
  it.each([1, 2, 5, 10])("accepts a %i-page scanned PDF and carries every page through upload, payment, analysis, and report", async (pageCount) => {
    const env = testEnv();
    const externalFetch = mockGemini({ pages: pageCount });
    vi.stubGlobal("fetch", externalFetch);

    const uploadResponse = await upload(env, new File([`%PDF-scanned-${pageCount}-pages`], "HiddenFeeAI-scan.pdf", { type: "application/pdf" }));
    expect(uploadResponse.status).toBe(201);
    const uploaded = await uploadResponse.json() as { auditId: string; status: string; fileName: string; fileSize: number };
    expect(uploaded.auditId).toBeTruthy();
    expect(uploaded.status).toBe("extracted");
    expect(uploaded.fileName).toBe("HiddenFeeAI-scan.pdf");
    expect(uploaded.fileSize).toBeGreaterThan(0);

    const prepared = await app.request(`http://localhost/api/analyze/${uploaded.auditId}`, undefined, env);
    expect(prepared.status).toBe(200);
    expect((await prepared.json() as any).status).toBe("extracted");

    const checkout = await app.request("http://localhost/api/checkout/create-session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ auditId: uploaded.auditId, origin: "http://localhost:5173" }),
    }, env);
    expect(checkout.status).toBe(200);
    expect((await checkout.json() as any).testMode).toBe(true);

    const analysis = await app.request(`http://localhost/api/analyze/${uploaded.auditId}/start`, { method: "POST" }, env);
    expect(analysis.status).toBe(200);
    expect((await analysis.json() as any).status).toBe("complete");

    const finalResponse = await app.request(`http://localhost/api/analyze/${uploaded.auditId}`, undefined, env);
    const finalJob = await finalResponse.json() as any;
    expect(finalJob.status).toBe("complete");
    expect(finalJob.report.documentMetadata.pagesReviewed).toBe(pageCount);
    expect(finalJob.report.premiumReport).toBeDefined();
    expect(externalFetch.mock.calls.some(([url, init]) => String(url).includes("files/scanner-test") && init?.method === "DELETE")).toBe(true);
  });

  it("rejects empty, unsupported, and oversized uploads before external processing", async () => {
    const env = testEnv();
    const externalFetch = mockGemini();
    vi.stubGlobal("fetch", externalFetch);

    expect((await upload(env, new File([], "empty.pdf", { type: "application/pdf" }))).status).toBe(400);
    expect((await upload(env, new File(["bad"], "malware.exe", { type: "application/octet-stream" }))).status).toBe(400);
    const oversized = new File([new Uint8Array(25 * 1024 * 1024 + 1)], "too-large.pdf", { type: "application/pdf" });
    expect((await upload(env, oversized)).status).toBe(413);
    expect(externalFetch).not.toHaveBeenCalled();
  });

  it("returns a safe upload failure when the existing processor rejects the PDF", async () => {
    const env = testEnv();
    vi.stubGlobal("fetch", mockGemini({ failUpload: true }));
    const response = await upload(env, new File(["%PDF-failure"], "scan.pdf", { type: "application/pdf" }));
    expect(response.status).toBe(422);
    expect((await response.json() as any).error).toMatch(/couldn't prepare/i);
  });
});
