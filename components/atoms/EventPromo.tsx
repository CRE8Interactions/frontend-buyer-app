import type { CSSProperties } from "react";

import { BLOCKTICKETS_NAVY } from "@/lib/branding";

/**
 * Promotional line under an event name on storefront, venue, browse, and
 * search rows. Renders nothing when the event has no promo copy.
 */
export default function EventPromo({
  text,
  lines = 3,
  color = BLOCKTICKETS_NAVY,
  as: Tag = "p",
  style,
}: {
  text: string;
  lines?: number;
  color?: string;
  /** Use "span" inside phrasing-only parents such as a search row label. */
  as?: "p" | "span";
  style?: CSSProperties;
}) {
  if (!text) return null;
  return (
    <Tag
      style={{
        margin: 0,
        fontSize: 13,
        fontWeight: 500,
        lineHeight: 1.4,
        color,
        display: "-webkit-box",
        WebkitLineClamp: lines,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
        ...style,
      }}
    >
      {text}
    </Tag>
  );
}
