// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

const pdfMockState = vi.hoisted(() => ({ outputSize: 128 }));

vi.mock("jspdf", () => ({
  jsPDF: class MockJsPdf {
    internal = { pageSize: { getWidth: () => 210, getHeight: () => 297 } };
    addPage = vi.fn();
    addImage = vi.fn();
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
  for (let index = 0; index < width * height; index += 1) {
    const value = index % 2 ? 35 : 235;
    pixels[index * 4] = value;
    pixels[index * 4 + 1] = value;
    pixels[index * 4 + 2] = value;
    pixels[index * 4 + 3] = 255;
  }
  return pixels;
}

beforeEach(() => {
  pdfMockState.outputSize = 128;
  Object.defineProperty(HTMLVideoElement.prototype, "videoWidth", { configurable: true, get: () => 1_500 });
  Object.defineProperty(HTMLVideoElement.prototype, "videoHeight", { configurable: true, get: () => 2_000 });
  Object.defineProperty(HTMLVideoElement.prototype, "srcObject", { configurable: true, writable: true, value: null });
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => ({
    drawImage: vi.fn(),
    getImageData: (_x: number, _y: number, width: number, height: number) => ({ data: sharpPixels(width, height) }),
    fillStyle: "#fff",
    fillRect: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
  }) as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) => callback(new Blob(["jpeg-page"], { type: "image/jpeg" })));
  vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ width: 1_500, height: 2_000, close: vi.fn() })));
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  vi.spyOn(URL, "createObjectURL").mockImplementation(() => `blob:scan-${Math.random()}`);
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

  it("captures, reviews, rotates, creates, and explicitly confirms a PDF", async () => {
    const { stream, track } = fakeStream();
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: vi.fn(async () => stream) } });
    const onConfirm = vi.fn();
    render(<DocumentScanner maxFileSizeBytes={25 * 1024 * 1024} onCancel={vi.fn()} onConfirm={onConfirm} />);

    const capture = await screen.findByRole("button", { name: "Capture page 1" });
    await waitFor(() => expect((capture as HTMLButtonElement).disabled).toBe(false));
    await userEvent.click(capture);
    expect(await screen.findByText("Review the complete document")).toBeTruthy();
    expect(screen.getByText("Page 1 of 1")).toBeTruthy();

    await userEvent.click(screen.getByRole("button", { name: "Rotate" }));
    await userEvent.click(screen.getByRole("button", { name: /Create PDF/i }));
    expect(await screen.findByText("PDF ready for your confirmation")).toBeTruthy();
    expect(screen.getByText("HiddenFeeAI-scan-", { exact: false })).toBeTruthy();
    expect(onConfirm).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: /Confirm and send for analysis/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    const [file, metadata] = onConfirm.mock.calls[0] as [File, { pageCount: number }];
    expect(file.type).toBe("application/pdf");
    expect(metadata.pageCount).toBe(1);
    expect(track.stop).toHaveBeenCalled();
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
    expect(screen.getByText("Page 2 of 2")).toBeTruthy();
  });

  it("blocks an oversized generated PDF without discarding pages", async () => {
    pdfMockState.outputSize = 512;
    const { stream } = fakeStream();
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: vi.fn(async () => stream) } });
    const onConfirm = vi.fn();
    render(<DocumentScanner maxFileSizeBytes={64} onCancel={vi.fn()} onConfirm={onConfirm} />);
    await waitFor(() => expect((screen.getByRole("button", { name: "Capture page 1" }) as HTMLButtonElement).disabled).toBe(false));
    await userEvent.click(screen.getByRole("button", { name: "Capture page 1" }));
    await userEvent.click(await screen.findByRole("button", { name: /Create PDF/i }));
    expect(await screen.findByText(/exceeds the existing/i)).toBeTruthy();
    expect((screen.getByRole("button", { name: /Confirm and send for analysis/i }) as HTMLButtonElement).disabled).toBe(true);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("keeps captured pages available after PDF creation fails", async () => {
    const { stream } = fakeStream();
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: vi.fn(async () => stream) } });
    vi.mocked(createImageBitmap).mockRejectedValueOnce(new Error("Synthetic PDF failure"));
    render(<DocumentScanner maxFileSizeBytes={25 * 1024 * 1024} onCancel={vi.fn()} onConfirm={vi.fn()} />);
    await waitFor(() => expect((screen.getByRole("button", { name: "Capture page 1" }) as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByRole("button", { name: "Capture page 1" }));
    await userEvent.click(await screen.findByRole("button", { name: /Create PDF/i }));
    expect(await screen.findByText("Synthetic PDF failure")).toBeTruthy();
    expect(screen.getByText("Page 1 of 1")).toBeTruthy();
  });
});

