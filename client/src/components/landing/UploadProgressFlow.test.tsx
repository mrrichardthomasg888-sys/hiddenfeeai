// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

const uploadMocks = vi.hoisted(() => ({
  prepare: vi.fn(async (file: File) => file),
  upload: vi.fn(),
}));

const scannerHarness = vi.hoisted(() => ({
  preparingAttempts: 0,
  advanceCreating: undefined as undefined | (() => void),
  confirm: undefined as undefined | (() => void),
  fail: undefined as undefined | ((message: string) => void),
}));

vi.mock("@/lib/upload", () => ({
  prepareUploadFile: uploadMocks.prepare,
  uploadDocument: uploadMocks.upload,
}));

vi.mock("@/components/landing/DocumentScanner", () => ({
  DocumentScanner: (props: {
    collapsed?: boolean;
    onPreparing?: (pageCount: number) => boolean;
    onPreparationStage?: (stage: "preparing_scans" | "creating_document") => void;
    onPreparationError?: (message: string) => void;
    onConfirm: (file: File, metadata: { pageCount: number; creationTimeMs: number }) => void;
  }) => {
    scannerHarness.advanceCreating = () => props.onPreparationStage?.("creating_document");
    scannerHarness.confirm = () => props.onConfirm(
      new File(["scan-pdf"], "HiddenFeeAI-scan.pdf", { type: "application/pdf" }),
      { pageCount: 5, creationTimeMs: 25 },
    );
    scannerHarness.fail = (message) => props.onPreparationError?.(message);
    return (
      <div data-testid="scanner-shell" data-collapsed={String(Boolean(props.collapsed))}>
        <button type="button" onClick={() => {
          scannerHarness.preparingAttempts += 1;
          if (props.onPreparing?.(5) !== false) props.onPreparationStage?.("preparing_scans");
        }}>Mock Continue to Analysis</button>
      </div>
    );
  },
}));

import { UploadCard } from "@/components/landing/UploadCard";

