import { describe, expect, it } from "vitest";
import {
  accessCodesFromTokens,
  hasListingQueryFilters,
  listingFiltersFromSearch,
  parseTicketingSearchParams,
  ticketingSearchHref,
} from "@/lib/ticketingQuery";

describe("ticketing query params", () => {
  it("hydrates quantity, sort, accessible, offers, and access_code", () => {
    const search = new URLSearchParams(
      "code=wait&quantity=4&sort=-price&accessible=true&offers=11,10&access_code=12:SECRET",
    );
    const parsed = parseTicketingSearchParams(search);
    expect(parsed).toEqual({
      quantity: 4,
      sort: "-price",
      accessible: true,
      offerIds: ["11", "10"],
      accessCodeTokens: ["12:SECRET"],
    });
    expect(accessCodesFromTokens(parsed.accessCodeTokens)).toEqual(["SECRET"]);
    expect(listingFiltersFromSearch(search)).toMatchObject({
      quantity: 4,
      accessible: true,
      sort: "-price",
      offerIds: ["11", "10"],
      accessCodes: ["SECRET"],
    });
  });

  it("writes the filters the shopper chose, without the waiting-room code", () => {
    const href = ticketingSearchHref(
      "/e/raptors/RAPT006/tickets/",
      {
        quantity: 4,
        defaultQuantity: 2,
        accessible: true,
        sort: "-price",
        offerIds: [11],
        accessCodes: ["SECRET"],
        accessCodeTokens: ["12:SECRET"],
      },
      ["12:SECRET"],
    );
    expect(href).not.toMatch(/(?:^|[?&])code=/);
    expect(href).toContain("quantity=4");
    expect(href).toContain("sort=-price");
    expect(href).toContain("accessible=true");
    expect(href).toContain("offers=11");
    expect(href).toContain("access_code=12%3ASECRET");
    expect(hasListingQueryFilters(new URLSearchParams())).toBe(false);
  });

  it("leaves the starting quantity and cheapest-first sort out of the URL", () => {
    const href = ticketingSearchHref(
      "/e/raptors/RAPT006/tickets/",
      {
        quantity: 2,
        defaultQuantity: 2,
        accessible: false,
        sort: "price",
        offerIds: [2255],
        accessCodes: ["ROCKOUT"],
        accessCodeTokens: ["2255:ROCKOUT"],
      },
      ["2255:ROCKOUT"],
    );
    expect(href).toBe(
      "/e/raptors/RAPT006/tickets/?offers=2255&access_code=2255%3AROCKOUT",
    );
  });
});
