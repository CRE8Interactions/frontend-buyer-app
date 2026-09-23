"use client";

import { shopperPageTypeCss } from "@/lib/shopperFluidType";

/** Injects scoped browse type CSS vars for `.shopper-page` shells. */
export function ShopperFluidTypeStyles() {
  return <style>{shopperPageTypeCss()}</style>;
}