function deferredUpload() {
  let resolve!: (value: { auditId: string; fileName?: string }) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<{ auditId: string; fileName?: string }>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

const scrollIntoView = vi.fn();

beforeEach(() => {
  uploadMocks.prepare.mockClear();
  uploadMocks.upload.mockReset();
  scannerHarness.preparingAttempts = 0;
  scannerHarness.advanceCreating = undefined;
  scannerHarness.confirm = undefined;
  scannerHarness.fail = undefined;
  scrollIntoView.mockClear();
  Object.defineProperty(Element.prototype, "scrollIntoView", { configurable: true, value: scrollIntoView });
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { callback(0); return 1; });
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  vi.stubGlobal("IntersectionObserver", class { observe() {} unobserve() {} disconnect() {} });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("shared upload progress experience", () => {
  it.each([
    ["statement.pdf", "application/pdf", "PDF file"],
    ["agreement.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "DOCX file"],
    ["charges.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "XLSX file"],
    ["receipt.png", "image/png", "PNG file"],
  ])("shows %s metadata and the progress panel before upload completes", async (name, type, typeLabel) => {
    const pending = deferredUpload();
    uploadMocks.upload.mockReturnValue(pending.promise);
    render(<MemoryRouter><UploadCard /></MemoryRouter>);
    const file = new File(["document-bytes"], name, { type });

    fireEvent.change(document.getElementById("file-upload-input")!, { target: { files: [file] } });

    expect(await screen.findByRole("heading", { name: "Uploading document…" })).toBeTruthy();
    expect(screen.getByText(name)).toBeTruthy();
    expect(screen.getByText(new RegExp(typeLabel))).toBeTruthy();
    expect(screen.getByTestId("upload-progress").getAttribute("aria-live")).toBe("polite");
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" }));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Uploading document…" })));
  });

  it("uses immediate scrolling when reduced motion is enabled", async () => {
    const pending = deferredUpload();
    uploadMocks.upload.mockReturnValue(pending.promise);
    vi.stubGlobal("matchMedia", vi.fn((query: string) => ({ matches: query.includes("prefers-reduced-motion"), addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    render(<MemoryRouter><UploadCard /></MemoryRouter>);

    fireEvent.change(document.getElementById("file-upload-input")!, { target: { files: [new File(["pdf"], "reduced.pdf", { type: "application/pdf" })] } });
    await screen.findByRole("heading", { name: "Uploading document…" });
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "auto", block: "start" }));
  });

  it("scrolls and focuses a validation error without starting an upload", async () => {
    render(<MemoryRouter><UploadCard /></MemoryRouter>);
    fireEvent.change(document.getElementById("file-upload-input")!, { target: { files: [new File(["bad"], "unsafe.exe")] } });
    const error = await screen.findByRole("alert");
    expect(error.textContent).toMatch(/Unsupported file type/i);
    expect(document.activeElement).toBe(error);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(uploadMocks.upload).not.toHaveBeenCalled();
  });

  it("preserves a failed saved file and prevents duplicate uploads", async () => {
    const pending = deferredUpload();
    uploadMocks.upload.mockReturnValueOnce(pending.promise);
    render(<MemoryRouter><UploadCard /></MemoryRouter>);
    const file = new File(["pdf"], "retry-me.pdf", { type: "application/pdf" });
    const input = document.getElementById("file-upload-input")!;

    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(uploadMocks.upload).toHaveBeenCalledTimes(1));
    pending.reject(new Error("Network interrupted"));

    expect(await screen.findByText("Network interrupted")).toBeTruthy();
    expect(screen.getByText("retry-me.pdf")).toBeTruthy();
    uploadMocks.upload.mockReturnValueOnce(deferredUpload().promise);
    await userEvent.click(screen.getByRole("button", { name: "Retry Upload" }));
    await waitFor(() => expect(uploadMocks.upload).toHaveBeenCalledTimes(2));
  });

  it("uses the same progress target for desktop drag-and-drop", async () => {
    uploadMocks.upload.mockReturnValue(deferredUpload().promise);
    render(<MemoryRouter><UploadCard /></MemoryRouter>);
    const file = new File(["spreadsheet"], "drop-test.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const uploadArea = document.getElementById("upload")!;

    fireEvent.dragOver(uploadArea, { dataTransfer: { files: [file] } });
    fireEvent.drop(uploadArea, { dataTransfer: { files: [file] } });

    expect(await screen.findByRole("heading", { name: "Uploading document…" })).toBeTruthy();
    expect(screen.getByText("drop-test.xlsx")).toBeTruthy();
    expect(uploadMocks.upload).toHaveBeenCalledTimes(1);
  });

  it("collapses the scanner, shows progress before PDF creation, and blocks double taps", async () => {
    uploadMocks.upload.mockReturnValue(deferredUpload().promise);
    render(<MemoryRouter><UploadCard /></MemoryRouter>);
    await userEvent.click(screen.getByRole("button", { name: /Scan Document/i }));
    const continueButton = screen.getByRole("button", { name: "Mock Continue to Analysis" });

    fireEvent.click(continueButton);
    fireEvent.click(continueButton);

    expect(await screen.findByText("Preparing scanned pages…")).toBeTruthy();
    expect(screen.getByTestId("scanner-shell").getAttribute("data-collapsed")).toBe("true");
    expect(scannerHarness.preparingAttempts).toBe(2);
    expect(uploadMocks.upload).not.toHaveBeenCalled();
    scannerHarness.advanceCreating?.();
    expect(await screen.findByText("Creating document…")).toBeTruthy();
    scannerHarness.confirm?.();
    await waitFor(() => expect(uploadMocks.upload).toHaveBeenCalledTimes(1));
    expect(screen.getByText("HiddenFeeAI-scan.pdf")).toBeTruthy();
    expect(screen.getByText(/5 pages/)).toBeTruthy();
  });

  it("returns to intact scanner pages after PDF creation fails", async () => {
    render(<MemoryRouter><UploadCard /></MemoryRouter>);
    await userEvent.click(screen.getByRole("button", { name: /Scan Document/i }));
    fireEvent.click(screen.getByRole("button", { name: "Mock Continue to Analysis" }));
    scannerHarness.fail?.("Synthetic PDF failure");

    expect(await screen.findByText("Synthetic PDF failure")).toBeTruthy();
    expect(screen.getByTestId("scanner-shell").getAttribute("data-collapsed")).toBe("true");
    await userEvent.click(screen.getByRole("button", { name: "Return to Scan Document" }));
    expect(screen.getByTestId("scanner-shell").getAttribute("data-collapsed")).toBe("false");
    expect(uploadMocks.upload).not.toHaveBeenCalled();
  });

  it("keeps the scanner available after its generated PDF upload fails", async () => {
    uploadMocks.upload.mockRejectedValueOnce(new Error("Scan upload interrupted"));
    render(<MemoryRouter><UploadCard /></MemoryRouter>);
    await userEvent.click(screen.getByRole("button", { name: /Scan Document/i }));
    fireEvent.click(screen.getByRole("button", { name: "Mock Continue to Analysis" }));
    scannerHarness.confirm?.();

    expect(await screen.findByText("Scan upload interrupted")).toBeTruthy();
    expect(screen.getByText("HiddenFeeAI-scan.pdf")).toBeTruthy();
    expect(screen.getByTestId("scanner-shell").getAttribute("data-collapsed")).toBe("true");
    await userEvent.click(screen.getByRole("button", { name: "Return to Scan Document" }));
    expect(screen.getByTestId("scanner-shell").getAttribute("data-collapsed")).toBe("false");
  });

  it("creates only one checkout request when the payment action is double-clicked", async () => {
    uploadMocks.upload.mockResolvedValue({ auditId: "audit-lock-1", fileName: "lock.pdf" });
    const never = new Promise<Response>(() => undefined);
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/checkout/create-session")) return never;
      return Promise.resolve(new Response(JSON.stringify({ status: "extracted" }), { status: 200, headers: { "content-type": "application/json" } }));
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<MemoryRouter><UploadCard /></MemoryRouter>);
    fireEvent.change(document.getElementById("file-upload-input")!, { target: { files: [new File(["pdf"], "lock.pdf", { type: "application/pdf" })] } });

    const checkout = await screen.findByRole("button", { name: /Get My Complete Report/i }, { timeout: 3_000 });
    fireEvent.click(checkout);
    fireEvent.click(checkout);

    const checkoutCalls = fetchMock.mock.calls.filter(([input]) => String(input).includes("/checkout/create-session"));
    expect(checkoutCalls).toHaveLength(1);
  });
});
