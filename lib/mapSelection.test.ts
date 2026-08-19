import { describe, expect, it } from "vitest";
import {
  DEMO_SEATED_TICKET_GROUPS,
  demoTicketGroups,
} from "@/lib/demo/fixtures";
import {
  MIXED_MAP_SELECTION_ERROR,
  mixedMapSelectionError,
} from "@/lib/mapSelection";

const fieldClub = DEMO_SEATED_TICKET_GROUPS[0];
const sectionA = DEMO_SEATED_TICKET_GROUPS[1];
const gaGroups = demoTicketGroups().ticketGroups;
const ga = gaGroups.find((group) => group.GA && !group.offer)!;
const vip = gaGroups.find((group) => group.GA && group.offer)!;

describe("mixedMapSelectionError", () => {
  it("allows another seat in the same row", () => {
    expect(
      mixedMapSelectionError(
        [{ ...fieldClub, seatId: "s1" }],
        { ...fieldClub, seatId: "s2" },
      ),
    ).toBeNull();
  });

  it("blocks seats from a different row", () => {
    expect(
      mixedMapSelectionError(
        [{ ...fieldClub, seatId: "s1" }],
        { ...sectionA, seatId: "a1" },
      ),
    ).toEqual(MIXED_MAP_SELECTION_ERROR);
  });

  it("blocks mixing a seated row with a GA section", () => {
    expect(
      mixedMapSelectionError([{ ...fieldClub, seatId: "s1" }], ga),
    ).toEqual(MIXED_MAP_SELECTION_ERROR);
    expect(
      mixedMapSelectionError([{ ...ga, quantity: 2 }], vip),
    ).toEqual(MIXED_MAP_SELECTION_ERROR);
  });
});
