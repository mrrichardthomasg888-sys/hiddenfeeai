// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

const pdfMockState = vi.hoisted(() => ({ outputSize: 128, addPageCalls: 0, addImageCalls: 0 }));

vi.mock("jspdf", () => ({
  jsPDF: class MockJsPdf {
    internal = { pageSize: { getWidth: () => 210, getHeight: () => 297 } };
    addPage = vi.fn(() => { pdfMockState.addPageCalls += 1; });
    addImage = vi.fn(() => { pdfMockState.addImageCalls += 1; });
    output() { return new Blob([new Uint8Array(pdfMockState.outputSize)], { type: "application/pdf" }); }
  },
}));

import { DocumentScanner } from "@/components/landing/DocumentScanner";
import { UploadCard } from "@/components/landing/UploadCard";

interface FakeTrack {
  stop: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
}

function fakeStream() {
  const track: FakeTrack = { stop: vi.fn(), addEventListener: vi.fn() };
  return {
    track,
    stream: {
      getTracks: () => [track],
      getVideoTracks: () => [track],
    } as unknown as MediaStream,
  };
}

function sharpPixels(width: number, height: number): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      const edge = x < 10 || y < 10 || x >= width - 10 || y >= height - 10;
      const value = edge ? 235 : (x + y) % 2 ? 35 : 235;
      pixels[index * 4] = value;
      pixels[index * 4 + 1] = value;
      pixels[index * 4 + 2] = value;
      pixels[index * 4 + 3] = 255;
    }
  }
  return pixels;
}

function flatPixels(width: number, height: number, value: number): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < width * height; index += 1) {
    pixels[index * 4] = value;
    pixels[index * 4 + 1] = value;
    pixels[index * 4 + 2] = value;
    pixels[index * 4 + 3] = 255;
  }
  return pixels;
}

let capturePixelQueue: Uint8ClampedArray[] = [];
let objectUrlIndex = 0;

async function capturePages(count: number) {
  for (let page = 1; page <= count; page += 1) {
    const capture = await screen.findByRole("button", { name: `Capture page ${page}` });
    await waitFor(() => expect((capture as HTMLButtonElement).disabled).toBe(false));
    await userEvent.click(capture);
    expect(await screen.findByRole("button", { name: new RegExp(`Review page ${page},`, "i") })).toBeTruthy();
    if (page < count) await userEvent.click(screen.getByRole("button", { name: /Add Page/i }));
  }
}

