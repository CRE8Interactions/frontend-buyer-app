"use client";

import { type ReactNode } from "react";
import { usePathname } from "next/navigation";
import AppShell from "@/components/templates/AppShell";
import { displayName, useAuth } from "@/lib/auth";
import { WALLET_SECTIONS } from "@/lib/walletSections";

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
  const { user } = useAuth();
  const pathname = usePathname();
  const name = displayName(user);

  return (
    <AppShell requireAuth>
      <div className="flex items-center gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-[16px] font-bold text-primary-foreground ring-2 ring-white/15 ring-offset-2 ring-offset-[var(--paper)]">
          {user ? initials(name) : ""}
        </span>
        <div className="min-w-0">
          <h1 className="text-[24px] font-semibold leading-tight tracking-[-0.01em]">My wallet</h1>
          {user && (
            <p className="truncate text-[13px] text-ink2">
              {name}
              {user.email ? ` · ${user.email}` : ""}
            </p>
          )}
        </div>
      </div>

      <nav className="mt-7 flex gap-6 overflow-x-auto border-b border-white/10" aria-label="Wallet sections">
        {WALLET_SECTIONS.map((t) => {
          const on = pathname === t.href || pathname?.startsWith(`${t.href}/`);
          return (
            <a
              key={t.href}
              href={t.href}
              aria-current={on ? "page" : undefined}
              className={`-mb-px shrink-0 border-b-2 pb-3 text-[15px] font-semibold transition-colors ${
                on ? "border-primary text-white" : "border-transparent text-ink2 hover:text-white"
              }`}
            >
              {t.label}
            </a>
          );
        })}
      </nav>

      <div className="mt-8">{children}</div>
    </AppShell>
  );
}
