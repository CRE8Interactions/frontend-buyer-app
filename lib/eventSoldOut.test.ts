import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEMO_EVENTS, demoTicketGroups } from "@/lib/demo/fixtures";

vi.mock("@/lib/api", () => ({
  getEventsByIds: vi.fn(),
  getTicketGroups: vi.fn(),
}));

import { getTicketGroups } from "@/lib/api";
import { isEventSoldOut, withGaInventorySoldOut } from "@/lib/eventSoldOut";

const mockedGetTicketGroups = vi.mocked(getTicketGroups);
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
