import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

/**
 * EventTile: the 3:4 poster tile (status and date on the photo, category, title and place over a dark fade, ticket-stub bar with price and button).
 * Its look is `event-tile-styles.ts` (EVENT_TILE_CSS), embedded by the page's stylesheet. Pages pass content, never styles.
 * The parent <ul> should use the `br-tg` grid and set --px / --py from the pointer for the hover light.
 */
export type EventTileProps = {
  img?: string;
  /** shown when there is no picture */
  mono?: ReactNode;
  status: ReactNode;
  /** e.g. "Fri, Nov 20" */
  dateLabel: string;
  category: ReactNode;
  title: string;
  href: string;
  /** time and place, one line */
  meta: string;
  /** a <span className="br-pr"> with small + b, or an empty one */
  price: ReactNode;
  cta: ReactNode;
};

export default function EventTile({ img, mono, status, dateLabel, category, title, href, meta, price, cta }: EventTileProps) {
  return (
    <article className="br-et">
      <div className="br-et-img" data-blank={img ? "0" : "1"}>
        <span className="br-et-ph" style={img ? { backgroundImage: `url("${img}")` } : undefined} aria-hidden />
        {img ? null : <span className="br-et-mono" aria-hidden>{mono}</span>}
        <span className="br-et-s">{status}</span>
        <span className="br-et-dt"><Badge size="sm">{dateLabel}</Badge></span>
        <div className="br-et-t">
          {category}
          <h4><a className="br-et-a" href={href}>{title}</a></h4>
          <span className="br-et-v">{meta}</span>
        </div>
      </div>
      <div className="br-et-b">
        {price}
        <span className="br-et-cta">{cta}</span>
      </div>
    </article>
  );
}
