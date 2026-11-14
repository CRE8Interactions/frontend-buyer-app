import { describe, expect, it } from "vitest";
import { payoutTotals } from "@/lib/payoutFunds";

describe("payoutTotals", () => {
  it("sums available and on-hold payouts", () => {
    expect(
      payoutTotals({
        available: [{ payout: 12.5 }, { payout: 7.5 }],
        onHold: [{ payout: 20 }],
      }),
    ).toEqual({ available: 20, onHold: 20 });
  });

  it("treats a bare array as funds still on hold", () => {
    expect(payoutTotals([{ payout: 4 }, { payout: 6 }])).toEqual({
      available: 0,
      onHold: 10,
    });
  });
});
