"use client";

import type { ComponentProps, MouseEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { setLastKnown } from "@/lib/auth";

type Props = Omit<ComponentProps<typeof Link>, "href">;

/** Login link that returns the shopper to the page where they clicked it. */
export default function LoginLink({ onClick, ...props }: Props) {
  const pathname = usePathname() || "/browse/";
  const href = `/login/?from=${encodeURIComponent(pathname)}`;

  const rememberReturnPath = (event: MouseEvent<HTMLAnchorElement>) => {
    const returnTo =
      typeof window === "undefined"
        ? pathname
        : `${window.location.pathname}${window.location.search}`;
    setLastKnown(returnTo);
    onClick?.(event);
  };

  return <Link {...props} href={href} onClick={rememberReturnPath} />;
}
