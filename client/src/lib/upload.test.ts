// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { UploadError, uploadDocument } from "@/lib/upload";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("uploadDocument", () => {
  it("sends a PDF through the existing multipart upload contract", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      expect(init?.method).toBe("POST");
      expect(init?.body).toBeInstanceOf(FormData);
      const form = init?.body as FormData;
      const uploaded = form.get("file") as File;
      expect(uploaded.name).toBe("HiddenFeeAI-scan.pdf");
      expect(uploaded.type).toBe("application/pdf");
      return new Response(JSON.stringify({ auditId: "audit-scan-1", fileName: uploaded.name }), {
        status: 201,
        headers: { "content-type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const file = new File(["%PDF-test"], "HiddenFeeAI-scan.pdf", { type: "application/pdf" });
    await expect(uploadDocument(file)).resolves.toEqual({ auditId: "audit-scan-1", fileName: "HiddenFeeAI-scan.pdf" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("surfaces the existing 25 MB rejection as a typed error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: "File too large. Maximum size is 25MB." }), {
      status: 413,
      headers: { "content-type": "application/json" },
    })));

    const file = new File(["pdf"], "large.pdf", { type: "application/pdf" });
    await expect(uploadDocument(file)).rejects.toMatchObject({ code: "file_too_large", status: 413 });
  });

  it("rejects invalid success responses instead of entering a broken workflow", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("not-json", { status: 201, headers: { "content-type": "text/plain" } })));
    await expect(uploadDocument(new File(["pdf"], "scan.pdf", { type: "application/pdf" }))).rejects.toMatchObject({ code: "invalid_response" });
  });

  it("reports network failure without losing the original error contract", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("offline"); }));
    await expect(uploadDocument(new File(["pdf"], "scan.pdf", { type: "application/pdf" }))).rejects.toMatchObject({ code: "network_error" });
  });

  it("allows a scanner upload to be canceled", async () => {
    vi.stubGlobal("fetch", vi.fn((_url: string, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
    })));
    const controller = new AbortController();
    const upload = uploadDocument(new File(["pdf"], "scan.pdf", { type: "application/pdf" }), { signal: controller.signal });
    controller.abort();
    await expect(upload).rejects.toEqual(expect.objectContaining<Partial<UploadError>>({ code: "canceled" }));
  });
});

