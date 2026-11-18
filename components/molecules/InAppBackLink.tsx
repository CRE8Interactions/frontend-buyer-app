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
  toProfile = false,
  children,
}: {
  href: string;
  "aria-label"?: string;
  className?: string;
  style?: CSSProperties;
  /** Push My Profile instead of popping browser history, which can land on the wrong wallet tab. */
  toProfile?: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  return (
    <Link
      className={className}
      style={style}
      aria-label={ariaLabel}
      {...inAppBackAnchorProps(href, router, undefined, { toProfile })}
    >
      {children}
    </Link>
  );
}
