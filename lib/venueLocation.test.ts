import { describe, expect, it } from "vitest";
import { DEMO_ORGS } from "@/lib/demo/fixtures";
import {
  formatVenueCityState,
  formatVenueLocationFromVenue,
  formatVenueLocationLine,
  formatVenueStreetAddress,
  googleMapsDirectionsUrl,
} from "@/lib/venueLocation";

describe("venueLocation", () => {
  it("formats US venues as venue, city, STATE", () => {
    expect(
      formatVenueLocationLine("Lindquist Field", { city: "Ogden", state: "ut" }),
    ).toBe("Lindquist Field, Ogden, UT");
  });

  it("formats Canadian venues as venue, city, STATE", () => {
    expect(
      formatVenueLocationLine("Meridian Centre", {
        city: "St. Catharines",
        state: "ON",
      }),
    ).toBe("Meridian Centre, St. Catharines, ON");
  });

  it("formats city and state without a venue name", () => {
    expect(formatVenueCityState({ city: "las cruces", state: "nm" })).toBe(
      "Las Cruces, NM",
    );
  });

  it("formats street addresses with an uppercase state", () => {
    expect(
      formatVenueStreetAddress({
        address_1: "2330 Lincoln Ave",
        city: "Ogden",
        state: "ut",
        zipcode: "84401",
      }),
    ).toBe("2330 Lincoln Ave, Ogden, UT, 84401");
  });

  it("uppercases lowercase API state codes on venue records", () => {
    expect(
      formatVenueLocationFromVenue({
        name: "Lindquist Field",
        address: [{ city: "Ogden", state: "ut" }],
      }),
    ).toBe("Lindquist Field, Ogden, UT");
  });

  it("reads Strapi address attributes and uppercases state", () => {
    expect(
      formatVenueLocationFromVenue({
        name: "Lindquist Field",
        address: {
          data: [{ attributes: { city: "Ogden", state: "ut" } }],
        },
      }),
    ).toBe("Lindquist Field, Ogden, UT");
  });

  it("falls back to venue city and state when address is missing", () => {
    expect(
      formatVenueLocationFromVenue({
        name: "Lindquist Field",
        city: "Ogden",
        state: "ut",
      }),
    ).toBe("Lindquist Field, Ogden, UT");
  });

  it("builds a Google Maps query from street, city, and state", () => {
    const nmState = DEMO_ORGS.find((org) => org.slug === "nm-state")!;
    expect(googleMapsDirectionsUrl(nmState.homeVenue.address)).toBe(
      "https://google.com/maps?q=1810 E University Ave+las cruces+nm",
    );
  });

  it("returns no maps url when the venue has no address", () => {
    expect(googleMapsDirectionsUrl(undefined)).toBe("");
    expect(googleMapsDirectionsUrl({})).toBe("");
  });
});
