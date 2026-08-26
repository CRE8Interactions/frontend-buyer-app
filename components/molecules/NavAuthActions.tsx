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
  logoutStyle,
}: {
  loginLabel?: string;
  buttonStyle: CSSProperties;
  logoutStyle: CSSProperties;
}) {
  const { isAuthenticated, logout } = useAuth();

  return (
    <>
      {isAuthenticated ? (
        <Link href={WALLET_HREF} style={buttonStyle}>
          My wallet
        </Link>
      ) : (
        <LoginLink style={buttonStyle}>{loginLabel}</LoginLink>
      )}
      {isAuthenticated ? (
        <button type="button" onClick={() => logout()} style={logoutStyle}>
          Log out
        </button>
      ) : null}
    </>
  );
}
