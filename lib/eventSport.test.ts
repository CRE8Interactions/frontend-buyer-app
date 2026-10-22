import { describe, expect, it } from "vitest";
import { DEMO_EVENTS } from "@/lib/demo/fixtures";
import {
  BASKETBALL,
  MENS_BASKETBALL,
  WOMENS_BASKETBALL,
  eventSport,
  matchesSport,
  orderedSportLabels,
  packageSport,
  resolveSportSelection,
  storefrontSportLabel,
} from "@/lib/eventSport";

const hoop = DEMO_EVENTS.find((event) => event.shortCode === "NMST004")!;

function basketball(name: string, attractionNames?: string[]) {
  return {
    ...hoop,
    name,
    category: { name: "basketball" },
    sub_categories: [{ name: "basketball" }],
    ...(attractionNames
      ? {
          attractions: attractionNames.map((attractionName) => ({
            name: attractionName,
          })),
        }
      : {}),
  };
}

describe("eventSport", () => {
  it("splits basketball into men's and women's from the name or attraction", () => {
    expect(eventSport(basketball("NMSU MBB vs University of Denver"))).toBe(
      MENS_BASKETBALL,
    );
    expect(eventSport(basketball("NMSU WBB vs San Diego"))).toBe(WOMENS_BASKETBALL);
    expect(eventSport(basketball("NMSU vs San Diego", ["NMSU WBB"]))).toBe(
      WOMENS_BASKETBALL,
    );
    expect(
      eventSport(basketball("Women's basketball vs San Diego")),
    ).toBe(WOMENS_BASKETBALL);
    expect(eventSport(basketball("Womens basketball vs San Diego"))).toBe(
      WOMENS_BASKETBALL,
    );
  });

  it("trusts an MBB title when the attraction is tagged WBB", () => {
    expect(
      eventSport(basketball("NMSU MBB vs University of Denver", ["NMSU WBB"])),
    ).toBe(MENS_BASKETBALL);
  });

  it("leaves other sports on their subcategory", () => {
    expect(
      eventSport({
        ...hoop,
        name: "NMSU Football vs Liberty",
        category: { name: "sports" },
        sub_categories: [{ name: "football" }],
      }),
    ).toBe("Football");
    expect(
      eventSport({
        ...hoop,
        name: "Mens Football vs Liberty",
        category: { name: "sports" },
        sub_categories: [{ name: "football" }],
      }),
    ).toBe("Football");
    expect(
      eventSport({
        ...hoop,
        name: "Tournament of Bands",
        category: { name: "music" },
        attractions: [{ name: "Tournament of Bands" }],
      }),
    ).toBe("Music");
  });

  it("keeps a basketball game without a gender marker on basketball", () => {
    expect(eventSport(basketball("Exhibition vs Alumni"))).toBe(BASKETBALL);
  });

  it("groups mens and womens under basketball and filters each side", () => {
    const rows = [
      { sport: eventSport(basketball("NMSU WBB vs San Diego")) },
      { sport: eventSport(basketball("NMSU MBB vs FIU")) },
      { sport: "Football" },
    ];
    const labels = orderedSportLabels(rows);

    expect(labels).toEqual([
      BASKETBALL,
      MENS_BASKETBALL,
      WOMENS_BASKETBALL,
      "Football",
    ]);
    expect(rows.filter((row) => matchesSport(row.sport, BASKETBALL))).toHaveLength(2);
    expect(rows.filter((row) => matchesSport(row.sport, MENS_BASKETBALL))).toHaveLength(
      1,
    );
    expect(
      rows.filter((row) => matchesSport(row.sport, WOMENS_BASKETBALL)),
    ).toHaveLength(1);
    expect(resolveSportSelection(labels, "mbb")).toBe(MENS_BASKETBALL);
    expect(resolveSportSelection(labels, "womens-basketball")).toBe(WOMENS_BASKETBALL);
    expect(resolveSportSelection(labels, "basketball")).toBe(BASKETBALL);
    expect(resolveSportSelection(labels, "soccer")).toBeNull();
  });

  it("splits a basketball package from its name and leaves an uncategorized package blank", () => {
    expect(
      packageSport({
        name: "Men's basketball season",
        category: { name: "basketball" },
      }),
    ).toBe(MENS_BASKETBALL);
    expect(packageSport({ name: "All access", category: null })).toBeNull();
  });

  it("splits a basketball organization game from its name when the event has no category", () => {
    const org = { ...hoop.organization, category: { name: "Basketball" } };
    expect(
      storefrontSportLabel(
        {
          ...hoop,
          name: "NMSU WBB vs San Diego",
          organization: org,
          category: undefined,
        },
        [org],
      ),
    ).toBe(WOMENS_BASKETBALL);
  });

  it("keeps a non-basketball event on its type", () => {
    expect(
      storefrontSportLabel({
        ...hoop,
        name: "Mens Football vs Liberty",
        category: { name: "football" },
      }),
    ).toBe("Football");
  });
});
