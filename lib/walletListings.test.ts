import { describe, expect, it } from "vitest";
import { FIELD_COPY } from "@/lib/fieldValidation";
import {
  demoActiveListing,
  demoActiveListingLater,
  demoExpiredListing,
  demoSoldListing,
  demoWalletListings,
} from "@/lib/demo/fixtures";
import {
  LISTING_DISPLAY_COPY,
  LISTING_PRICE_COPY,
  buildCreateListingPayload,
  listingAskingPriceError,
  listingStatusDotLine,
  listingTab,
  listingsForTab,
  mapWalletListing,
  mergeListingsById,
  parseListingApiError,
  sortListingsByEventStart,
  unwrapListingRecords,
} from "@/lib/walletListings";

describe("walletListings", () => {
  it("unwraps listing arrays and nested data payloads", () => {
    const row = demoActiveListing();
    expect(unwrapListingRecords([row])).toEqual([row]);
    expect(unwrapListingRecords({ data: [row] })).toEqual([row]);
  });

  it("buckets by status only and keeps sold listings with past events on Sold", () => {
    const listings = demoWalletListings().map(mapWalletListing).filter(Boolean);
    expect(listingsForTab(listings, "active").every((row) => listingTab(row.status) === "active")).toBe(true);
    expect(listingsForTab(listings, "sold").map((row) => row.id)).toEqual([
      mapWalletListing(demoSoldListing())!.id,
    ]);
    expect(listingsForTab(listings, "expired").map((row) => row.id)).toEqual([
      mapWalletListing(demoExpiredListing())!.id,
    ]);
    const sold = mapWalletListing(demoSoldListing())!;
    expect(listingTab(sold.status)).toBe("sold");
    expect(new Date(sold.event!.start!).getTime()).toBeLessThan(Date.now());
  });

  it("sorts each tab by event start, missing start last", () => {
    const soon = mapWalletListing(demoActiveListing())!;
    const later = mapWalletListing(demoActiveListingLater())!;
    const missing = { ...soon, id: "no-start", event: { ...soon.event, start: undefined } };
    expect(sortListingsByEventStart([later, missing, soon]).map((row) => row.id)).toEqual([
      soon.id,
      later.id,
      "no-start",
    ]);
  });

  it("builds status-dot copy from listing dates", () => {
    const active = mapWalletListing(demoActiveListing())!;
    const sold = mapWalletListing(demoSoldListing())!;
    const expired = mapWalletListing(demoExpiredListing())!;
    expect(listingStatusDotLine(active)).toMatch(/^active on /);
    expect(listingStatusDotLine(sold)).toMatch(/^sold to buyer@example.com · sold on /);
    expect(listingStatusDotLine(expired)).toMatch(/^expired on /);
  });

  it("merges listings by id", () => {
    const first = mapWalletListing(demoActiveListing())!;
    const updated = { ...first, askingPrice: 99 };
    expect(mergeListingsById([first], [updated])).toEqual([updated]);
  });

  it("validates asking price on blur vs submit", () => {
    expect(
      listingAskingPriceError("", { face: 40, resaleMinimumPercent: 10, mode: "blur" }),
    ).toBeNull();
    expect(
      listingAskingPriceError("", { face: 40, resaleMinimumPercent: 10, mode: "submit" }),
    ).toBe(LISTING_PRICE_COPY.greaterThanZero);
    expect(
      listingAskingPriceError("0", { face: 40, resaleMinimumPercent: null, mode: "blur" }),
    ).toBe(LISTING_PRICE_COPY.greaterThanZero);
    expect(
      listingAskingPriceError("41", { face: 40, resaleMinimumPercent: 10, mode: "submit" }),
    ).toMatch(/at least/);
  });

  it("builds the legacy create listing payload", () => {
    const tickets = [{ id: 1, generalAdmission: true }];
    expect(
      buildCreateListingPayload({
        tickets,
        askingPrice: 55,
        event: { id: 9 },
        fromOrder: 1474,
      }),
    ).toEqual({
      tickets,
      quantity: 1,
      askingPrice: 55,
      event: { id: 9 },
      fromOrder: 1474,
      type: "GA",
    });
  });

  it("maps 4xx listing errors and other failures to network copy", () => {
    expect(parseListingApiError({ response: { status: 400 } }, "create")).toBe(
      LISTING_DISPLAY_COPY.createFailed,
    );
    expect(parseListingApiError({ response: { status: 500 } }, "create")).toBe(
      FIELD_COPY.network,
    );
  });
});
