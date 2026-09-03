import type { CSSProperties } from "react";

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
