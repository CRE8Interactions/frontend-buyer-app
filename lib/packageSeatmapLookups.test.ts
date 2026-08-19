import { describe, expect, it } from "vitest";
import {
  DEMO_GA_SECTION_ID,
  DEMO_SEATED_TICKET_GROUPS,
  demoSeasonPackage,
  demoTicketGroups,
} from "@/lib/demo/fixtures";
import { createPackageLookupTables } from "@/lib/packageSeatmapLookups";

const listing = DEMO_SEATED_TICKET_GROUPS.find((g) => g.seatIds?.includes("s1"));
if (!listing?.seatIds?.[0] || !listing.offer?.name) {
  throw new Error("demo fixtures need a seated group with an offer on seat s1");
}

describe("createPackageLookupTables", () => {
  it("keeps the ticket offer name on seated package seats", () => {
    const pkg = demoSeasonPackage({
      package_tickets: [
        {
          ...listing,
          seatId: listing.seatIds[0],
        },
      ],
    });

    const { seatLookupTable } = createPackageLookupTables(pkg, null, null);

    expect(seatLookupTable[listing.seatIds[0]]?.offer?.name).toBe(
      listing.offer.name,
    );
  });

  it("does not invent an offer from the package name", () => {
    const { offer: _offer, ...withoutOffer } = listing;
    const pkg = demoSeasonPackage({
      package_tickets: [
        {
          ...withoutOffer,
          seatId: listing.seatIds[0],
        },
      ],
    });

    const { seatLookupTable } = createPackageLookupTables(pkg, null, null);
    const lookedUp = seatLookupTable[listing.seatIds[0]];

    expect(lookedUp?.offer?.name).toBeUndefined();
    expect(lookedUp?.offer?.name).not.toBe(pkg.name);
  });

  it("keeps the ticket offer name on GA package sections", () => {
    const vip = demoTicketGroups().ticketGroups.find((g) => g.offer?.name);
    if (!vip?.offer?.name) {
      throw new Error("demo fixtures need a GA group with an offer");
    }
    const pkg = demoSeasonPackage({
      package_tickets: [{ ...vip, sectionId: DEMO_GA_SECTION_ID }],
    });

    const { sectionLookupTable } = createPackageLookupTables(pkg, null, null);

    expect(sectionLookupTable[DEMO_GA_SECTION_ID]?.[0]?.offer?.name).toBe(
      vip.offer.name,
    );
    expect(sectionLookupTable[DEMO_GA_SECTION_ID]?.[0]?.offer?.name).not.toBe(
      pkg.name,
    );
  });
});