beforeEach(() => {
  pdfMockState.outputSize = 128;
  pdfMockState.addPageCalls = 0;
  pdfMockState.addImageCalls = 0;
  capturePixelQueue = [];
  objectUrlIndex = 0;
  Object.defineProperty(HTMLVideoElement.prototype, "videoWidth", { configurable: true, get: () => 1_500 });
  Object.defineProperty(HTMLVideoElement.prototype, "videoHeight", { configurable: true, get: () => 2_000 });
  Object.defineProperty(HTMLVideoElement.prototype, "srcObject", { configurable: true, writable: true, value: null });
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => ({
    drawImage: vi.fn(),
    getImageData: (_x: number, _y: number, width: number, height: number) => ({ data: capturePixelQueue.shift() ?? sharpPixels(width, height) }),
    fillStyle: "#fff",
    fillRect: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
  }) as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) => callback(new Blob(["jpeg-page"], { type: "image/jpeg" })));
  vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ width: 1_500, height: 2_000, close: vi.fn() })));
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  vi.spyOn(URL, "createObjectURL").mockImplementation(() => `blob:scan-${++objectUrlIndex}`);
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("DocumentScanner", () => {
  it("does not request permission until Scan With Camera is selected", async () => {
    const getUserMedia = vi.fn(async () => { throw new DOMException("Denied", "NotAllowedError"); });
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia } });
    render(<MemoryRouter><UploadCard /></MemoryRouter>);
    expect(getUserMedia).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: /Scan With Camera/i }));
    await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(1));
  });

  it("shows a recoverable error when camera permission is denied", async () => {
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: vi.fn(async () => { throw new DOMException("Denied", "NotAllowedError"); }) } });
    const onCancel = vi.fn();
    render(<DocumentScanner maxFileSizeBytes={25 * 1024 * 1024} onCancel={onCancel} onConfirm={vi.fn()} />);
    expect(await screen.findByText(/Camera permission was denied/i)).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: /Cancel scan and delete captured pages/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("captures, reviews, rotates, and continues directly to analysis", async () => {
    const { stream, track } = fakeStream();
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: vi.fn(async () => stream) } });
    const onConfirm = vi.fn();
    render(<DocumentScanner maxFileSizeBytes={25 * 1024 * 1024} onCancel={vi.fn()} onConfirm={onConfirm} />);

    const capture = await screen.findByRole("button", { name: "Capture page 1" });
    await waitFor(() => expect((capture as HTMLButtonElement).disabled).toBe(false));
    await userEvent.click(capture);
    expect(await screen.findByText("Review the complete document")).toBeTruthy();
    expect(screen.getByText("Selected: Page 1")).toBeTruthy();
    const thumbnails = screen.getByRole("list", { name: "Captured page thumbnails" });
    const continueButton = screen.getByRole("button", { name: /Continue to Analysis/i });
    const editor = screen.getByRole("region", { name: "Edit page 1" });
    expect(thumbnails.className).toContain("grid-cols-2");
    expect(continueButton.className).toContain("w-full");
    expect(thumbnails.compareDocumentPosition(continueButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(editor.compareDocumentPosition(continueButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByText(/Create PDF/i)).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Rotate" }));
    await userEvent.click(continueButton);
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    const [file, metadata] = onConfirm.mock.calls[0] as [File, { pageCount: number }];
    expect(file.type).toBe("application/pdf");
    expect(metadata.pageCount).toBe(1);
    expect(pdfMockState.addPageCalls).toBe(0);
    expect(pdfMockState.addImageCalls).toBe(1);
    expect(track.stop).toHaveBeenCalled();
  });

  it.each([1, 2, 5, 10])("preserves all %i pages through background assembly and analysis handoff", async (pageCount) => {
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: vi.fn(async () => fakeStream().stream) } });
    const onConfirm = vi.fn();
    render(<DocumentScanner maxFileSizeBytes={25 * 1024 * 1024} onCancel={vi.fn()} onConfirm={onConfirm} />);

    await capturePages(pageCount);
    expect(screen.getAllByRole("button", { name: /Review page \d+,/i })).toHaveLength(pageCount);
    await userEvent.click(screen.getByRole("button", { name: /Continue to Analysis/i }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));

    const [file, metadata] = onConfirm.mock.calls[0] as [File, { pageCount: number }];
    expect(file.type).toBe("application/pdf");
    expect(metadata.pageCount).toBe(pageCount);
    expect(pdfMockState.addImageCalls).toBe(pageCount);
    expect(pdfMockState.addPageCalls).toBe(pageCount - 1);
  });

  it("warns about duplicate pages without silently dropping either page", async () => {
    const first = fakeStream();
    const second = fakeStream();
    const getUserMedia = vi.fn().mockResolvedValueOnce(first.stream).mockResolvedValueOnce(second.stream);
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia } });
    render(<DocumentScanner maxFileSizeBytes={25 * 1024 * 1024} onCancel={vi.fn()} onConfirm={vi.fn()} />);

    await waitFor(() => expect((screen.getByRole("button", { name: "Capture page 1" }) as HTMLButtonElement).disabled).toBe(false));
    await userEvent.click(screen.getByRole("button", { name: "Capture page 1" }));
    await userEvent.click(await screen.findByRole("button", { name: /Add page/i }));
    await waitFor(() => expect((screen.getByRole("button", { name: "Capture page 2" }) as HTMLButtonElement).disabled).toBe(false));
    await userEvent.click(screen.getByRole("button", { name: "Capture page 2" }));

    expect(await screen.findByText(/resembles page 1/i)).toBeTruthy();
    expect(screen.getByText("Selected: Page 2")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Review page 2, Possible duplicate/i })).toBeTruthy();
  });

  it("keeps a warning attached to the exact thumbnail when pages are reordered", async () => {
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: vi.fn(async () => fakeStream().stream) } });
    capturePixelQueue = [sharpPixels(192, 256), flatPixels(192, 256, 235)];
    const onConfirm = vi.fn();
    render(<DocumentScanner maxFileSizeBytes={25 * 1024 * 1024} onCancel={vi.fn()} onConfirm={onConfirm} />);

    await capturePages(2);
    const warnedPage = screen.getByRole("button", { name: /Review page 2, Image may be blurry/i });
    expect(warnedPage).toBeTruthy();
    await userEvent.click(warnedPage);
    await userEvent.click(screen.getByRole("button", { name: "Earlier" }));

    const reordered = screen.getAllByRole("button", { name: /Review page \d+,/i });
    expect(reordered[0]?.getAttribute("aria-label")).toMatch(/Review page 1, Image may be blurry/i);
    expect(reordered[0]?.querySelector("img")?.getAttribute("src")).toBe("blob:scan-2");
    await userEvent.click(screen.getByRole("button", { name: /Continue to Analysis/i }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    const metadata = onConfirm.mock.calls[0]?.[1] as { pageCount: number } | undefined;
    expect(metadata?.pageCount).toBe(2);
  });

  it("blocks an oversized generated PDF without discarding pages", async () => {
    pdfMockState.outputSize = 512;
    const { stream } = fakeStream();
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: vi.fn(async () => stream) } });
    const onConfirm = vi.fn();
    render(<DocumentScanner maxFileSizeBytes={64} onCancel={vi.fn()} onConfirm={onConfirm} />);
    await waitFor(() => expect((screen.getByRole("button", { name: "Capture page 1" }) as HTMLButtonElement).disabled).toBe(false));
    await userEvent.click(screen.getByRole("button", { name: "Capture page 1" }));
    await userEvent.click(await screen.findByRole("button", { name: /Continue to Analysis/i }));
    expect(await screen.findByText(/exceeds the existing/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Continue to Analysis/i })).toBeTruthy();
    expect(screen.getByText("Selected: Page 1")).toBeTruthy();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("keeps captured pages available after PDF creation fails", async () => {
    const { stream } = fakeStream();
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: vi.fn(async () => stream) } });
    vi.mocked(createImageBitmap).mockRejectedValueOnce(new Error("Synthetic PDF failure"));
    render(<DocumentScanner maxFileSizeBytes={25 * 1024 * 1024} onCancel={vi.fn()} onConfirm={vi.fn()} />);
    await waitFor(() => expect((screen.getByRole("button", { name: "Capture page 1" }) as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByRole("button", { name: "Capture page 1" }));
    await userEvent.click(await screen.findByRole("button", { name: /Continue to Analysis/i }));
    expect(await screen.findByText("Synthetic PDF failure")).toBeTruthy();
    expect(screen.getByText("Selected: Page 1")).toBeTruthy();
  });
});
