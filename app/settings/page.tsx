"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import WalletShell from "@/components/templates/WalletShell";
import { cardCls } from "@/components/molecules/Card";
import { ArrowRight } from "@/components/atoms/icons";

const LINKS: { href: string; title: string; desc: string; icon: ReactNode }[] = [
  {
    href: "/settings/personal-details/",
    title: "Personal details",
    desc: "Update your name and email shown on tickets and transfers.",
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <circle cx="12" cy="8" r="4" /><path d="M4 21c0-3.5 3.6-6 8-6s8 2.5 8 6" />
      </svg>
    ),
  },
  {
    href: "/settings/login-security/",
    title: "Login & security",
    desc: "Change the phone number used to secure your account.",
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <rect x="4" y="10" width="16" height="11" rx="2.5" /><path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </svg>
    ),
  },
  {
    href: "/settings/payment-information/",
    title: "Payment information",
    desc: "Link a bank account to receive payouts from ticket sales.",
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="m3 9 9-6 9 6M4 9v11h16V9M9 20v-6h6v6" />
      </svg>
    ),
  },
  {
    href: "/settings/withdraw-invoices/",
    title: "Withdraw & invoices",
    desc: "Check available funds and download past invoices.",
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M6 2h9l4 4v16l-3-1.5L13 22l-3-1.5L7 22l-3-1.5V4a2 2 0 0 1 2-2z" /><path d="M9 9h6M9 13h6" />
      </svg>
    ),
  },
];

export default function SettingsPage() {
  return (
    <WalletShell>
      <h2 className="text-[22px] font-semibold tracking-[-0.01em]">Settings</h2>
      <p className="mt-1 text-[14px] text-[#9DA2B3]">Manage your account, payouts, and invoices.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`${cardCls} group flex flex-col gap-4 p-6 transition-transform hover:-translate-y-0.5`}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#A6E773]/15 text-[#A6E773]">
              {link.icon}
            </span>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-[17px] font-semibold">{link.title}</h3>
                <p className="mt-1 text-[13.5px] leading-relaxed text-[#9DA2B3]">{link.desc}</p>
              </div>
              <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-[#6e7180] transition-transform group-hover:translate-x-0.5 group-hover:text-[#051b35]" />
            </div>
          </Link>
        ))}
      </div>
    </WalletShell>
  );
}
