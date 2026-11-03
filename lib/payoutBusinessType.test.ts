import { describe, expect, it } from "vitest";
import {
  isPayoutBusinessType,
  payoutAccountPayload,
} from "@/lib/payoutBusinessType";

describe("payout business type", () => {
  it("accepts the four Stripe account types", () => {
    expect(isPayoutBusinessType("company")).toBe(true);
    expect(isPayoutBusinessType("non_profit")).toBe(true);
    expect(isPayoutBusinessType("government_entity")).toBe(true);
    expect(isPayoutBusinessType("individual")).toBe(true);
  });

  it("rejects a missing or unknown account type", () => {
    expect(isPayoutBusinessType(undefined)).toBe(false);
    expect(isPayoutBusinessType("sole_prop")).toBe(false);
  });

  it("includes the loaded type only when it is a known Stripe type", () => {
    expect(payoutAccountPayload("individual", "company")).toEqual({
      businessType: "individual",
      currentBusinessType: "company",
    });
    expect(payoutAccountPayload("company", "sole_prop")).toEqual({
      businessType: "company",
    });
  });
});
