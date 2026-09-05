"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ShopperFluidTypeStyles } from "@/components/templates/ShopperFluidType";
import { BLOCKTICKETS_GREEN, BLOCKTICKETS_NAVY, SHOPPER_PAGE_CLASS } from "@/lib/branding";
import { useAuth } from "@/lib/auth";
import { fluidSize } from "@/lib/shopperFluidType";

const INK = BLOCKTICKETS_NAVY;
const SUB = "#6e7180";
const MUTE = "#8a93a3";
const SOFT = "#ecf8dd";

/**
 * Standalone /sign-out confirmation. Ends the session, then offers Browse
 * (and a way back in) so the shopper does not land on a login form.
 */
export default function SignOut() {
  const { logout, ready } = useAuth();
  const ended = useRef(false);

  useEffect(() => {
    if (!ready || ended.current) return;
    ended.current = true;
    logout();
  }, [ready, logout]);

  return (
    <div
      className={SHOPPER_PAGE_CLASS}
      style={{
        width: "100%",
        minHeight: "100vh",
        color: INK,
        background: "#eef1f8",
        backgroundImage:
          "radial-gradient(120% 80% at 50% -10%, #ffffff 0%, #f5f7fc 42%, #e9edf6 100%)",
        fontFamily: "'Geist', system-ui, -apple-system, sans-serif",
        WebkitFontSmoothing: "antialiased",
        display: "flex",
        justifyContent: "center",
        padding: "64px 32px 80px",
        boxSizing: "border-box",
      }}
    >
      <ShopperFluidTypeStyles />
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          display: "flex",
          flexDirection: "column",
          gap: 22,
          textAlign: "center",
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: 76,
            height: 76,
            borderRadius: 999,
            background: SOFT,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke={INK}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ width: 32, height: 32 }}
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div
            style={{
              fontSize: fluidSize(10),
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: MUTE,
            }}
          >
            Blocktickets wallet
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: fluidSize(42),
              fontWeight: 600,
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
            }}
          >
            You&rsquo;re signed out
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: fluidSize(15),
              lineHeight: 1.6,
              color: SUB,
            }}
          >
            Your tickets stay safe in your wallet. Sign in again any time to get
            back to them.
          </p>
        </div>
        <div
          style={{
            background: "#fff",
            border: "1px solid rgba(5,27,53,0.10)",
            borderRadius: 24,
            boxShadow:
              "0 1px 2px rgba(5,27,53,0.05), 0 20px 46px -22px rgba(5,27,53,0.45)",
            padding: 22,
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            boxSizing: "border-box",
          }}
        >
          <Link
            href="/browse/"
            style={{
              fontFamily: "inherit",
              width: "100%",
              boxSizing: "border-box",
              fontSize: fluidSize(15),
              fontWeight: 600,
              color: INK,
              background: BLOCKTICKETS_GREEN,
              border: "none",
              borderRadius: 999,
              padding: 16,
              cursor: "pointer",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            Back to Browse
          </Link>
          <Link
            href="/login/"
            style={{
              fontFamily: "inherit",
              width: "100%",
              boxSizing: "border-box",
              fontSize: fluidSize(15),
              fontWeight: 600,
              color: INK,
              background: "#fff",
              border: "1px solid rgba(5,27,53,0.14)",
              borderRadius: 999,
              padding: 16,
              cursor: "pointer",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            Sign back in
          </Link>
        </div>
      </div>
    </div>
  );
}
