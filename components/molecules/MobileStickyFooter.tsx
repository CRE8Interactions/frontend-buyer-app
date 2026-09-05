"use client";

import { createPortal } from "react-dom";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { shopperShellVars } from "@/lib/branding";
import { ShopperFluidTypeStyles } from "@/components/templates/ShopperFluidType";

export type MobileStickyFooterProps = {
  children: ReactNode;
  /** Org accent for input focus rings inside the portaled footer. */
  accentColor?: string | null;
  "data-testid"?: string;
  zIndex?: number;
  background?: string;
  borderTop?: string;
  boxShadow?: string;
  innerPadding?: string;
  innerStyle?: CSSProperties;
  shellStyle?: CSSProperties;
  /** Extra classes on the fixed shell (e.g. responsive backdrop). */
  shellClassName?: string;
};

const DEFAULT_BORDER = "1px solid rgba(5,27,53,0.10)";
const DEFAULT_SHADOW = "0 -8px 24px -12px rgba(5,27,53,0.25)";

/** Fixed bottom bar portaled to `document.body` with overscroll bleed + fluid type tokens. */
export default function MobileStickyFooter({
  children,
  accentColor,
  "data-testid": testId,
  zIndex = 40,
  background = "#fff",
  borderTop = DEFAULT_BORDER,
  boxShadow = DEFAULT_SHADOW,
  innerPadding = "12px 16px",
  innerStyle,
  shellStyle,
  shellClassName = "",
}: MobileStickyFooterProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const shell: CSSProperties = {
    position: "fixed",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex,
    boxSizing: "border-box",
    background,
    borderTop,
    boxShadow,
    paddingBottom: "env(safe-area-inset-bottom, 0px)",
    ...shopperShellVars(accentColor),
    ...shellStyle,
  };

  const shellClass = ["mobile-sticky-footer-shell", "shopper-page", shellClassName]
    .filter(Boolean)
    .join(" ");

  return createPortal(
    <div className={shellClass} data-testid={testId} style={shell}>
      <ShopperFluidTypeStyles />
      <div style={{ padding: innerPadding, ...innerStyle }}>{children}</div>
    </div>,
    document.body,
  );
}
