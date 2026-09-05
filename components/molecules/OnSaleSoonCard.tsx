"use client";

import { fluidSize } from "@/lib/shopperFluidType";


export default function OnSaleSoonCard({
  scheduledAt,
  accentColor = "#a6e773",
  desktop = false,
  fill = false,
  className = "",
}: {
  scheduledAt?: string;
  accentColor?: string;
  desktop?: boolean;
  fill?: boolean;
  className?: string;
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
        gap: desktop ? 12 : 10,
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
            fontSize: fluidSize(desktop ? 16 : 12),
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
              fontSize: fluidSize(desktop ? 22 : 18),
              fontWeight: 600,
              color: "#051b35",
              letterSpacing: "-0.02em",
              lineHeight: 1.25,
              ...(!centered ? { paddingLeft: 16 } : {}),
            }}
          >
            {scheduledAt}
          </div>
          <p
            style={{
              margin: 0,
              fontSize: fluidSize(desktop ? 17 : 15),
              fontWeight: 400,
              color: "#8a93a3",
              lineHeight: 1.45,
              ...(!centered ? { paddingLeft: 16 } : {}),
            }}
          >
            This event does not have any tickets on sale yet. Check back in later.
          </p>
        </>
      ) : (
        <div
          style={{
            fontSize: fluidSize(desktop ? 22 : 18),
            fontWeight: 600,
            color: "#051b35",
            letterSpacing: "-0.02em",
            lineHeight: 1.25,
            ...(!centered ? { paddingLeft: 16 } : {}),
          }}
        >
          This event does not have tickets on sale yet. Check back in later.
        </div>
      )}
    </div>
  );
}
