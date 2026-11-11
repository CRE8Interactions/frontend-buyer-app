import { describe, expect, it } from "vitest";
import { DEMO_SEATED_TICKET_GROUPS } from "@/lib/demo/fixtures";
import { groupsToListings } from "@/lib/ticketListings";
import { createSeatLookupTables } from "@/lib/seatmapLookups";
import { isSectionHidden, omitHiddenSectionGroups } from "@/lib/hiddenSections";

describe("isSectionHidden", () => {
  const sections = {
    "sec-1": { sectionId: "sec-1", hidden: true },
    "12": { sectionId: 12, hidden: true },
    "sec-2": { sectionId: "sec-2" },
  };

  it("matches string and numeric section ids", () => {
    expect(isSectionHidden(sections, "sec-1")).toBe(true);
    expect(isSectionHidden(sections, "12")).toBe(true);
    expect(isSectionHidden(sections, "sec-2")).toBe(false);
    expect(isSectionHidden(sections, "missing")).toBe(false);
  });

  it("finds a hidden section stored under a different key", () => {
    expect(
      isSectionHidden({ other: { sectionId: "sec-9", hidden: true } }, "sec-9"),
    ).toBe(true);
  });
});

describe("omitHiddenSectionGroups", () => {
  const seated = DEMO_SEATED_TICKET_GROUPS[0];

  it("leaves seats in a hidden section out of the seat lookup", () => {
    const hidden = { ...seated, id: "hidden-row", sectionId: "sec-1" };
    const open = { ...seated, id: "open-row", sectionId: "sec-2" };
    const sections = { "sec-1": { sectionId: "sec-1", hidden: true } };
    const lookup = createSeatLookupTables(
      omitHiddenSectionGroups([hidden, open], sections),
    );

    const seatId = String(seated.seatIds?.[0]);
    expect(lookup.lookupTable[seatId]?.id).toBe("open-row");
    expect(
      Object.values(lookup.lookupTable).some((group) => group.id === "hidden-row"),
    ).toBe(false);
  });

  it("does not turn a hidden section's tickets into a listing", () => {
    const hidden = { ...seated, id: "hidden-row", sectionId: "sec-1" };
    const open = { ...seated, id: "open-row", sectionId: "sec-2" };
    const sections = { "sec-1": { sectionId: "sec-1", hidden: true } };
    const listings = groupsToListings(
      omitHiddenSectionGroups([hidden, open], sections),
    );

    expect(listings.some((row) => row.sectionId === "sec-1")).toBe(false);
    expect(listings.some((row) => row.sectionId === "sec-2")).toBe(true);
  });
});
