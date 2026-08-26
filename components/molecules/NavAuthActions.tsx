"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import LoginLink from "@/components/molecules/LoginLink";
import { useAuth } from "@/lib/auth";
import { walletSectionHref } from "@/lib/walletNav";

const WALLET_HREF = walletSectionHref("events");

export default function NavAuthActions({
  loginLabel = "Log in",
  buttonStyle,
}: {
  loginLabel?: string;
  buttonStyle: CSSProperties;
}) {
  const { isAuthenticated } = useAuth();

  return isAuthenticated ? (
    <Link href={WALLET_HREF} style={buttonStyle}>
      My wallet
    </Link>
  ) : (
    <LoginLink style={buttonStyle}>{loginLabel}</LoginLink>
  );
}
