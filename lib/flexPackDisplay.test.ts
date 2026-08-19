import { describe, expect, it } from "vitest";
import { demoFlexPack } from "@/lib/demo/fixtures";
import {
  FLEX_PACK_VOUCHER_FEE_USD,
  flexPackCardTone,
  flexPackEachPrice,
  flexPackVoucherFee,
} from "@/lib/flexPackDisplay";

describe("flexPackDisplay", () => {
  it("maps Gold / Platinum / Club names to distinct header tones", () => {
    expect(flexPackCardTone("6 - Gold Flex Pack").bg).not.toBe(
      flexPackCardTone("6 - Platinum Flex Pack").bg,
    );
    expect(flexPackCardTone("6 - Club Flex Pack").bg).not.toBe(
      flexPackCardTone("6 - Gold Flex Pack").bg,
    );
  });

  it("uses an API color when present and falls back for unknown names", () => {
    expect(flexPackCardTone("Weekend pack", "#112233").bg).toBe("#112233");
    expect(flexPackCardTone("Weekend pack", undefined, "#8c0b42").bg).toBe(
      "#8c0b42",
    );
  });

  it("charges $1 per voucher and a per-voucher pack price", () => {
    const pack = demoFlexPack();
    expect(flexPackVoucherFee(pack.gameTickets)).toBe(
      pack.gameTickets * FLEX_PACK_VOUCHER_FEE_USD,
    );
    expect(flexPackEachPrice(pack.price, pack.gameTickets)).toBe(
      pack.price / pack.gameTickets,
    );
    expect(flexPackVoucherFee(0)).toBe(0);
    expect(flexPackEachPrice(pack.price, 0)).toBeNull();
  });
});
