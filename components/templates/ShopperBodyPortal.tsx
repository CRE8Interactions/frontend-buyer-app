"use client";

import { createPortal } from "react-dom";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { SHOPPER_PAGE_CLASS, shopperShellVars } from "@/lib/branding";
import { ShopperFluidTypeStyles } from "@/components/templates/ShopperFluidType";

export type ShopperBodyPortalProps = {
  children: ReactNode;
  /** Org accent; omit for Blocktickets lime focus on fields. */
  accentColor?: string | null;
  className?: string;
  style?: CSSProperties;
};

/** Portals shopper shells to `document.body` with fluid type + field focus tokens. */
export default function ShopperBodyPortal({
  children,
  accentColor,
  className = "",
  style,
}: ShopperBodyPortalProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const shellClass = [SHOPPER_PAGE_CLASS, className].filter(Boolean).join(" ");

  return createPortal(
    <div className={shellClass} style={{ ...shopperShellVars(accentColor), ...style }}>
      <ShopperFluidTypeStyles />
      {children}
    </div>,
    document.body,
  );
}
