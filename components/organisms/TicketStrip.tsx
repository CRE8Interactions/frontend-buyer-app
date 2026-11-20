import type { ReactNode } from "react";

/**
 * TicketStrip: the one ticket row (date, picture, title and place, price stub with a button) used on Browse, team and venue pages.
 * Its look lives in `ticket-strip-styles.ts` (TICKET_STRIP_CSS), embedded by each page's stylesheet. Pages pass content, never styles.
 * `tone="team"` sets the accent to the team colour (`--t`); without it the strip uses the brand colours.
 * The parent list should set --px / --py on the row from the pointer (the pages' `glow` handler) for the hover light.
 */
export type TicketStripProps = {
  /** weekday, short ("Sat") */
  dow: string;
  /** day of month */
  d: string | number;
  /** a picture for the row; without it the monogram shows */
  img?: string;
  mono?: ReactNode;
  /** the sport or category and the status, above the title */
  chips: ReactNode;
  title: string;
  /** the whole row links here (not needed for a `static` row) */
  href?: string;
  /** time and place, one line */
  meta: string;
  /** e.g. "$18"; leave out for no price */
  price?: string;
  /** the button on the stub */
  cta: ReactNode;
  tone?: "team";
  /** the small word above the price; "From" when left out (the wallet uses "Seats") */
  priceLabel?: string;
  /** a row that selects instead of navigating (the wallet): the title link calls this and does not follow href */
  onSelect?: () => void;
  /** marks the chosen row (data-on) so a page can show it */
  selected?: boolean;
  /** a row that is only information (the wallet's listings): the title is plain text, nothing lifts or lights on hover, nothing looks pressable */
  static?: boolean;
};

export default function TicketStrip({ dow, d, img, mono, chips, title, href, meta, price, cta, tone, priceLabel = "From", onSelect, selected, static: still }: TicketStripProps) {
  return (
    <article className={tone === "team" ? "tk tk-team" : "tk"} data-on={selected ? "1" : undefined} data-static={still ? "" : undefined}>
      <span className="tk-d" aria-hidden><i>{dow}</i><b>{d}</b></span>
      <span className="tk-pic" data-blank={img ? "0" : "1"} aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {img ? <img src={img} alt="" loading="lazy" /> : mono}
      </span>
      <span className="tk-m">
        <span className="tk-c">{chips}</span>
        <strong>{still ? <span className="tk-a">{title}</span> : <a className="tk-a" href={href} aria-current={selected ? "true" : undefined} onClick={onSelect ? (e) => { e.preventDefault(); onSelect(); } : undefined}>{title}</a>}</strong>
        <span className="tk-v">{meta}</span>
      </span>
      <span className="tk-s">
        <span className="tk-pr">{price ? <><small>{priceLabel}</small><b>{price}</b></> : null}</span>
        <span className="tk-cta">{cta}</span>
      </span>
    </article>
  );
}
