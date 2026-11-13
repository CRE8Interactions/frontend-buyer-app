import { Resale } from "@/components/atoms/icons";

/** Peach pill used wherever a verified-resale ticket is shown. */
export default function VerifiedResaleBadge({ icon = 13 }: { icon?: number }) {
  return (
    <span
      data-testid="verified-resale-badge"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        width: "fit-content",
        maxWidth: "100%",
        background: "#fff1e8",
        color: "#f0641e",
        fontSize: 13,
        fontWeight: 600,
        padding: "4px 12px",
        borderRadius: 999,
        whiteSpace: "nowrap",
      }}
    >
      <Resale
        width={icon}
        height={icon}
        aria-hidden="true"
        style={{ flexShrink: 0 }}
      />
      Verified Resale
    </span>
  );
}
