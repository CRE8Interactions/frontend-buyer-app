import { describe, expect, it } from "vitest";
import {
  demoFlexPack,
  demoFlexPackTaxableOrganization,
} from "@/lib/demo/fixtures";
import {
  FLEX_PACK_VOUCHER_FEE_USD,
  flexPackCardTone,
  flexPackDisplayPrice,
  flexPackEachPrice,
  flexPackPriceCaption,
  flexPackVoucherFee,
  quoteFlexPackPurchase,
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

  it("includes the voucher fee in the all-in price when tax and card fees are known", () => {
    const pack = demoFlexPack({
      price: 79,
      gameTickets: 7,
      organization: demoFlexPackTaxableOrganization(),
    });
    const quote = quoteFlexPackPurchase(pack);

    expect(quote.pricedWithTaxesAndFees).toBe(true);
    expect(quote.voucherFee).toBe(7);
    expect(quote.subtotal).toBe(86);
    expect(quote.salesTax).toBe(6.02);
    expect(quote.processingFee).toBe(2.97);
    expect(quote.buyerTotal).toBe(94.99);
    expect(flexPackDisplayPrice(pack)).toBe(quote.buyerTotal);
    expect(flexPackPriceCaption(pack)).toBe("Taxes and fees included");
  });

  it("adds each custom fee once inside the all-in price", () => {
    const pack = demoFlexPack({
      price: 100,
      gameTickets: 5,
      customFees: [
        { id: 7, name: "Drink", option: "amount", feeAmount: 8 },
        { id: 8, name: "Parking", option: "amount", feeAmount: 5 },
      ],
      organization: {
        ...demoFlexPackTaxableOrganization(),
        taxRate: { estimatedCombinedRate: 5 / 105 },
      },
    });
    const quote = quoteFlexPackPurchase(pack);

    expect(quote.salesTax).toBe(5);
    expect(quote.customFeeAmount).toBe(13);
    expect(quote.total).toBe(118);
    expect(quote.processingFee).toBe(3.87);
    expect(quote.buyerTotal).toBe(126.87);
    expect(flexPackDisplayPrice(pack)).toBe(quote.buyerTotal);
  });

  it("keeps the pack price when the organization has no tax or card fees", () => {
    const pack = demoFlexPack();
    const quote = quoteFlexPackPurchase(pack);

    expect(quote.pricedWithTaxesAndFees).toBe(false);
    expect(quote.buyerTotal).toBe(pack.price + pack.gameTickets);
    expect(flexPackDisplayPrice(pack)).toBe(pack.price);
    expect(flexPackPriceCaption(pack)).toBe("Fees added at checkout");
  });
});
