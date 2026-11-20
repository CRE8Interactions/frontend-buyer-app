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
  eventResaleMinimumPercent,
  askingPriceInput,
  LISTING_PRICE_FIELD_LABEL,
  listingAskingPriceError,
  listingFaceValue,
  listingPriceDraft,
  listingStatusDotLine,
  listingTab,
  listingsForTab,
  mapWalletListing,
  mergeListingsById,
  parseListingApiError,
  resaleSellerFeeAmount,
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
    const listings = demoWalletListings()
      .map(mapWalletListing)
      .filter((row): row is NonNullable<typeof row> => row !== null);
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
    expect(listingStatusDotLine(active)).toMatch(/^Active · /);
    expect(listingStatusDotLine(sold)).toMatch(/^Sold to buyer@example.com · /);
    expect(listingStatusDotLine(sold)).not.toMatch(/sold on /);
    expect(listingStatusDotLine(expired)).toMatch(/^Expired · /);
  });

  it("merges listings by id", () => {
    const first = mapWalletListing(demoActiveListing())!;
    const updated = { ...first, askingPrice: 99 };
    expect(mergeListingsById([first], [updated])).toEqual([updated]);
  });

  it("reads the legacy resale minimum percentage", () => {
    expect(
      eventResaleMinimumPercent({
        resaleEnableMinimum: true,
        resaleMinimumPercentage: 30,
      }),
    ).toBe(30);
    expect(
      eventResaleMinimumPercent({
        resaleEnableMinimum: false,
        resaleMinimumPercentage: 30,
      }),
    ).toBeNull();
    expect(eventResaleMinimumPercent({ resaleMinimumPercent: 10 })).toBe(10);
  });

  it("averages ticket cost for the sell face value", () => {
    expect(listingFaceValue([{ cost: 10 }, { cost: 30 }])).toBe(20);
    expect(listingFaceValue([{ price: 32.04 }])).toBe(32.04);
    expect(listingFaceValue([])).toBe(0);
  });

  it("keeps digits and one decimal in an asking price", () => {
    expect(askingPriceInput("42.50")).toBe("42.50");
    expect(askingPriceInput("12.3.4a$")).toBe("12.34");
    expect(askingPriceInput("abc")).toBe("");
  });

  it("shares the sell and edit price message and whether it can continue", () => {
    const rules = { face: 40, resaleMinimumPercent: 10 };
    expect(listingPriceDraft("", rules)).toMatchObject({
      asking: 0,
      message: LISTING_PRICE_FIELD_LABEL,
      invalid: false,
      canContinue: false,
    });
    expect(
      listingPriceDraft("0", { ...rules, fieldError: LISTING_PRICE_COPY.greaterThanZero }),
    ).toMatchObject({
      message: LISTING_PRICE_COPY.greaterThanZero,
      invalid: true,
      canContinue: false,
    });
    const belowMinimum = listingAskingPriceError("41", { ...rules, mode: "blur" });
    expect(listingPriceDraft("41", rules)).toMatchObject({
      message: belowMinimum,
      invalid: true,
      canContinue: false,
    });
    expect(
      listingPriceDraft("80", { ...rules, fieldError: "Could not update the price." }),
    ).toMatchObject({
      message: "Could not update the price.",
      invalid: true,
      canContinue: true,
    });
    expect(listingPriceDraft("80", rules)).toMatchObject({
      message: LISTING_PRICE_FIELD_LABEL,
      invalid: false,
      canContinue: true,
    });
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

  it("uses a resale fee rule instead of the flat seller rate", () => {
    const event = { secondaryServiceFeeSeller: 0.1 };
    expect(resaleSellerFeeAmount(80, [], event)).toBe(8);
    expect(
      resaleSellerFeeAmount(80, [{ sellerFeePercent: 25 }], event),
    ).toBe(20);
    expect(
      resaleSellerFeeAmount(42, [], {
        fee_structure: { secondaryServiceFeeSeller: 20 },
      }),
    ).toBe(8.4);
    expect(
      resaleSellerFeeAmount(
        42,
        [
          { category: "resale_organizer", method: "percentage", value: 10 },
          { category: "resale_platform", method: "percentage", value: 10 },
        ],
        { fee_structure: { secondaryServiceFeeSeller: 20 } },
      ),
    ).toBe(8.4);
  });
});
