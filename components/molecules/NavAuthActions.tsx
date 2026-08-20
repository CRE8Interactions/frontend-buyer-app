"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";

const WALLET_HREF = "/my-tickets/";
const LOGIN_HREF = "/login/";

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
      <Link
        href={isAuthenticated ? WALLET_HREF : LOGIN_HREF}
        style={buttonStyle}
      >
        {isAuthenticated ? "My wallet" : loginLabel}
      </Link>
      {isAuthenticated ? (
        <button type="button" onClick={() => logout()} style={logoutStyle}>
          Log out
        </button>
      ) : null}
    </>
  );
}
