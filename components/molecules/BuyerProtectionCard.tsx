import type { CSSProperties, ReactNode } from "react";

const NAVY = "#051b35";

const STACKED = [
  {
    title: "Mobile tickets",
    body: "Delivered to your account and scanned at the gate.",
  },
  {
    title: "Buyer protection",
    body: "Every listing is verified inventory, safe from bots and scalpers.",
  },
  {
    title: "Prices are all-in",
    body: "Taxes and fees included on every listing. No surprises at checkout.",
  },
] as const;

const INLINE = [
  {
    title: "Mobile tickets.",
    body: "Delivered to your account and scanned at the gate.",
    icon: (
      <>
        <rect x="5" y="2" width="14" height="20" rx="3" />
        <line x1="10" y1="18.5" x2="14" y2="18.5" />
      </>
    ),
  },
  {
    title: "Buyer protection.",
    body: "Every listing is verified inventory, safe from bots and scalpers.",
    icon: (
      <>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <polyline points="9 12 11 14 15 10" />
      </>
    ),
  },
  {
    title: "Prices are all-in.",
    body: "Taxes and fees included. No surprises at checkout.",
    icon: (
      <>
        <path d="M20.59 13.41 13.4 20.6a2 2 0 0 1-2.82 0L3 13V4a1 1 0 0 1 1-1h9l7.59 7.59a2 2 0 0 1 0 2.82Z" />
        <circle cx="7.5" cy="7.5" r="1.2" />
      </>
    ),
  },
] as const;

function RowIcon({ accent, children, size, marginTop }: { accent: string; children: ReactNode; size: number; marginTop: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke={accent}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      style={{ width: size, height: size, flexShrink: 0, marginTop }}
    >
      {children}
    </svg>
  );
}

/** Buyer-protection card. Pass `bg` for the gray inline card used in ticket-detail panels. */
export default function BuyerProtectionCard({
  accent,
  bg,
  pricesIncludeFees = true,
}: {
  accent: string;
  bg?: string;
  /** Package and flex-pack prices do not include fees; hide the all-in row. */
  pricesIncludeFees?: boolean;
}) {
  const surface: CSSProperties = bg
    ? {
        background: bg,
        border: "1px solid rgba(5,27,53,0.08)",
        boxShadow: "none",
        borderRadius: 14,
        padding: 18,
        gap: 14,
      }
    : {
        background: "#fff",
        border: "1px solid rgba(5,27,53,0.10)",
        boxShadow: "0 1px 2px rgba(5,27,53,0.05)",
        borderRadius: 20,
        padding: 24,
        gap: 20,
      };

  return (
    <div
      style={{
        ...surface,
        width: "100%",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {bg
        ? INLINE.filter((row) => pricesIncludeFees || !row.title.startsWith("Prices are all-in")).map((row) => (
            <div key={row.title} style={{ display: "flex", alignItems: "flex-start", gap: 12, minWidth: 0 }}>
              <RowIcon accent={accent} size={18} marginTop={1}>
                {row.icon}
              </RowIcon>
              <div style={{ flex: 1, minWidth: 0, fontSize: 14, lineHeight: 1.5, color: "#4a5567" }}>
                <span style={{ fontWeight: 600, color: NAVY }}>{row.title}</span> {row.body}
              </div>
            </div>
          ))
        : STACKED.filter((row) => pricesIncludeFees || row.title !== "Prices are all-in").map((row) => (
            <div key={row.title} style={{ display: "flex", gap: 14 }}>
              <RowIcon accent={accent} size={22} marginTop={2}>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <polyline points="9 12 11 14 15 10" />
              </RowIcon>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1.5 }}>
                  {row.title}
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.5, color: "#6e7180" }}>{row.body}</div>
              </div>
            </div>
          ))}
    </div>
  );
}
