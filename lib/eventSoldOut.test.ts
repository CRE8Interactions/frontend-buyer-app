import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEMO_EVENTS, demoTicketGroups } from "@/lib/demo/fixtures";
import { formatOnSaleBadge } from "@/lib/helpers";

vi.mock("@/lib/api", () => ({
  getEventsByIds: vi.fn(),
  getTicketGroups: vi.fn(),
}));

import { getEventsByIds, getTicketGroups } from "@/lib/api";
import {
  isEventSoldOut,
  onSaleBadgeLabel,
  withGaInventorySoldOut,
  withSoldOutFlags,
} from "@/lib/eventSoldOut";

const mockedGetTicketGroups = vi.mocked(getTicketGroups);
const mockedGetEventsByIds = vi.mocked(getEventsByIds);
const FUTURE_ONSALE = "2026-11-01T17:00:00.000Z";
const gaEvents = DEMO_EVENTS.filter((event) => event.seatmap?.ga_only && event.status === "on_sale");
const seated = DEMO_EVENTS.find((event) => event.seatmap?.ga_only === false && event.status === "on_sale")!;

describe("withGaInventorySoldOut", () => {
  beforeEach(() => {
    mockedGetTicketGroups.mockReset();
  });

  it("marks a GA event sold out when its inventory is sold out with nothing left", async () => {
    const event = gaEvents[0];
    mockedGetTicketGroups.mockResolvedValue({
      data: { soldout: true, ticketGroups: [], offers: [] },
    } as never);

    const [flagged] = await withGaInventorySoldOut([event]);

    expect(isEventSoldOut(flagged)).toBe(true);
    expect(mockedGetTicketGroups).toHaveBeenCalledWith(
      expect.objectContaining({ event: { id: event.id, uuid: event.uuid } }),
    );
  });

  it("keeps a GA event on sale while it still has tickets to sell", async () => {
    const event = gaEvents[1];
    const { ticketGroups, offers } = demoTicketGroups();
    mockedGetTicketGroups.mockResolvedValue({
      data: { soldout: true, ticketGroups, offers },
    } as never);

    const [flagged] = await withGaInventorySoldOut([event]);

    expect(isEventSoldOut(flagged)).toBe(false);
  });

  it("does not look up inventory for seated events", async () => {
    const [flagged] = await withGaInventorySoldOut([seated]);

    expect(isEventSoldOut(flagged)).toBe(false);
    expect(mockedGetTicketGroups).not.toHaveBeenCalled();
  });
});

describe("onSaleBadgeLabel", () => {
  const onsaleCopy = formatOnSaleBadge(FUTURE_ONSALE, seated.venue.timezone);

  beforeEach(() => {
    mockedGetTicketGroups.mockReset();
    mockedGetEventsByIds.mockReset();
    mockedGetTicketGroups.mockResolvedValue({
      data: { soldout: false, ticketGroups: [{ id: "left" }], offers: [] },
    } as never);
  });

  it("badges a future public on-sale time for seated and GA events", () => {
    const ga = gaEvents[0];
    expect(
      onSaleBadgeLabel({ ...seated, status: "on_sale", generalOnsale: FUTURE_ONSALE }),
    ).toBe(onsaleCopy);
    expect(
      onSaleBadgeLabel({ ...ga, status: "on_sale", generalOnsale: FUTURE_ONSALE }),
    ).toBe(formatOnSaleBadge(FUTURE_ONSALE, ga.venue?.timezone));
  });

  it("hides the badge when the time has passed, is hidden, or the event is sold out", () => {
    expect(
      onSaleBadgeLabel({
        ...seated,
        status: "on_sale",
        generalOnsale: "2020-11-01T17:00:00.000Z",
      }),
    ).toBe("");
    expect(
      onSaleBadgeLabel({
        ...gaEvents[0],
        status: "on_sale",
        generalOnsale: FUTURE_ONSALE,
        hideGeneralOnsale: true,
      }),
    ).toBe("");
    expect(
      onSaleBadgeLabel({
        ...seated,
        status: "on_sale",
        soldOut: true,
        generalOnsale: FUTURE_ONSALE,
      }),
    ).toBe("");
  });

  it("copies the public on-sale time from the event record onto list stubs", async () => {
    const ga = { ...gaEvents[0], id: 99001, uuid: "evt-onsale-ga" };
    mockedGetEventsByIds.mockResolvedValue({
      data: {
        data: [seated, ga].map((event) => ({
          id: event.id,
          attributes: {
            uuid: event.uuid,
            shortCode: event.shortCode,
            status: "on_sale",
            generalOnsale: FUTURE_ONSALE,
            hideGeneralOnsale: false,
          },
        })),
      },
    } as never);

    const [seatedFlagged, gaFlagged] = await withSoldOutFlags([
      { ...seated },
      ga,
    ]);

    expect(onSaleBadgeLabel(seatedFlagged)).toBe(onsaleCopy);
    expect(onSaleBadgeLabel(gaFlagged)).toBe(
      formatOnSaleBadge(FUTURE_ONSALE, ga.venue?.timezone),
    );
  });
});
