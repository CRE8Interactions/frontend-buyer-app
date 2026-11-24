import { describe, expect, it } from "vitest";
import { DEMO_ADDON_PARKING } from "@/lib/demo/fixtures";
import {
  getAddonPickupDetails,
  hasAddonPickupDetails,
} from "@/lib/addonPickup";

describe("addon pickup details", () => {
  it("reads pickup location and instructions for a pickup add-on", () => {
    expect(hasAddonPickupDetails(DEMO_ADDON_PARKING)).toBe(true);
    expect(getAddonPickupDetails(DEMO_ADDON_PARKING)).toEqual({
      location: DEMO_ADDON_PARKING.pickupLocation,
      instructions: DEMO_ADDON_PARKING.pickupInstructions,
    });
  });

  it("ignores pickup copy when the add-on is not a pickup", () => {
    expect(
      hasAddonPickupDetails({
        ...DEMO_ADDON_PARKING,
        fulfillmentType: "DIGITAL",
      }),
    ).toBe(false);
  });
});
