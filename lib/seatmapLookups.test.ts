import { describe, expect, it } from "vitest";
import {
  createSeatLookupTables,
  createSectionInventoryTable,
  createSectionLookupTable,
} from "@/lib/seatmapLookups";
import {
  DEMO_GA_SECTION_ID,
  DEMO_SEATED_TICKET_GROUPS,
  demoSeatmapMapping,
  demoTicketGroups,
} from "@/lib/demo/fixtures";

const mapping = demoSeatmapMapping();
const seatLookupTable = createSeatLookupTables(DEMO_SEATED_TICKET_GROUPS)
  .lookupTable;
const gaSectionLookupTable = createSectionLookupTable(
  demoTicketGroups().ticketGroups,
);

describe("createSectionInventoryTable", () => {
  it("marks seated sections available when their rows hold sellable seats", () => {
    const table = createSectionInventoryTable(mapping, {}, seatLookupTable);

    expect(table["sec-m"]).toBe(true);
    expect(table["sec-a"]).toBe(true);
    expect(table["sec-n"]).toBe(true);
  });

  it("marks a seated section sold out when its group has no sellable seats", () => {
    const table = createSectionInventoryTable(mapping, {}, seatLookupTable);

    expect(table["sec-b"]).toBe(false);
  });

  it("marks GA sections from the section lookup table, not from seats", () => {
    expect(
      createSectionInventoryTable(mapping, gaSectionLookupTable, {})[
        DEMO_GA_SECTION_ID
      ],
    ).toBe(true);
    expect(
      createSectionInventoryTable(mapping, {}, seatLookupTable)[
        DEMO_GA_SECTION_ID
      ],
    ).toBe(false);
  });

  it("returns an empty table when there is no mapping geometry", () => {
    expect(createSectionInventoryTable(null, gaSectionLookupTable, seatLookupTable)).toEqual(
      {},
    );
  });
});

describe("createSeatLookupTables", () => {
  it("indexes every sellable seat id from the DEMO seated groups", () => {
    const seated = DEMO_SEATED_TICKET_GROUPS.filter((g) => g.GA === false);
    const expected = new Set(seated.flatMap((g) => g.seatIds || []));

    expect(Object.keys(seatLookupTable).sort()).toEqual(
      [...expected].sort(),
    );
  });

  it("narrows a seat to the selected offer and restores every offer when none are selected", () => {
    const parent = DEMO_SEATED_TICKET_GROUPS.find((g) => g.seatIds?.includes("a1"));
    expect(parent?.offer?.id).toBeTruthy();
    const unlocked = {
      ...parent!,
      id: "grp-unlocked",
      price: Number(parent!.price || 0) + 5,
      offer: {
        ...parent!.offer,
        id: "off-unlocked",
        name: "ROCKOUT",
        accessCode: "ROCK",
        unlocked: true,
      },
    };
    const groups = [parent!, unlocked];

    const allOffers = createSeatLookupTables(groups).offersLookupTable.a1;
    expect(allOffers?.map((group) => group.offer?.id)).toEqual(
      expect.arrayContaining([parent!.offer?.id, "off-unlocked"]),
    );

    const filtered = createSeatLookupTables(groups, ["off-unlocked"]);
    expect(filtered.offersLookupTable.a1?.map((group) => group.offer?.id)).toEqual([
      "off-unlocked",
    ]);
    expect(filtered.lookupTable.a1?.offer?.id).toBe("off-unlocked");
  });
});
