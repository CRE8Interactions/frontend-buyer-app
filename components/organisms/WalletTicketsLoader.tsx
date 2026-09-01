import type { CSSProperties } from "react";
import Spinner from "@/components/atoms/Spinner";
import { BLOCKTICKETS_NAVY } from "@/lib/branding";

const SUB = "#6e7180";

const SHIMMER: CSSProperties = {
  background: "linear-gradient(90deg,#eef0f6 0%,#f7f8fc 50%,#eef0f6 100%)",
  backgroundSize: "420px 100%",
  animation: "st-shimmer 1.4s linear infinite",
};

/** Placeholder rows while wallet lists (tickets, transfers, listings) load. */
export function WalletListSkeleton() {
  const label = "Loading tickets";
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={label}
      style={{ display: "flex", flexDirection: "column", gap: 10 }}
    >
      <style>{`@keyframes st-shimmer{0%{background-position:-420px 0}100%{background-position:420px 0}}`}</style>
      {[0, 1, 2].map((row) => (
        <div
          key={row}
          aria-hidden
          style={{
            background: "#fff",
            border: "1px solid rgba(5,27,53,0.08)",
            borderRadius: 20,
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              flexShrink: 0,
              ...SHIMMER,
            }}
          />
          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div style={{ height: 14, width: "62%", borderRadius: 8, ...SHIMMER }} />
            <div style={{ height: 12, width: "38%", borderRadius: 8, ...SHIMMER }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** In-page tickets spinner shown inside the wallet while orders are fetched. */
export default function WalletTicketsLoader({
  fullPage = false,
}: {
  /** Auth / route fallback: same card on the wallet page background. */
  fullPage?: boolean;
}) {
  const label = "Loading tickets";
  const card = (
    <div
      style={{
        background: "#fff",
        border: "1px solid rgba(5,27,53,0.08)",
        borderRadius: 20,
        boxShadow:
          "0 1px 2px rgba(5,27,53,0.05), 0 10px 24px -14px rgba(5,27,53,0.34)",
        padding: "56px 32px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        minHeight: 220,
      }}
      role="status"
      aria-busy="true"
      aria-label={label}
    >
      <Spinner size={48} variant="assemble" label={label} />
      <div style={{ fontSize: 15, fontWeight: 600, color: BLOCKTICKETS_NAVY }}>
        Loading your tickets…
      </div>
      <div style={{ fontSize: 13, color: SUB }}>Loading your wallet events.</div>
    </div>
  );

  if (!fullPage) return card;

  return (
    <div
      style={{
        minHeight: "100vh",
        boxSizing: "border-box",
        padding: "40px 32px 96px",
        background: "#eef1f8",
        backgroundImage:
          "radial-gradient(120% 80% at 50% -10%, #ffffff 0%, #f5f7fc 42%, #e9edf6 100%)",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>{card}</div>
    </div>
  );
}
