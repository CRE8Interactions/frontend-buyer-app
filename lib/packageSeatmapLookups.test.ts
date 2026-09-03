import { describe, expect, it } from "vitest";
import {
  DEMO_GA_SECTION_ID,
  DEMO_SEATED_TICKET_GROUPS,
  demoSeasonPackage,
  demoTicketGroups,
} from "@/lib/demo/fixtures";
import { createPackageLookupTables } from "@/lib/packageSeatmapLookups";

const listing = DEMO_SEATED_TICKET_GROUPS.find((g) => g.seatIds?.includes("s1"));
const seatId = listing?.seatIds?.[0];
const offerName = listing?.offer?.name;
if (!listing || !seatId || !offerName) {
  throw new Error("demo fixtures need a seated group with an offer on seat s1");
}

describe("createPackageLookupTables", () => {
  it("keeps the ticket offer name on seated package seats", () => {
    const pkg = demoSeasonPackage({
      package_tickets: [
        {
          ...listing,
          seatId,
        },
      ],
    });

    const { seatLookupTable } = createPackageLookupTables(pkg, null, null);

    expect(seatLookupTable[seatId]?.offer?.name).toBe(offerName);
  });

  it("does not invent an offer from the package name", () => {
    const { offer: _offer, ...withoutOffer } = listing;
    const pkg = demoSeasonPackage({
      package_tickets: [
        {
          ...withoutOffer,
          seatId,
        },
      ],
    });

    const { seatLookupTable } = createPackageLookupTables(pkg, null, null);
    const lookedUp = seatLookupTable[seatId];

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

  it("copies package min, max, and incrementsOf onto reserved and GA seats", () => {
    const ga = demoTicketGroups().ticketGroups.find((g) => g.GA);
    if (!ga) throw new Error("demo fixtures need a GA ticket group");
    const pkg = demoSeasonPackage({
      minQuantity: 2,
      maxQuantity: 6,
      incrementsOf: 2,
      package_tickets: [
        { ...listing, seatId },
        { ...ga, sectionId: DEMO_GA_SECTION_ID },
      ],
    });

    const { seatLookupTable, sectionLookupTable } = createPackageLookupTables(
      pkg,
      null,
      null,
    );

    expect(seatLookupTable[seatId]?.package).toMatchObject({
      minQuantity: 2,
      maxQuantity: 6,
      incrementsOf: 2,
      multipleOf: 2,
    });
    expect(sectionLookupTable[DEMO_GA_SECTION_ID]?.[0]?.package).toMatchObject({
      minQuantity: 2,
      maxQuantity: 6,
      incrementsOf: 2,
      multipleOf: 2,
    });
  });

  it("copies a package limit onto reserved and GA seats", () => {
    const ga = demoTicketGroups().ticketGroups.find((g) => g.GA);
    if (!ga) throw new Error("demo fixtures need a GA ticket group");
    const pkg = demoSeasonPackage({
      limit: 4,
      package_tickets: [
        { ...listing, seatId },
        { ...ga, sectionId: DEMO_GA_SECTION_ID },
      ],
    });

    const { seatLookupTable, sectionLookupTable } = createPackageLookupTables(
      pkg,
      null,
      null,
    );

    expect(seatLookupTable[seatId]?.package).toMatchObject({ limit: 4 });
    expect(sectionLookupTable[DEMO_GA_SECTION_ID]?.[0]?.package).toMatchObject({
      limit: 4,
    });
  });
});
