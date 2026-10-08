import { describe, expect, it } from "vitest";
import {
  countSectionAvailability,
  createSeatLookupTables,
  createSectionInventoryTable,
  createSectionLookupTable,
  isSectionCoverVenue,
  isSectionSoldOut,
  expandWcSeamPairSectionIds,
  neighborSectionIds,
  sectionIdInViewport,
  sectionOverlayPaint,
  seatsRevealAtScale,
  UNAVAILABLE_SECTION_FILL,
  UNAVAILABLE_SECTION_LABEL,
} from "@/lib/seatmapLookups";
import {
  DEMO_GA_SECTION_ID,
  DEMO_SEATED_TICKET_GROUPS,
  DEMO_SECTION_FILL,
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

describe("isSectionCoverVenue", () => {
  it("uses section covers at the Deep South ice complex", () => {
    expect(
      isSectionCoverVenue("deep-south-ice-and-sports-complex"),
    ).toBe(true);
    expect(isSectionCoverVenue("lindquist-field")).toBe(false);
  });
});

describe("seatsRevealAtScale", () => {
  it("opens seats at the legacy zoom level, not before", () => {
    expect(seatsRevealAtScale(2.6, 1)).toBe(true);
    expect(seatsRevealAtScale(2.4, 1)).toBe(false);
  });
});

describe("sectionIdInViewport", () => {
  it("picks the section under the viewport center when zooming in", () => {
    expect(
      sectionIdInViewport(
        { x: 20, y: 10, width: 40, height: 20 },
        {
          "sec-m": { x: 0, y: 0, width: 240, height: 40 },
          "sec-b": { x: 0, y: 180, width: 240, height: 40 },
        },
      ),
    ).toBe("sec-m");
  });
});

describe("neighborSectionIds", () => {
  const anchor = { x: 0, y: 0, width: 100, height: 40 };

  it("includes a section inside the margin and leaves a distant one covered", () => {
    expect(
      neighborSectionIds("sec-m", anchor, {
        "sec-m": anchor,
        "sec-a": { x: 110, y: 0, width: 100, height: 40 },
        "sec-b": { x: 500, y: 0, width: 100, height: 40 },
      }),
    ).toEqual(["sec-a"]);
  });
});

describe("expandWcSeamPairSectionIds", () => {
  it("opens a wheelchair companion with its letter section", () => {
    const sections = {
      q: { sectionId: "q", sectionNumber: "Q" },
      wcq: { sectionId: "wcq", sectionNumber: "WCQ" },
      other: { sectionId: "other", sectionNumber: "M" },
    };

    expect(expandWcSeamPairSectionIds(["q"], sections).sort()).toEqual([
      "q",
      "wcq",
    ]);
  });
});

describe("sectionOverlayPaint", () => {
  it("paints a sold-out section unavailable", () => {
    const section = mapping.sections?.["sec-b"];
    const stats = countSectionAvailability(section, mapping.rows, seatLookupTable);

    expect(isSectionSoldOut(stats)).toBe(true);
    expect(sectionOverlayPaint(section, stats)).toMatchObject({
      soldOut: true,
      kind: "solid",
      fill: UNAVAILABLE_SECTION_FILL,
      ratio: 0,
    });
  });

  it("sizes a partial cover to the seats still for sale", () => {
    const section = mapping.sections?.["sec-m"];
    const stats = countSectionAvailability(section, mapping.rows, {
      s1: seatLookupTable.s1,
    });

    expect(stats).toEqual({ total: 4, available: 1 });
    expect(sectionOverlayPaint(section, stats)).toMatchObject({
      soldOut: false,
      kind: "gradient",
      ratio: 0.25,
      fill: DEMO_SECTION_FILL,
      labelFill: UNAVAILABLE_SECTION_LABEL,
    });
  });

  it("keeps a full section on its available fill", () => {
    const section = mapping.sections?.["sec-m"];
    const stats = countSectionAvailability(section, mapping.rows, seatLookupTable);
    const paint = sectionOverlayPaint(section, stats);

    expect(isSectionSoldOut(stats)).toBe(false);
    expect(paint.kind).toBe("solid");
    expect(paint.fill).toBe(DEMO_SECTION_FILL);
    expect(paint.labelFill).toBe("#FFFFFF");
  });

  it("does not call a section sold out when it has no seat geometry", () => {
    const stats = countSectionAvailability({ rows: [] }, mapping.rows, {});

    expect(isSectionSoldOut(stats)).toBe(false);
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
