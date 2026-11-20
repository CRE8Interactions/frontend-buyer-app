import type { MouseEventHandler } from "react";
import { chipBtnCls } from "@/components/molecules/Card";

/** BackChip — chip-style back link for app detail pages. */
export default function BackChip({
  href,
  label = "Back",
  onClick,
}: {
  href: string;
  label?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
}) {
  return (
    <a href={href} className={chipBtnCls} onClick={onClick}>
      <span aria-hidden>←</span> {label}
    </a>
  );
}
