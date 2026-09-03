import { describe, expect, it } from "vitest";
import { demoTicketGroups, DEMO_SEATED_TICKET_GROUPS } from "@/lib/demo/fixtures";
import {
  connectedOfferUnitPrice,
  expandGroupsWithConnectedOffers,
  isStandaloneCatalogOffer,
} from "@/lib/connectedOffers";

describe("connectedOfferUnitPrice", () => {
  it("matches the parent PLName to the connected pricing object", () => {
    const group = demoTicketGroups().ticketGroups[0];
    const connected = group.offer!.connected_offers![0];

    expect(connectedOfferUnitPrice(group, connected)).toBe(15);
  });
});

describe("expandGroupsWithConnectedOffers", () => {
  it("adds a connected GA row with the derived price", () => {
    const [parent, ...rest] = expandGroupsWithConnectedOffers(
      demoTicketGroups().ticketGroups,
    );
    const connected = rest.find((g) => g.offer?.name === "Student Rate");

    expect(parent.offer?.name).toBe("Standard Admission");
    expect(connected).toMatchObject({
      price: 15,
      offer: expect.objectContaining({ name: "Student Rate", isConnectedOffer: true }),
    });
  });

  it("adds a connected seated row for Section A-B", () => {
    const group = DEMO_SEATED_TICKET_GROUPS.find((g) => g.id === 2)!;
    const expanded = expandGroupsWithConnectedOffers([group]);
    const companion = expanded.find((g) => g.offer?.name === "Companion Seat");

    expect(expanded).toHaveLength(2);
    expect(companion).toMatchObject({
      price: 12,
      offer: expect.objectContaining({ name: "Companion Seat" }),
    });
  });
});

describe("isStandaloneCatalogOffer", () => {
  it("drops connected child offers from the chip catalog", () => {
    expect(isStandaloneCatalogOffer({ name: "VIP Club" })).toBe(true);
    expect(
      isStandaloneCatalogOffer({ name: "Student Rate", isConnectedOffer: true }),
    ).toBe(false);
  });
});
