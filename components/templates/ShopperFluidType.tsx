"use client";

import { SHOPPER_PAGE_CLASS, shopperShellVars } from "@/lib/branding";
import { shopperPageTypeCss } from "@/lib/shopperFluidType";

/** Injects scoped fluid type CSS vars for `.shopper-page` shells. */
export function ShopperFluidTypeStyles() {
  return <style>{shopperPageTypeCss()}</style>;
}

/** Wrapper for shopper routes that share the fluid type ramp. */
export default function ShopperFluidPage({
  accentColor,
  className = "",
  style,
  children,
  ...props
}: React.ComponentProps<"div"> & { accentColor?: string | null }) {
  return (
    <div
      className={`${SHOPPER_PAGE_CLASS}${className ? ` ${className}` : ""}`}
      style={{ ...shopperShellVars(accentColor), ...style }}
      {...props}
    >
      <ShopperFluidTypeStyles />
      {children}
    </div>
  );
}
