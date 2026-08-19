"use client";

import type { MouseEventHandler } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { chipBtnCls } from "@/components/molecules/Card";
import { inAppBackAnchorProps } from "@/lib/inAppBack";

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
  const router = useRouter();
  return (
    <Link className={chipBtnCls} {...inAppBackAnchorProps(href, router, onClick)}>
      <span aria-hidden>←</span> {label}
    </Link>
  );
}
