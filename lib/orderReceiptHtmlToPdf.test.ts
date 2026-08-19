import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { demoCompletedTicketOrder } from "@/lib/demo/fixtures";
import { buildOrderReceipt } from "@/lib/orderReceipt";
import { renderOrderReceiptHtml } from "@/lib/orderReceiptHtml";

const PNG_1X1 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

vi.mock("html-to-image", () => ({
  toPng: vi.fn(async () => PNG_1X1),
}));

import { toPng } from "html-to-image";
import { htmlToReceiptPdf } from "./orderReceiptHtmlToPdf";

const mockedToPng = vi.mocked(toPng);

describe("htmlToReceiptPdf", () => {
  const pngBytes = Uint8Array.from(atob(PNG_1X1.split(",")[1]), (char) =>
    char.charCodeAt(0),
  );

  beforeEach(() => {
    mockedToPng.mockReset();
    mockedToPng.mockResolvedValue(PNG_1X1);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(pngBytes, { headers: { "Content-Type": "image/png" } })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("builds a PDF from the invoice HTML", async () => {
    const html = renderOrderReceiptHtml(buildOrderReceipt(demoCompletedTicketOrder())!);
    const bytes = await htmlToReceiptPdf(html);
    expect(bytes.byteLength).toBeGreaterThan(100);
    expect(String.fromCharCode(...bytes.slice(0, 4))).toBe("%PDF");
  });

  it("inlines the organization logo before capturing the receipt", async () => {
    mockedToPng.mockImplementation(async (node: HTMLElement) => {
      const logo = node.querySelector(".invoice-doc__logo");
      expect(logo?.getAttribute("src")).toMatch(/^data:image\//);
      return PNG_1X1;
    });

    const html = renderOrderReceiptHtml(buildOrderReceipt(demoCompletedTicketOrder())!);
    await htmlToReceiptPdf(html);
    expect(fetch).toHaveBeenCalled();
    expect(String(vi.mocked(fetch).mock.calls[0]?.[0])).toContain("receipt-logo");
    expect(mockedToPng).toHaveBeenCalledTimes(1);
  });

  it("retries inlining the organization logo and does not capture until it succeeds", async () => {
    vi.stubGlobal(
      "Image",
      class {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        set src(_value: string) {
          queueMicrotask(() => this.onerror?.());
        }
      },
    );
    vi.mocked(fetch)
      .mockRejectedValueOnce(new Error("timeout"))
      .mockRejectedValueOnce(new Error("timeout"))
      .mockResolvedValue(
        new Response(pngBytes, { headers: { "Content-Type": "image/png" } }),
      );

    mockedToPng.mockImplementation(async (node: HTMLElement) => {
      const logo = node.querySelector(".invoice-doc__logo");
      expect(logo?.getAttribute("src")).toMatch(/^data:image\//);
      return PNG_1X1;
    });

    const html = renderOrderReceiptHtml(buildOrderReceipt(demoCompletedTicketOrder())!);
    await htmlToReceiptPdf(html);
    expect(mockedToPng).toHaveBeenCalledTimes(1);
  });

  it("does not build a PDF when the organization logo never loads", async () => {
    vi.stubGlobal(
      "Image",
      class {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        set src(_value: string) {
          queueMicrotask(() => this.onerror?.());
        }
      },
    );
    vi.mocked(fetch).mockRejectedValue(new Error("unavailable"));
    const html = renderOrderReceiptHtml(buildOrderReceipt(demoCompletedTicketOrder())!);
    await expect(htmlToReceiptPdf(html)).rejects.toThrow(/logo unavailable/i);
    expect(mockedToPng).not.toHaveBeenCalled();
  });

  it("retries capturing the receipt without removing the logo", async () => {
    mockedToPng
      .mockRejectedValueOnce(new Error("Failed to fetch"))
      .mockImplementation(async (node: HTMLElement) => {
        expect(node.querySelector(".invoice-doc__logo")).toBeTruthy();
        return PNG_1X1;
      });
    const html = renderOrderReceiptHtml(buildOrderReceipt(demoCompletedTicketOrder())!);
    const bytes = await htmlToReceiptPdf(html);
    expect(String.fromCharCode(...bytes.slice(0, 4))).toBe("%PDF");
    expect(mockedToPng).toHaveBeenCalledTimes(2);
  });

  it("throws when the HTML has no invoice document", async () => {
    await expect(htmlToReceiptPdf("<p>no receipt</p>")).rejects.toThrow(
      /receipt unavailable/i,
    );
  });
});
