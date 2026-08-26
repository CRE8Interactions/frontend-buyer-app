"use client";

import { type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import AppShell from "@/components/templates/AppShell";
import WalletChrome from "@/components/organisms/WalletChrome";
import { displayName, useAuth } from "@/lib/auth";
import { WALLET_SECTIONS } from "@/lib/walletSections";
import { BLOCKTICKETS_NAVY } from "@/lib/branding";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export default function WalletShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const name = displayName(user);

  const items = WALLET_SECTIONS.map((t) => ({
    id: t.href,
    label: t.label,
    href: t.href,
    on: pathname === t.href || Boolean(pathname?.startsWith(`${t.href}/`)),
  }));

  return (
    <AppShell requireAuth hideHeader variant="wallet">
      <WalletChrome
        items={items}
        showNav
        trailing={
          <button
            type="button"
            onClick={() => {
              logout();
              router.push("/");
            }}
            style={{
              fontFamily: "inherit",
              fontSize: 14,
              fontWeight: 600,
              color: "#fff",
              background: "transparent",
              border: "none",
              padding: "8px 4px",
              marginLeft: 8,
              cursor: "pointer",
              whiteSpace: "nowrap",
              textDecoration: "underline",
              textUnderlineOffset: 3,
            }}
          >
            Log out
          </button>
        }
      />
      <div className="flex items-center gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#A6E773] text-[16px] font-bold text-[#051B35]">
          {user ? initials(name) : ""}
        </span>
        <div className="min-w-0">
          <h1 className="text-[24px] font-semibold leading-tight tracking-[-0.01em] text-[#051b35]">
            My wallet
          </h1>
          {user && (
            <p className="truncate text-[13px] text-[#6e7180]">
              {name}
              {user.email ? ` · ${user.email}` : ""}
            </p>
          )}
        </div>
      </div>

      <div className="mt-8" style={{ color: BLOCKTICKETS_NAVY }}>
        {children}
      </div>
    </AppShell>
  );
}
