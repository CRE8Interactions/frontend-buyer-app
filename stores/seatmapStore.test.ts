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
      seatOffersLookupTable: {},
      sectionLookupTable: {},
    });
    useFiltersStore.setState({ ticketGroups: [] });
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

  it("blames the ticket limit, not the row, once an exact-limit offer is full", () => {
    const group = {
      ...sectionA,
      offer: { id: sectionA.offer?.id, name: sectionA.offer?.name, limit: 5 },
      GA: false,
    };
    ["a1", "a2", "a3", "a4", "a5"].forEach((seatId) => {
      useSeatmapStore.getState().selectSpecificSeat(seatId, group);
    });
    useSeatmapStore.setState({ seatedError: null });

    // Only a6 is left, so the row cannot seat another 5 either.
    useSeatmapStore
      .getState()
      .selectSeatedOffers("a6", [{ ...group, quantity: 5 }]);

    expect(useSeatmapStore.getState().selectedFromMap).toHaveLength(5);
    expect(useSeatmapStore.getState().seatedError).toEqual(
      maxTicketLimitError(5),
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

  it("blocks only the capped offer once it is full and still adds the uncapped offer", () => {
    const capped = {
      ...sectionA,
      offer: { id: "off-bogo", name: "BOGO", maxQuantity: 2 },
      GA: false as const,
    };
    const open = {
      ...sectionA,
      offer: { id: "off-standard", name: "Standard", maxQuantity: null },
      GA: false as const,
    };

    useSeatmapStore.getState().selectSpecificSeat("a1", capped);
    useSeatmapStore.getState().selectSpecificSeat("a2", capped);
    useSeatmapStore.getState().selectSpecificSeat("a3", open);

    expect(useSeatmapStore.getState().selectedFromMap).toHaveLength(3);
    expect(useSeatmapStore.getState().seatedError).toBeNull();

    useSeatmapStore.getState().selectSpecificSeat("a4", capped);

    expect(useSeatmapStore.getState().selectedFromMap).toHaveLength(3);
    expect(useSeatmapStore.getState().seatedError).toEqual(
      maxTicketLimitError(2, "BOGO"),
    );
  });

  describe("naming the offer whose own limit a mixed selection exceeded", () => {
    const student = {
      ...sectionA,
      offer: { id: "off-student", name: "Student", maxQuantity: 2 },
      GA: false as const,
    };
    const standard = {
      ...sectionA,
      offer: { id: "off-standard", name: "Standard", maxQuantity: null },
      GA: false as const,
    };

    it("names the offer when a mixed selection exceeds that offer's max", () => {
      useSeatmapStore.getState().selectSpecificSeat("a1", standard);
      useSeatmapStore.getState().selectSpecificSeat("a2", student);
      useSeatmapStore.getState().selectSpecificSeat("a3", student);
      useSeatmapStore.getState().selectSpecificSeat("a4", student);

      expect(useSeatmapStore.getState().selectedFromMap).toHaveLength(3);
      expect(useSeatmapStore.getState().seatedError).toEqual(
        maxTicketLimitError(2, "Student"),
      );
      expect(useSeatmapStore.getState().seatedError?.message).toBe(
        "Adding these tickets would exceed the ticket limit of 2 for Student.",
      );
    });

    it("names the offer when the tooltip adds it past its max in a mixed selection", () => {
      useSeatmapStore.getState().selectSpecificSeat("a1", standard);
      useSeatmapStore.getState().selectSpecificSeat("a2", student);
      useSeatmapStore.getState().selectSpecificSeat("a3", student);
      useSeatmapStore
        .getState()
        .selectSeatedOffers("a4", [{ ...student, quantity: 1 }]);

      expect(useSeatmapStore.getState().selectedFromMap).toHaveLength(3);
      expect(useSeatmapStore.getState().seatedError).toEqual(
        maxTicketLimitError(2, "Student"),
      );
    });

    it("leaves the offer out when every selected ticket is the same offer", () => {
      useSeatmapStore.getState().selectSpecificSeat("a1", student);
      useSeatmapStore.getState().selectSpecificSeat("a2", student);
      useSeatmapStore.getState().selectSpecificSeat("a3", student);

      expect(useSeatmapStore.getState().selectedFromMap).toHaveLength(2);
      expect(useSeatmapStore.getState().seatedError).toEqual(
        maxTicketLimitError(2),
      );
    });

    it("leaves the offer out when the event limit is what stopped the add", () => {
      useFiltersStore.setState({ eventTicketLimit: 2 });
      useSeatmapStore.getState().selectSpecificSeat("a1", standard);
      useSeatmapStore.getState().selectSpecificSeat("a2", student);
      useSeatmapStore.getState().selectSpecificSeat("a3", standard);

      expect(useSeatmapStore.getState().selectedFromMap).toHaveLength(2);
      expect(useSeatmapStore.getState().seatedError).toEqual(
        maxTicketLimitError(2),
      );
    });

    it("names the GA offer when a mixed section selection exceeds that offer's max", () => {
      const studentGa = {
        id: "g-student",
        sectionId: "ga",
        GA: true as const,
        availableCount: 20,
        offer: { id: "off-student", name: "Student", maxQuantity: 6 },
      };
      const standardGa = {
        id: "g-standard",
        sectionId: "ga",
        GA: true as const,
        availableCount: 20,
        offer: { id: "off-standard", name: "Standard" },
      };
      useSeatmapStore.getState().selectGASeats([{ ...standardGa, quantity: 1 }]);
      useSeatmapStore.getState().selectGASeats([{ ...studentGa, quantity: 6 }]);
      expect(useSeatmapStore.getState().seatedError).toBeNull();

      useSeatmapStore.getState().selectGASeats([{ ...studentGa, quantity: 1 }]);

      expect(useSeatmapStore.getState().seatedError).toEqual(
        maxTicketLimitError(6, "Student"),
      );
    });

    it("leaves a GA offer unnamed when it is the only offer in the selection", () => {
      const studentGa = {
        id: "g-student",
        sectionId: "ga",
        GA: true as const,
        availableCount: 20,
        offer: { id: "off-student", name: "Student", maxQuantity: 6 },
      };
      useSeatmapStore.getState().selectGASeats([{ ...studentGa, quantity: 6 }]);
      useSeatmapStore.getState().selectGASeats([{ ...studentGa, quantity: 1 }]);

      expect(useSeatmapStore.getState().seatedError).toEqual(
        maxTicketLimitError(6),
      );
    });
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
