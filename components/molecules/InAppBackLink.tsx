"use client";

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { inAppBackAnchorProps } from "@/lib/inAppBack";

/** Circular / header Back that restores in-app history instead of a new Link load. */
export default function InAppBackLink({
  href,
  "aria-label": ariaLabel = "Back",
  className,
  style,
  children,
}: {
  href: string;
  "aria-label"?: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const router = useRouter();
  return (
    <Link
      className={className}
      style={style}
      aria-label={ariaLabel}
      {...inAppBackAnchorProps(href, router)}
    >
      {children}
    </Link>
  );
}
