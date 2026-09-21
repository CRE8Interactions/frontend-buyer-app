"use client";

import { browseLeading } from "@/lib/browseType";
import { fluidSize } from "@/lib/shopperFluidType";


export default function OnSaleSoonCard({
  scheduledAt,
  accentColor = "#a6e773",
  desktop = false,
  fill = false,
  className = "",
  messageSize = fluidSize(16),
  dateSize,
  labelSize = fluidSize(12),
  gap,
  message = "Tickets aren't on sale yet. Check back soon.",
  emptyMessage = "Tickets aren't on sale yet. Check back soon.",
}: {
  scheduledAt?: string;
  accentColor?: string;
  desktop?: boolean;
  fill?: boolean;
  className?: string;
  /** Body copy size. Literal px — fluidSize(22) aliases to the 26px display step. */
  messageSize?: string;
  /** On-sale date. Seated keeps 26px desktop / 20px mobile. */
  dateSize?: number | string;
  /** "On sale soon" label. */
  labelSize?: number | string;
  /** Space between the label, date, and note. */
  gap?: number;
  /** Body under the on-sale time. */
  message?: string;
  /** Body when no on-sale time is available. */
  emptyMessage?: string;
}) {
  const centered = !desktop || fill;

  return (
    <div
      data-testid="ticketing-scheduled"
      className={className}
      style={{
        background: "#fff",
        border: "1px solid rgba(5,27,53,0.10)",
        borderRadius: desktop && fill ? 20 : 14,
        boxShadow: "0 1px 2px rgba(5,27,53,0.05)",
        padding: desktop && fill ? "32px" : desktop ? "18px 20px" : "16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: gap ?? (desktop ? 12 : 10),
        ...(centered
          ? { alignItems: "center", textAlign: "center" }
          : {}),
        ...(fill
          ? {
              flex: 1,
              minHeight: 0,
              width: "100%",
              boxSizing: "border-box",
              ...(centered ? { justifyContent: "center" } : {}),
            }
          : {}),
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          ...(centered ? { justifyContent: "center" } : {}),
        }}
      >
        <span
          aria-hidden
          style={{
            width: desktop ? 9 : 8,
            height: desktop ? 9 : 8,
            borderRadius: 999,
            background: accentColor,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: labelSize,
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#6e7180",
          }}
        >
          On sale soon
        </span>
      </div>
      {scheduledAt ? (
        <>
          <div
            style={{
            fontSize: dateSize ?? messageSize,
            fontWeight: 600,
            color: "#051b35",
            letterSpacing: "-0.02em",
            lineHeight: browseLeading("h3"),
            ...(!centered ? { paddingLeft: 16 } : {}),
          }}
        >
          {scheduledAt}
          </div>
          <p
            style={{
              margin: 0,
              fontSize: messageSize,
              fontWeight: 400,
              color: "#8a93a3",
              lineHeight: browseLeading("body"),
              ...(!centered ? { paddingLeft: 16 } : {}),
            }}
          >
            {message}
          </p>
        </>
      ) : (
        <div
          style={{
            fontSize: dateSize ?? messageSize,
            fontWeight: 600,
            color: "#051b35",
            letterSpacing: "-0.02em",
            lineHeight: browseLeading("h3"),
            ...(!centered ? { paddingLeft: 16 } : {}),
          }}
        >
          {emptyMessage}
        </div>
      )}
    </div>
  );
}
