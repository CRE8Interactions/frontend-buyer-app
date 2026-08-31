import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEMO_EVENTS } from "@/lib/demo/fixtures";
import {
  printTicketsPdf,
  resolveTicketTheme,
  type TicketPdfRequest,
} from "@/lib/ticketPdf";

const nmState = DEMO_EVENTS.find((event) => event.shortCode === "NMST004")!;

describe("printed ticket branding", () => {
  it("draws a team event in the organization brand colour with a sporting badge", () => {
    const theme = resolveTicketTheme(nmState);

    expect(theme.primaryColor).toBe(
      nmState.organization.branding?.primaryColor,
    );
    expect(theme.badgeLabel).toBe("SPORTING EVENT");
  });

  it("falls back to Blocktickets navy and a generic badge without org branding", () => {
    const theme = resolveTicketTheme({ name: "Community Meetup" });

    expect(theme.primaryColor).toBe("#051b35");
    expect(theme.badgeLabel).toBe("EVENT TICKET");
  });
});

describe("printTicketsPdf", () => {
  const objectUrl = "blob:ticket-pdf";
  let blobs: Blob[];

  beforeEach(() => {
    blobs = [];
    vi.spyOn(URL, "createObjectURL").mockImplementation((blob: Blob | MediaSource) => {
      blobs.push(blob as Blob);
      return objectUrl;
    });
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const request = (overrides: Partial<TicketPdfRequest> = {}) =>
    ({
      event: nmState,
      tickets: [
        { id: 1, checkInCode: "NMS-1", holder: "Jaime Convery", sectionNumber: "G", rowNumber: 20, seatNumber: 20 },
        { id: 2, checkInCode: "NMS-2", holder: "Jaime Convery", sectionNumber: "G", rowNumber: 20, seatNumber: 21 },
      ],
      mode: "download",
      ...overrides,
    }) as TicketPdfRequest;

  it("downloads every selected ticket as one PDF named after the event", async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    await printTicketsPdf(request({ filename: nmState.name }));

    expect(click).toHaveBeenCalledOnce();
    expect(blobs).toHaveLength(1);
    expect(blobs[0].type).toBe("application/pdf");
    expect(blobs[0].size).toBeGreaterThan(0);
  });

  it("refuses to print a ticket that has no check-in code", async () => {
    await expect(
      printTicketsPdf(request({ tickets: [{ id: 3, checkInCode: "" }] })),
    ).rejects.toThrow(/check-in code/i);
  });
});
