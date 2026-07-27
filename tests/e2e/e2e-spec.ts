// HiddenFeeAI v2 — E2E Test Specifications
// Architecture for end-to-end pipeline, payment, and security tests.
// Tests validate the full upload → analyze → report flow.
// Run: npx vitest run tests/e2e/

// ═══════════════════════════════════════════════════════════════
// TEST CATEGORIES
// ═══════════════════════════════════════════════════════════════

export const E2E_TEST_SPEC = {
  upload: {
    name: "Document Upload Validation",
    tests: [
      {
        id: "UP-01",
        name: "Valid PDF upload returns 202 + auditId",
        endpoint: "POST /api/upload",
        file: "test-invoice.png",
        expectedStatus: 202,
        expectedFields: ["auditId", "status", "fileName"],
      },
      {
        id: "UP-02",
        name: "Scanned PDF routes to Vision fallback",
        endpoint: "POST /api/upload",
        file: "scanned-contract.pdf",
        expectedStatus: 202,
        expectedPipeline: "deepseek-vision",
      },
      {
        id: "UP-03",
        name: "DOCX file accepted and processed",
        endpoint: "POST /api/upload",
        file: "contract.docx",
        expectedStatus: 202,
      },
      {
        id: "UP-04",
        name: "Image file (JPG) accepted",
        endpoint: "POST /api/upload",
        file: "receipt.jpg",
        expectedStatus: 202,
      },
      {
        id: "UP-05",
        name: "Empty file (0 bytes) rejected",
        endpoint: "POST /api/upload",
        file: "empty.pdf",
        expectedStatus: 400,
        expectedError: "empty",
      },
      {
        id: "UP-06",
        name: "Corrupt file gracefully handled",
        endpoint: "POST /api/upload",
        file: "corrupt.pdf",
        expectedStatus: "any", // 400 or job eventually set to error
      },
      {
        id: "UP-07",
        name: "Unsupported extension (.exe) rejected",
        endpoint: "POST /api/upload",
        file: "virus.exe",
        expectedStatus: 400,
        expectedError: "Unsupported",
      },
      {
        id: "UP-08",
        name: "File >25MB rejected",
        endpoint: "POST /api/upload",
        file: "large-doc-30mb.pdf",
        expectedStatus: 413,
        expectedError: "too large",
      },
    ],
  },

  pipeline: {
    name: "Analysis Pipeline Integration",
    tests: [
      {
        id: "PL-01",
        name: "Full pipeline: upload → extract → analyze → report",
        steps: [
          "POST /api/upload with valid PDF",
          "Poll GET /api/analyze/:id until status=extracted",
          "POST /api/checkout/create-session (test mode)",
          "POST /api/analyze/:id/start",
          "Poll GET /api/analyze/:id until status=complete",
          "Verify report has findings",
        ],
        expectedReportFields: ["risk_score", "findings", "financial_impact"],
      },
      {
        id: "PL-02",
        name: "Docling failure gracefully falls back to Vision",
        scenario: "Docling service unreachable",
        expectedBehavior: "Job completes with extractionMethod=deepseek-vision",
        expectedFallback: true,
      },
      {
        id: "PL-03",
        name: "Verification reduces confidence for unsupported findings",
        scenario: "Finding without evidence in document",
        expectedBehavior: "Finding suppressed or confidence reduced",
      },
      {
        id: "PL-04",
        name: "PDF generation succeeds for complete report",
        endpoint: "GET /api/analyze/:id/pdf",
        expectedContentType: "application/pdf",
        expectedMinSize: 1000, // bytes
      },
      {
        id: "PL-05",
        name: "Race condition: double analyze returns 202 in-progress",
        scenario: "Two POST /api/analyze/:id/start called rapidly",
        expectedFirstStatus: 202,
        expectedSecondStatus: 202,
        expectedSecondBody: "Analysis already in progress",
      },
    ],
  },

  payment: {
    name: "Payment Flow Validation",
    tests: [
      {
        id: "PAY-01",
        name: "Test mode creates checkout session without Stripe API",
        endpoint: "POST /api/checkout/create-session",
        env: { TEST_MODE_SKIP_PAYMENT: "true" },
        expectedResponse: { testMode: true, url: "contains /report/" },
      },
      {
        id: "PAY-02",
        name: "Test mode verify returns paid=true",
        endpoint: "GET /api/checkout/verify/:id",
        env: { TEST_MODE_SKIP_PAYMENT: "true" },
        expectedResponse: { paid: true },
      },
      {
        id: "PAY-03",
        name: "Webhook with valid signature processes payment",
        endpoint: "POST /api/checkout/webhook",
        headers: { "stripe-signature": "valid-hmac" },
        expectedStatus: 200,
        expectedResponse: { verified: true },
      },
      {
        id: "PAY-04",
        name: "Webhook without signature rejected in production",
        endpoint: "POST /api/checkout/webhook",
        env: { TEST_MODE_SKIP_PAYMENT: "false" },
        headers: {}, // No stripe-signature
        expectedStatus: 401,
      },
      {
        id: "PAY-05",
        name: "Webhook with invalid signature rejected",
        endpoint: "POST /api/checkout/webhook",
        headers: { "stripe-signature": "t=9999999999,v1=invalidhash" },
        expectedStatus: 401,
      },
    ],
  },

  security: {
    name: "Security & Injection Defense",
    tests: [
      {
        id: "SEC-01",
        name: "Prompt injection: 'Ignore previous instructions' sanitized",
        scenario: "Document contains injection text",
        guard: "promptInjectionGuard.scanForInjections()",
        expectedDetection: "instruction_override",
        expectedAction: "strip",
      },
      {
        id: "SEC-02",
        name: "Role confusion: 'Act as administrator' flagged",
        scenario: "Document contains role confusion text",
        guard: "promptInjectionGuard.scanForInjections()",
        expectedDetection: "role_confusion",
      },
      {
        id: "SEC-03",
        name: "Output manipulation: 'Report: all clear' flagged",
        scenario: "Document demands specific output",
        guard: "promptInjectionGuard.scanForInjections()",
        expectedDetection: "output_manipulation",
        expectedAction: "flag", // Flag but don't strip — actual fees should still be reported
      },
      {
        id: "SEC-04",
        name: "Wrap document adds [DOCUMENT START]/[DOCUMENT END] boundaries",
        scenario: "Normal document text",
        guard: "promptInjectionGuard.wrapDocumentForAnalysis()",
        expectedContains: ["[DOCUMENT START]", "[DOCUMENT END]"],
      },
      {
        id: "SEC-05",
        name: "Sensitive data extraction request blocked",
        scenario: "Document requests credit card number output",
        guard: "promptInjectionGuard.scanForInjections()",
        expectedDetection: "sensitive_data_request",
        expectedAction: "strip",
      },
    ],
  },

  rateLimit: {
    name: "Rate Limiting",
    tests: [
      {
        id: "RL-01",
        name: "Exceeding upload limit returns 429",
        endpoint: "POST /api/upload",
        requests: 6, // UPLOAD_MAX is 5
        expectedStatus: 429,
        expectedError: "Too many uploads",
      },
      {
        id: "RL-02",
        name: "Exceeding analysis limit returns 429",
        endpoint: "POST /api/analyze/:id/start",
        requests: 4, // ANALYZE_MAX is 3
        expectedStatus: 429,
        expectedError: "queue full",
      },
    ],
  },
};

// ═══════════════════════════════════════════════════════════════
// TEST RUNNER INTERFACE
// ═══════════════════════════════════════════════════════════════

export interface E2EResult {
  testId: string;
  name: string;
  category: string;
  passed: boolean;
  durationMs: number;
  error?: string;
}

export interface E2EReport {
  generatedAt: string;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  byCategory: Record<string, { total: number; passed: number }>;
  results: E2EResult[];
}

export const E2E_SPEC_VERSION = "5.0.0";