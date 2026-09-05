import { beforeEach, describe, expect, it } from "vitest";
import { DEMO_SEATED_TICKET_GROUPS } from "@/lib/demo/fixtures";
import { maxTicketLimitError } from "@/lib/mapSelection";
import { selectionOfferName, selectionTicketCards } from "@/lib/ticketSummary";
import useFiltersStore from "@/stores/filtersStore";
import useSeatmapStore from "@/stores/seatmapStore";

const fieldClub = DEMO_SEATED_TICKET_GROUPS[0];
const sectionA = DEMO_SEATED_TICKET_GROUPS[1];

describe("seatmap ticket limits", () => {
  beforeEach(() => {
    useFiltersStore.setState({ eventTicketLimit: null });
    useSeatmapStore.setState({
      selectedFromMap: [],
      seatedError: null,
      totalCount: 0,
      totalPrice: 0,
      data: null,
      eventTicketLimit: null,
    });
  });

  it("adds a seat that stays under the offer max when the event has no limit", () => {
    const group = {
      ...sectionA,
      offer: { ...sectionA.offer, maxQuantity: 2 },
      GA: false,
    };
    useSeatmapStore.getState().selectSpecificSeat("a1", group);

    expect(useSeatmapStore.getState().selectedFromMap).toHaveLength(1);
    expect(useSeatmapStore.getState().seatedError).toBeNull();
  });

  it("opens the max-ticket popup and does not add a seat past the offer max", () => {
    const group = {
      ...sectionA,
      offer: { ...sectionA.offer, maxQuantity: 2 },
      GA: false,
    };
    useSeatmapStore.getState().selectSpecificSeat("a1", group);
    useSeatmapStore.getState().selectSpecificSeat("a2", group);
    useSeatmapStore.getState().selectSpecificSeat("a3", group);

    expect(useSeatmapStore.getState().selectedFromMap).toHaveLength(2);
    expect(useSeatmapStore.getState().seatedError).toEqual(
      maxTicketLimitError(2),
    );
  });

  it("caps reserved seats at the exact offer limit", () => {
    const group = {
      ...sectionA,
      offer: { id: sectionA.offer?.id, name: sectionA.offer?.name, limit: 2 },
      GA: false,
    };
    useSeatmapStore.getState().selectSpecificSeat("a1", group);
    useSeatmapStore.getState().selectSpecificSeat("a2", group);
    useSeatmapStore.getState().selectSpecificSeat("a3", group);

    expect(useSeatmapStore.getState().selectedFromMap).toHaveLength(2);
    expect(useSeatmapStore.getState().seatedError).toEqual(
      maxTicketLimitError(2),
    );
  });

  it("caps at the offer max even when the event limit is lower", () => {
    useFiltersStore.setState({ eventTicketLimit: 3 });
    const group = {
      ...fieldClub,
      offer: { ...fieldClub.offer, maxQuantity: 4 },
      GA: false,
    };
    useSeatmapStore.getState().selectSpecificSeat("s1", group);
    useSeatmapStore.getState().selectSpecificSeat("s2", group);
    useSeatmapStore.getState().selectSpecificSeat("s3", group);
    useSeatmapStore.getState().selectSpecificSeat("s4", group);
    useSeatmapStore.getState().selectSpecificSeat("s5", group);

    expect(useSeatmapStore.getState().selectedFromMap).toHaveLength(4);
    expect(useSeatmapStore.getState().seatedError).toEqual(
      maxTicketLimitError(4),
    );
  });

  it("opens the max-ticket popup past a package max", () => {
    const group = {
      ...fieldClub,
      offer: undefined,
      package: { id: "pkg-1", name: "Season", maxQuantity: 1 },
      GA: false,
    };
    useSeatmapStore.getState().selectSpecificSeat("s1", group);
    useSeatmapStore.getState().selectSpecificSeat("s2", group);

    expect(useSeatmapStore.getState().selectedFromMap).toHaveLength(1);
    expect(useSeatmapStore.getState().seatedError).toEqual(
      maxTicketLimitError(1),
    );
  });

  it("adds each GA offer from one multi-offer pick as separate selection rows", () => {
    const daypass = {
      id: "g-day",
      sectionId: "sec-b",
      sectionNumber: "B",
      GA: true,
      quantity: 1,
      price: 45.58,
      availableCount: 20,
      offer: { id: "off-day", name: "Military Daypass" },
    };
    const prelims = {
      id: "g-pre",
      sectionId: "sec-b",
      sectionNumber: "B",
      GA: true,
      quantity: 1,
      price: 39.4,
      availableCount: 20,
      offer: { id: "off-pre", name: "Military Prelims" },
    };

    useSeatmapStore.getState().selectGASeats([daypass, prelims]);

    const selected = useSeatmapStore.getState().selectedFromMap;
    expect(selected).toHaveLength(2);
    expect(selected.map((group) => selectionOfferName(group))).toEqual([
      "Military Daypass",
      "Military Prelims",
    ]);
    expect(selectionTicketCards(selected)).toHaveLength(2);
  });
});
