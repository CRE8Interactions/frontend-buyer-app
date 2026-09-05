"use client";

import { fluidSize } from "@/lib/shopperFluidType";

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import MobileStickyFooter from "@/components/molecules/MobileStickyFooter";
import { BLOCKTICKETS_GREEN, BLOCKTICKETS_LOCKUP, BLOCKTICKETS_NAVY } from "@/lib/branding";

export type WalletChromeItem = {
  id: string;
  label: string;
  on?: boolean;
  href?: string;
  onClick?: () => void;
};

const CSS = `
.wchrome-bar{max-width:1100px;margin:0 auto;padding:18px 32px;min-height:68px;box-sizing:border-box;display:flex;align-items:center;gap:16px}
.wchrome-pills{display:flex;align-items:center;gap:2px;margin-left:auto}
.wchrome-trailing{display:flex;align-items:center;flex-shrink:0}
.wchrome-tabs{display:none}
.wchrome-item:focus-visible{outline:2px solid ${BLOCKTICKETS_GREEN};outline-offset:2px}
.wchrome-item:hover:not([aria-current="page"]){opacity:0.88}
.wchrome-item:disabled,.wchrome-item[aria-disabled="true"]{opacity:0.45;cursor:not-allowed}
@media (max-width:900px){
  .wchrome-bar{padding:14px 20px;min-height:60px}
  .wchrome-pills{display:none}
  .wchrome-trailing{margin-left:auto}
  .wchrome-tabs{display:flex}
}
@media (min-width:901px){
  .wchrome-tabs{display:none !important}
}
`;

function itemStyle(active: boolean, where: "desktop" | "mobile"): CSSProperties {
  if (where === "desktop") {
    return {
      fontFamily: "inherit",
      fontSize: fluidSize(14),
      fontWeight: 600,
      color: active ? BLOCKTICKETS_NAVY : "rgba(255,255,255,0.78)",
      background: active ? BLOCKTICKETS_GREEN : "transparent",
      border: "none",
      borderRadius: 999,
      padding: "9px 16px",
      cursor: "pointer",
      whiteSpace: "nowrap",
      textDecoration: "none",
    };
  }
  return {
    fontFamily: "inherit",
    flex: 1,
    minHeight: 48,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: fluidSize(13),
    fontWeight: 600,
    color: active ? BLOCKTICKETS_NAVY : "#8a93a3",
    background: active ? BLOCKTICKETS_GREEN : "transparent",
    border: "none",
    borderRadius: 999,
    cursor: "pointer",
    textDecoration: "none",
  };
}

function NavItem({
  item,
  where,
}: {
  item: WalletChromeItem;
  where: "desktop" | "mobile";
}) {
  const active = Boolean(item.on);
  const shared = {
    className: "wchrome-item",
    style: itemStyle(active, where),
    "aria-current": active ? ("page" as const) : undefined,
  };
  if (item.href) {
    return (
      <Link href={item.href} onClick={item.onClick} {...shared}>
        {item.label}
      </Link>
    );
  }
  return (
    <button type="button" onClick={item.onClick} {...shared}>
      {item.label}
    </button>
  );
}

/**
 * Browse-style Blocktickets header + green-pill wallet nav.
 * `compact` matches a known viewport: true = mobile tabs only, false = desktop
 * pills only. Omit it to render both and let CSS pick.
 */
export default function WalletChrome({
  items,
  showNav,
  showHeader = true,
  showTabBar,
  compact,
  trailing,
}: {
  items: WalletChromeItem[];
  showNav: boolean;
  showHeader?: boolean;
  showTabBar?: boolean;
  compact?: boolean;
  trailing?: ReactNode;
}) {
  const desktopPills = showNav && compact !== true;
  const mobileTabs = showNav && compact !== false && showTabBar !== false;

  return (
    <>
      <style>{CSS}</style>
      {showHeader ? (
        <header
          style={{
            background: BLOCKTICKETS_NAVY,
            position: "sticky",
            top: 0,
            zIndex: 20,
            boxShadow: "0 12px 30px -18px rgba(3,16,31,0.9)",
          }}
        >
          <div className="wchrome-bar">
            <Link
              href="/browse/"
              aria-label="Blocktickets home"
              style={{ flexShrink: 0, display: "flex", alignItems: "center" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={BLOCKTICKETS_LOCKUP}
                alt="Blocktickets"
                style={{ height: 22, display: "block" }}
              />
            </Link>
            {desktopPills ? (
              <nav className="wchrome-pills" aria-label="Wallet">
                {items.map((item) => (
                  <NavItem key={item.id} item={item} where="desktop" />
                ))}
              </nav>
            ) : null}
            {trailing ? (
              <div
                className="wchrome-trailing"
                style={desktopPills ? undefined : { marginLeft: "auto" }}
              >
                {trailing}
              </div>
            ) : null}
          </div>
        </header>
      ) : null}
      {mobileTabs ? (
        <MobileStickyFooter
          background="rgba(255,255,255,0.94)"
          borderTop="1px solid rgba(5,27,53,0.08)"
          boxShadow="none"
          innerPadding="0"
          shellStyle={{ backdropFilter: "blur(12px)" }}
        >
          <nav
            className="wchrome-tabs"
            aria-label="Wallet"
            style={{
              display: "flex",
              gap: 4,
              padding: "8px 10px 14px",
            }}
          >
            {items.map((item) => (
              <NavItem key={item.id} item={item} where="mobile" />
            ))}
          </nav>
        </MobileStickyFooter>
      ) : null}
    </>
  );
}
