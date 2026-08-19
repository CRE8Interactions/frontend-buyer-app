"use client";

import { useState } from "react";
import Link from "next/link";
import { WALLET_SECTIONS } from "@/lib/walletSections";

export type WalletMenuUser = { email: string; name: string };

/**
 * Shared "My wallet" dropdown used by both the marketing nav and the app shell.
 */
export default function WalletMenu({
  user,
  onLogout,
}: {
  user: WalletMenuUser;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative shrink-0">
      <button type="button" onClick={() => setOpen((v) => !v)} className="btn btn-outline btn-sm">
        My wallet
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-[calc(100%+12px)] z-50 w-[240px] rounded-2xl border border-white/15 bg-[#0a2747] p-5 shadow-2xl shadow-black/50">
            <div className="truncate text-[13px] font-bold uppercase tracking-[0.06em] text-white">{user.name}</div>
            <ul className="mt-4 space-y-1">
              {WALLET_SECTIONS.map((it) => (
                <li key={it.href}>
                  <Link
                    href={it.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-2 py-2 text-[14px] font-medium text-[#BCBFCC] transition-colors hover:bg-white/[0.08] hover:text-white"
                  >
                    <span className="text-[#9DA2B3]">{it.icon}</span>
                    {it.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-3 border-t border-white/10 pt-3">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onLogout();
                }}
                className="px-2 py-1 text-[14px] text-[#9DA2B3] transition-colors hover:text-white"
              >
                Log out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
