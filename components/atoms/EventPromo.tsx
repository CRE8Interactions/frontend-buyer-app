import type { CSSProperties } from "react";

import { BLOCKTICKETS_NAVY } from "@/lib/branding";

/**
 * Promotional line under an event name on storefront, venue, browse, and
 * search rows. Renders nothing when the event has no promo copy.
 */
export default function EventPromo({
  text,
  color = BLOCKTICKETS_NAVY,
  as: Tag = "p",
  style,
}: {
  text: string;
  color?: string;
  /** Use "span" inside phrasing-only parents such as a search row label. */
  as?: "p" | "span";
  style?: CSSProperties;
}) {
  if (!text) return null;
  return (
    <Tag
      className="bt-event-promo"
      style={{
        fontSize: 13,
        lineHeight: 1.4,
        color,
        ...style,
        fontWeight: 500,
      }}
    >
      {text}
    </Tag>
  );
}
