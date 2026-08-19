import { describe, expect, it } from "vitest";
import {
  DEMO_EVENT_PRICING_LEVELS,
  DEMO_EVENTS,
  demoSeasonPackage,
  demoTicketGroups,
} from "@/lib/demo/fixtures";
import { formatCurrency } from "@/lib/helpers";
import {
  eventDetailRefs,
  eventFromPrice,
  eventFromPriceLabel,
  eventsNeedPriceEnrichment,
  firstPricingLevel,
  formatPackageFromPrice,
  lowestPricingLevel,
  mergeEventDetails,
  monthEventCountLabel,
  packageFromPrice,
  packageFromPriceLabel,
  venueUpcomingEventCount,
} from "@/lib/eventFromPrice";

const priced = DEMO_EVENTS[0];
const familyZone = demoTicketGroups().ticketGroups.find(
  (group) => group.sectionNumber === "FAM",
)!;

describe("eventFromPrice", () => {
  it("uses the first pricing level, not tickets or a cheaper later level", () => {
    expect(firstPricingLevel(priced)?.price).toBe(
      DEMO_EVENT_PRICING_LEVELS[1].price,
    );
    expect(lowestPricingLevel(priced)?.price).toBe(
      DEMO_EVENT_PRICING_LEVELS[2].price,
    );
    expect(eventFromPrice(priced)).toBe(DEMO_EVENT_PRICING_LEVELS[1].price);
    expect(eventFromPriceLabel(priced)).toBe(
      formatCurrency(DEMO_EVENT_PRICING_LEVELS[1].price),
    );
    expect(eventFromPrice(priced)).not.toBe(familyZone.price);
    expect(eventFromPrice(priced)).not.toBe(DEMO_EVENT_PRICING_LEVELS[2].price);
  });

  it("uses the first listed level when pricing levels are an array", () => {
    expect(
      eventFromPrice({
        pricingLevels: [
          DEMO_EVENT_PRICING_LEVELS[1],
          DEMO_EVENT_PRICING_LEVELS[2],
        ],
      }),
    ).toBe(DEMO_EVENT_PRICING_LEVELS[1].price);
  });

  it("returns no from-price when the event has no pricing level", () => {
    const {
      pricingLevels: _levels,
      ticketGroups: _groups,
      lowestPrice: _low,
      minPrice: _min,
      ...bare
    } = priced as typeof priced & {
      ticketGroups?: unknown;
      lowestPrice?: number;
      minPrice?: number;
    };
    expect(eventFromPrice(bare)).toBeNull();
    expect(eventFromPriceLabel(bare)).toBeNull();
  });
});

describe("packageFromPrice", () => {
  const pkg = demoSeasonPackage();
  const cheapestTicket = Math.min(
    ...pkg.package_tickets.map((row) => Number(row.price)),
  );

  it("uses the first pricing tier, not package ticket inventory", () => {
    expect(packageFromPrice(pkg)).toBe(pkg.pricingTiers[0].price);
    expect(packageFromPriceLabel(pkg)).toBe(
      formatCurrency(pkg.pricingTiers[0].price),
    );
    expect(cheapestTicket).toBeLessThan(pkg.pricingTiers[0].price);
    expect(packageFromPrice(pkg)).not.toBe(cheapestTicket);
  });

  it("uses the first listed tier even when a later one is cheaper", () => {
    expect(
      packageFromPrice(
        demoSeasonPackage({
          pricingTiers: [
            { price: 275, name: "Level B" },
            { price: 200, name: "Level A" },
          ],
        }),
      ),
    ).toBe(275);
  });

  it("falls back to package.price when there are no pricing tiers", () => {
    expect(
      packageFromPrice(demoSeasonPackage({ pricingTiers: [], price: 180 })),
    ).toBe(180);
  });

  it("returns no from-price when the package has no pricing tiers or price", () => {
    expect(
      packageFromPrice(demoSeasonPackage({ pricingTiers: [], price: undefined })),
    ).toBeNull();
    expect(
      packageFromPriceLabel(
        demoSeasonPackage({ pricingTiers: [], price: undefined }),
      ),
    ).toBeNull();
  });

  it("formats whole-dollar package from-prices without cents", () => {
    expect(formatPackageFromPrice(pkg.pricingTiers[0].price)).toBe(
      `From $${Number(pkg.pricingTiers[0].price).toLocaleString("en-US")}`,
    );
    expect(formatPackageFromPrice(pkg.pricingTiers[0].price)).not.toContain(".00");
    expect(formatPackageFromPrice(199.5)).toBe(formatCurrency(199.5).replace(/^/, "From "));
  });
});

describe("eventsNeedPriceEnrichment", () => {
  it("is true when a stub has an id or shortcode but no sellable ticket price", () => {
    const {
      pricingLevels: _levels,
      ticketGroups: _groups,
      ...bare
    } = priced as typeof priced & { ticketGroups?: unknown };
    expect(eventsNeedPriceEnrichment([bare])).toBe(true);
    expect(
      eventsNeedPriceEnrichment([
        { name: priced.name, shortCode: priced.shortCode },
      ]),
    ).toBe(true);
  });

  it("is false when every event already has a price or cannot be fetched", () => {
    expect(eventsNeedPriceEnrichment([priced])).toBe(false);
    expect(eventsNeedPriceEnrichment([{ name: "Walk-up only" }])).toBe(false);
    expect(eventsNeedPriceEnrichment([])).toBe(false);
  });
});

describe("eventDetailRefs", () => {
  it("falls back to shortcode when id and uuid are missing", () => {
    expect(
      eventDetailRefs([{ shortCode: priced.shortCode }]),
    ).toEqual([priced.shortCode]);
  });
});

describe("mergeEventDetails", () => {
  it("copies pricing levels onto a shortcode-only stub", () => {
    const [merged] = mergeEventDetails(
      [{ name: priced.name, shortCode: priced.shortCode }],
      [priced],
    );
    expect(eventFromPrice(merged)).toBe(eventFromPrice(priced));
  });

  it("leaves a stub unchanged when no detail row matches", () => {
    const stub = { name: priced.name, shortCode: "NOPE" };
    expect(mergeEventDetails([stub], [priced])).toEqual([stub]);
  });
});

describe("monthEventCountLabel", () => {
  it("labels a single event and a month total", () => {
    expect(monthEventCountLabel(1)).toBe("1 event");
    expect(monthEventCountLabel(DEMO_EVENTS.length)).toBe(
      `${DEMO_EVENTS.length} events`,
    );
  });
});

describe("venueUpcomingEventCount", () => {
  it("uses the venue total instead of the 3-event preview", () => {
    expect(
      venueUpcomingEventCount({
        upcomingEventsCount: 12,
        allEvents: DEMO_EVENTS.slice(0, 3),
      }),
    ).toBe(12);
    expect(
      venueUpcomingEventCount({
        upcomingEventsCount: "12",
        allEvents: DEMO_EVENTS.slice(0, 3),
      }),
    ).toBe(12);
  });

  it("returns no events when the venue has no total", () => {
    expect(
      venueUpcomingEventCount({
        allEvents: DEMO_EVENTS.slice(0, 3),
      }),
    ).toBe(0);
    expect(venueUpcomingEventCount(null)).toBe(0);
  });
});
