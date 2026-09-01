import Spinner from "@/components/atoms/Spinner";
import { BLOCKTICKETS_NAVY } from "@/lib/branding";

const SUB = "#6e7180";

/** In-page tickets spinner shown inside the wallet while orders are fetched. */
export default function WalletTicketsLoader() {
  const label = "Loading tickets";
  return (
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
}
