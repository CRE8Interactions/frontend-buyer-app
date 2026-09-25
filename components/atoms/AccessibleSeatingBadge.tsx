import type { CSSProperties } from "react";

import { Accessibility } from "@/components/atoms/icons";
import { getAccessibleLabel } from "@/lib/ticketAccessibility";

const NAVY = "#051B35";

/**
 * One look for the accessible-seating callout wherever a ticket is described —
 * Your selection, Ticket details, and the map detail panel. Renders nothing
 * when the source is not accessible seating.
 */
export default function AccessibleSeatingBadge({
  source,
  style,
}: {
  /** Listing row, cart group, seat, or wallet ticket. */
  source: unknown;
  style?: CSSProperties;
}) {
  const label = getAccessibleLabel(source);
  if (!label) return null;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        width: "fit-content",
        maxWidth: "100%",
        background: "#f1f3f8",
        color: NAVY,
        fontSize: 14,
        fontWeight: 600,
        lineHeight: 1.35,
        padding: "7px 13px",
        borderRadius: 999,
        ...style,
      }}
    >
      <Accessibility width={15} height={15} aria-hidden style={{ flexShrink: 0 }} />
      {label}
    </span>
  );
}
