import { describe, expect, it } from "vitest";
import { demoVenueBySlug, demoVenueUpcomingEvents } from "@/lib/demo/fixtures";
import {
  firstVenueWebsiteHref,
  venueWebsiteFromUpcomingEvents,
  venueWebsiteHref,
} from "@/lib/venueWebsite";

const aggie = demoVenueBySlug("aggie-memorial-stadium")!;

describe("venueWebsiteHref", () => {
  it("reads the venue website from either field name", () => {
    expect(venueWebsiteHref(aggie)).toBe(aggie.website);
    expect(venueWebsiteHref({ url: aggie.website })).toBe(aggie.website);
  });

  it("treats a missing or blank website as no link", () => {
    expect(venueWebsiteHref({ website: "   " })).toBeNull();
    expect(venueWebsiteHref(null)).toBeNull();
  });
});

describe("firstVenueWebsiteHref", () => {
  it("takes the first venue that has a website", () => {
    expect(
      firstVenueWebsiteHref([null, { website: "" }, aggie]),
    ).toBe(aggie.website);
  });

  it("returns null when no venue has one", () => {
    expect(
      firstVenueWebsiteHref([{ name: "Lindquist Field" } as never, null]),
    ).toBeNull();
  });
});

describe("venueWebsiteFromUpcomingEvents", () => {
  it("finds the website on the venue record wrapping the events", () => {
    const payload = demoVenueUpcomingEvents("aggie-memorial-stadium");
    expect(venueWebsiteFromUpcomingEvents(payload)).toBe(aggie.website);
    expect(venueWebsiteFromUpcomingEvents({ data: payload })).toBe(
      aggie.website,
    );
  });

  it("returns null when the payload has no website", () => {
    expect(
      venueWebsiteFromUpcomingEvents(
        demoVenueUpcomingEvents("lindquist-field"),
      ),
    ).toBeNull();
    expect(venueWebsiteFromUpcomingEvents(null)).toBeNull();
  });
});
