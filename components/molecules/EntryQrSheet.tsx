"use client";

import { useId, type ReactNode } from "react";
import { QRCodeSVG } from "qrcode.react";
import { browseLeading } from "@/lib/browseType";
import { BLOCKTICKETS_NAVY } from "@/lib/branding";
import { fluidSize } from "@/lib/shopperFluidType";

const INK = BLOCKTICKETS_NAVY;
const SUB = "#6e7180";
const FAINT = "#4a5567";
const LINE = "rgba(5,27,53,0.10)";

/** Centered QR dialog used by ticket and access-pass entry sheets. */
export default function EntryQrSheet({
  title,
  value,
  qrAriaLabel,
  hint,
  onClose,
  mobile = false,
  children,
}: {
  title: string;
  value: string;
  qrAriaLabel: string;
  hint: string;
  onClose: () => void;
  mobile?: boolean;
  children?: ReactNode;
}) {
  const titleId = useId();

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        background: "rgba(5,27,53,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 18,
        boxSizing: "border-box",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
        className="st-entry-qr-sheet"
        style={{
          width: "100%",
          maxWidth: 500,
          background: "#fff",
          borderRadius: 26,
          padding: 0,
          paddingBottom: 0,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap: 0,
          overflow: "hidden",
          boxShadow: "0 30px 70px -30px rgba(5,27,53,0.6)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "18px 22px",
            borderBottom: `1px solid ${LINE}`,
          }}
        >
          <h2
            id={titleId}
            style={{
              margin: 0,
              minWidth: 0,
              flex: 1,
              fontSize: 21,
              fontWeight: 600,
              color: INK,
              letterSpacing: "-0.02em",
              lineHeight: 1.5,
              textAlign: "left",
            }}
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close QR code"
            style={{
              fontFamily: "inherit",
              flexShrink: 0,
              width: 34,
              height: 34,
              borderRadius: 999,
              background: "#f1f3f8",
              border: "none",
              color: FAINT,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ width: 16, height: 16 }}
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div
          style={{
            padding: mobile ? "26px 20px 30px" : "28px 28px 34px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 18,
          }}
        >
          <div
            role="img"
            aria-label={qrAriaLabel}
            style={{ padding: 10, background: "#fff", lineHeight: 0 }}
          >
            <QRCodeSVG
              value={value}
              size={mobile ? 220 : 256}
              fgColor={INK}
            />
          </div>
          <p
            style={{
              margin: 0,
              color: SUB,
              fontSize: fluidSize(15),
              lineHeight: browseLeading("body"),
              textAlign: "center",
            }}
          >
            {hint}
          </p>
          {children}
        </div>
      </div>
    </div>
  );
}
