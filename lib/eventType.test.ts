import { describe, expect, it } from "vitest";
import { DEMO_EVENTS, DEMO_ORGS } from "@/lib/demo/fixtures";
import {
  categoryLabel,
  eventTypeLabel,
  featuredEventPool,
  featuredTypeKey,
  pickFeaturedEvents,
} from "@/lib/eventType";

const hockey = DEMO_EVENTS.find((event) => event.shortCode === "ICEDOG1")!;
const baseball = DEMO_EVENTS.find((event) => event.shortCode === "RAPT006")!;

describe("categoryLabel", () => {
  it("capitalizes a lowercase category", () => {
    expect(categoryLabel("sports")).toBe("Sports");
    expect(categoryLabel("hockey")).toBe("Hockey");
  });

  it("leaves an empty or missing category blank", () => {
    expect(categoryLabel("")).toBe("");
    expect(categoryLabel("   ")).toBe("");
    expect(categoryLabel(undefined)).toBe("");
  });
});

describe("eventTypeLabel", () => {
  it("uses the organization category when present", () => {
    expect(eventTypeLabel(hockey)).toBe(hockey.organization.category?.name);
  });

  it("infers baseball from a raptors matchup when category is missing", () => {
    const { organization, ...rest } = baseball;
    expect(
      eventTypeLabel({
        ...rest,
        organization: { slug: organization.slug, name: organization.name },
      }),
    ).toBe("Baseball");
  });

  it("falls back to Event when the type cannot be inferred", () => {
    expect(eventTypeLabel({ name: "Community Night" })).toBe("Event");
  });
});

describe("pickFeaturedEvents", () => {
  it("picks one upcoming event per type", () => {
    const featured = pickFeaturedEvents(DEMO_EVENTS, DEMO_ORGS, 3);
    const types = featured.map((event) => eventTypeLabel(event, DEMO_ORGS));
    expect(featured).toHaveLength(3);
    expect(new Set(types).size).toBe(3);
    expect(featured[0]).toBe(DEMO_EVENTS[0]);
    expect(types).not.toEqual(
      DEMO_EVENTS.slice(0, 3).map((event) => eventTypeLabel(event, DEMO_ORGS)),
    );
  });

  it("keeps a single slide when every event is the same type", () => {
    const hockeyOnly = DEMO_EVENTS.filter(
      (event) => eventTypeLabel(event) === "Hockey",
    );
    const featured = pickFeaturedEvents(hockeyOnly, DEMO_ORGS, 3);
    expect(featured).toEqual([hockeyOnly[0]]);
  });

  it("does not pick basketball twice when category wording differs", () => {
    const game = DEMO_EVENTS.find((event) => event.shortCode === "NMST004")!;
    const first = {
      ...game,
      category: { name: "Basketball" },
      organization: { ...game.organization, category: { name: "Basketball" } },
    };
    const second = {
      ...game,
      id: Number(game.id) + 1,
      uuid: `${game.uuid}-w`,
      name: `${game.name} (women)`,
      category: { name: "Women's Basketball" },
      organization: {
        ...game.organization,
        category: { name: "Women's Basketball" },
      },
    };
    expect(pickFeaturedEvents([first, second], [], 3)).toEqual([first]);
    expect(featuredTypeKey(first)).toBe(featuredTypeKey(second));
  });

  it("fills three unique types from org upcoming when on-sale is all basketball", () => {
    const hoop = DEMO_EVENTS.find((event) => event.shortCode === "NMST004")!;
    const onSale = [0, 1, 2].map((index) => ({
      ...hoop,
      id: Number(hoop.id) + index,
      uuid: `${hoop.uuid}-${index}`,
      name: `${hoop.name} ${index}`,
      category: { name: index === 1 ? "Women's Basketball" : "Basketball" },
    }));
    const orgs = [
      {
        ...DEMO_ORGS.find((org) => org.slug === "niagara-icedogs")!,
        upcomingEvents: [hockey],
      },
      {
        ...DEMO_ORGS.find((org) => org.slug === "ogden-raptors")!,
        upcomingEvents: [baseball],
      },
    ];
    const featured = pickFeaturedEvents(featuredEventPool(onSale, orgs), orgs, 3);
    const types = featured.map((event) => eventTypeLabel(event, orgs));
    expect(featured).toHaveLength(3);
    expect(new Set(types).size).toBe(3);
    expect(types.filter((type) => type === "Basketball")).toHaveLength(1);
  });
});
