const INK = "#051b35";

export default function SeasonTicketsBadge() {
  return (
    <span
      style={{
        fontSize: 12,
        fontWeight: 600,
        lineHeight: 1.5,
        color: INK,
        border: "1px solid rgba(5,27,53,0.16)",
        borderRadius: 8,
        padding: "5px 10px",
        whiteSpace: "nowrap",
      }}
    >
      Season tickets
    </span>
  );
}
