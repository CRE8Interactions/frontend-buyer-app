import { describe, expect, it } from "vitest";
import {
  addonAuthRetryClearsSession,
  isAddonOnlyCheckout,
  nextAddonQuantityUp,
  normalizeAddonCatalogPayload,
  shouldRetryAddonRequestWithoutAuth,
} from "@/lib/addonCatalog";
import {
  demoAddonOnlyCart,
  demoCheckoutCart,
  demoEventAddonProducts,
} from "@/lib/demo/fixtures";

describe("addon catalog helpers", () => {
  it("jumps from zero to the minimum quantity", () => {
    expect(nextAddonQuantityUp(0, 2)).toBe(2);
    expect(nextAddonQuantityUp(2, 2)).toBe(3);
  });

  it("treats a cart with only a priced add-on quote as add-on checkout", () => {
    expect(isAddonOnlyCheckout(demoAddonOnlyCart())).toBe(true);
    expect(isAddonOnlyCheckout(demoCheckoutCart())).toBe(false);
  });

  it("unwraps a cached catalog envelope and retries public add-on calls without auth", () => {
    expect(normalizeAddonCatalogPayload({ data: demoEventAddonProducts() })).toEqual(
      demoEventAddonProducts(),
    );
    expect(
      shouldRetryAddonRequestWithoutAuth({
        url: "/events/evt-1/addon-products",
        method: "get",
      }),
    ).toBe(true);
    expect(
      addonAuthRetryClearsSession({
        url: "/events/evt-1/addon-products",
        method: "get",
      }),
    ).toBe(true);
    expect(
      addonAuthRetryClearsSession({
        url: "/carts/15/addon-items",
        method: "post",
      }),
    ).toBe(false);
    expect(
      shouldRetryAddonRequestWithoutAuth({
        url: "/orders/abc/available-addons",
        method: "get",
      }),
    ).toBe(false);
  });
});
